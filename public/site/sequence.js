/**
 * Scroll-scrubbed project sequence for the landing page (prototype).
 *
 * One sticky stage holds five absolutely positioned panels, plus the
 * "Selected work" intro as its title card, scrubbed out as project 1 arrives.
 * A single passive scroll listener schedules a single requestAnimationFrame,
 * the same pattern as BackgroundParallax, and every frame recomputes
 * everything from scrollY alone. There is no tweened or accumulated state, so
 * scrolling back up reverses every step exactly.
 *
 * Progressive enhancement: the markup and CSS without the `seq-live` class
 * are the static stacked fallback. This file adds the class only when motion
 * is allowed (no reduced-motion preference, a fine pointer, a viewport at
 * least 780px wide) and switches modes live when any of those change.
 */
(function () {
  "use strict";

  /* -------------------------------------------------------------------------
     Tuning. Every window is a fraction of one project's own 0..1 segment.
  ------------------------------------------------------------------------- */

  var PANELS = 5;

  // The phase budget. Each piece starts 0.12 after the previous one, so they
  // arrive staggered rather than together; the viz deliberately starts before
  // the stats have settled.
  //
  // Round 4: the pieces used to land in the first two thirds of a segment that
  // was itself only 1.2 screens of scroll, which read as everything snapping
  // in at once. The segment is now 2.2 screens (see `.seq-live .sequence`) and
  // the pieces are spread over more of it, so one turn of the wheel moves one
  // piece rather than three.
  var WINDOWS = {
    kicker: [0, 0.22],
    title: [0.1, 0.34],
    hook: [0.22, 0.52],
    stats: [0.38, 0.62],
    viz: [0.52, 0.76],
    cta: [0.74, 0.88],
  };

  // The finale is the exception: it keeps growing for its whole segment, so
  // its pieces have to be complete well before the end or the card finishes
  // arriving long after it has stopped being interesting. Its windows are the
  // ones above, squeezed into the first part of the segment.
  var FINALE_WINDOW = 0.6;

  // Where each project's pieces start from (px), by entry direction. Vertical
  // entries travel less: there is less room before the panel edge clips them.
  var ENTRY_OFFSET = {
    right: [96, 0],
    left: [-96, 0],
    bottom: [0, 72],
    top: [0, -72],
    finale: [0, 24],
  };
  var CTA_RISE = 12;
  var ASSEMBLED = 0.9999; // eased progress treated as exactly home, see renderParts()
  var TOP_FADE_LAG = 0.55; // see partOpacity()

  var INTRO_END = 0.1; // the intro title card is gone by here, see introStyle()
  var INTRO_RISE = 32; // px it rises while it fades, at most (see placeIntro())
  var INTRO_GAP = 32; // min px between the intro and project 1's content, see placeIntro()
  var INTRO_MIN_TOP = 16;
  var INTRO_TOP_CLEAR = 8; // px the rising intro always keeps below the viewport top

  var EXIT_END = 0.25; // simple exits finish moving in the first quarter of the incoming segment
  var EXIT_FADE_END = 0.12; // ...and are already invisible from here, see exitStyle()
  var PUSH_END = 0.3; // the 3->4 push-back is complete (and project 3 invisible) here
  var SPLIT_END = 0.5; // the 4->5 halves are fully off-screen here
  var FINALE_FADE_END = 0.22; // see finaleStyle()
  var FINALE_FADE_POWER = 5; // ...and how late in that window it becomes visible
  var FINALE_GROW_END = 0.5; // the finale card reaches full screen here...
  var FINALE_SCALE_FULL = 1.0;
  var FINALE_SCALE_END = 1.12; // ...and keeps drifting this far while you keep scrolling
  var SEAM_START = 0.8; // see seamFade()

  // Every inline property the scrubber ever writes, so static mode and the
  // clones can take all of it back.
  var SCRUB_PROPS = ["opacity", "transform", "filter", "display", "will-change", "--seam"];

  var root = document.documentElement;
  var queries = [
    window.matchMedia("(prefers-reduced-motion: reduce)"),
    window.matchMedia("(pointer: coarse)"),
    window.matchMedia("(min-width: 780px)"),
  ];

  function motionAllowed() {
    return !queries[0].matches && !queries[1].matches && queries[2].matches;
  }

  // This file loads in <head>. Deciding the mode here, before the body is
  // parsed, means the first paint already has the right layout.
  root.classList.add(motionAllowed() ? "seq-live" : "seq-static");

  /* -------------------------------------------------------------------------
     Pure scroll and phase math. No DOM in here, so it ports as is.
  ------------------------------------------------------------------------- */

  function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  function easeOutCubic(t) {
    var u = 1 - t;
    return 1 - u * u * u;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Written as a*(1-t) + b*t rather than a + (b-a)*t: at t = 1 it returns b
  // exactly, so a held state matches its CSS twin to the last digit.
  function lerp(a, b, t) {
    return a * (1 - t) + b * t;
  }

  function progressIn(local, start, end) {
    return clamp01((local - start) / (end - start));
  }

  // Four decimals is finer than any visible step and keeps the strings stable,
  // so a value that did not change is never written again.
  function fmt(x) {
    var r = Math.round(x * 10000) / 10000;
    return String(r === 0 ? 0 : r);
  }

  // The whole sequence as one 0..1 progress, cut into five equal segments.
  // `scrolled` is scrollY minus the sequence's top.
  function sequenceState(scrolled, seqHeight, vh) {
    var raw = scrolled / Math.max(1, seqHeight - vh);
    var g = clamp01(raw);
    var posFloat = g * PANELS;
    var active = Math.min(PANELS - 1, Math.floor(posFloat));
    return { raw: raw, g: g, posFloat: posFloat, active: active, local: posFloat - active };
  }

  // Each panel's own progress. Outgoing panels read 1 and upcoming ones 0, so
  // a panel's pieces stay assembled while it leaves.
  function ownLocal(posFloat, i) {
    return clamp01(posFloat - i);
  }

  // n hook lines share the hook window. Each line lasts twice the step between
  // starts, so neighbours overlap by half, the first starts at 0.18 and the
  // last ends exactly at 0.36.
  function hookWindows(n) {
    var from = WINDOWS.hook[0];
    var span = WINDOWS.hook[1] - from;
    var step = span / (n + 1);
    var out = [];
    for (var k = 0; k < n; k++) out.push([from + k * step, from + (k + 2) * step]);
    return out;
  }

  // A part's opacity at raw window progress p. Parts that drop in from the
  // top (project 4) arrive in stagger order, so every later piece starts above
  // pieces that have already landed and passes over them on the way down.
  // Their opacity lags the movement: a piece stays (nearly) invisible while it
  // crosses its neighbours and fades in over the rest of its window, reaching
  // exactly 1 at the end, so the assembled state is unchanged.
  function partOpacity(p, lag) {
    if (!lag) return easeOutCubic(p);
    return easeOutCubic(clamp01((p - lag) / (1 - lag)));
  }

  // Which layers are painted. Only the two or three that matter for the
  // current position are ever mounted.
  function mountPlan(active, locals) {
    var panels = [false, false, false, false, false];
    panels[active] = true;
    // 1->2 and 2->3: the outgoing panel lingers while it slides out.
    if ((active === 1 || active === 2) && locals[active] < EXIT_END) panels[active - 1] = true;
    // 3->4: project 3 recedes and fades out behind project 4, then leaves.
    // It used to stay dimly visible for the whole of project 4's segment, and
    // its chat bubbles showed through project 4's picture.
    if (active === 3 && locals[3] < PUSH_END) panels[2] = true;
    return {
      panels: panels,
      // 4->5: project 4 (and the ghost of 3) is replaced by the two halves.
      halves: active === 4 && locals[4] < SPLIT_END,
      // The intro title card, until project 1 takes the stage.
      intro: active === 0 && locals[0] < INTRO_END,
    };
  }

  function mountedIndexes(plan) {
    var out = [];
    for (var i = 0; i < PANELS; i++) if (plan.panels[i]) out.push(i);
    return out;
  }

  // The intro hands the stage over to project 1. It is fully there while the
  // stage scrolls in and at the pin (local 0), and gone by INTRO_END; it rises
  // `rise` px out of the way (eased out) and fades on a slower, ease-in curve,
  // so it is still readable while project 1's kicker fades in below it and
  // the stage never goes blank between the two. The two never share pixels:
  // placeIntro() keeps INTRO_GAP between them.
  function introStyle(local, rise) {
    if (local <= 0) return null;
    var f = clamp01(local / INTRO_END);
    var t = easeOutCubic(f);
    return {
      transform: "translate(0px, " + fmt(-rise * t) + "px)",
      opacity: fmt(1 - f * f),
      filter: "",
    };
  }

  // null means "resting": no inline style at all, the CSS default.
  // `move` and `fade` are the eased progress of the exit's two clocks: the
  // mirrored layouts put the incoming text right where the outgoing viz is,
  // so the outgoing panel is gone (fade) well before it has finished sliding
  // away (move), and the incoming kicker and title never land on it.
  function exitStyle(move, fade) {
    if (move <= 0 && fade <= 0) return null;
    return {
      transform: "translate(" + fmt(-48 * move) + "px, 0px) scale(" + fmt(lerp(1, 0.94, move)) + ")",
      opacity: fmt(1 - fade),
      filter: "",
    };
  }

  // Project 3 as project 4 arrives: it recedes and goes, rather than sitting
  // behind project 4 for the rest of the segment. No `filter` here either: a
  // grayscale filter on a full-screen layer is a full-screen repaint on every
  // frame of the push-back, and it bought nothing once the layer was leaving.
  function pushBackStyle(t) {
    if (t <= 0) return null;
    return {
      transform: "scale(" + fmt(lerp(1, 0.88, t)) + ")",
      filter: "",
      opacity: fmt(1 - t),
    };
  }

  // The finale grows for its whole segment, uneased: 0.35 -> 1.25. It also
  // fades in over the first quarter, because the split halves above it are
  // translucent. At local 0 it must add nothing, or the swap from project 4 to
  // the halves would show a card appearing behind them; and the fade is a
  // steep ease-in (f^6: under 0.05 at local 0.15, about 0.26 at 0.2), so the
  // card is not read through the halves before the gap between them has
  // opened.
  // Round 4: the growth used to be linear across the whole segment, so the
  // card was still creeping towards full screen long after everything on it
  // had been read. It now reaches the full frame in the first half, eased, and
  // then keeps drifting gently for as long as you keep scrolling, which is
  // what the growth was for.
  function finaleScale(local) {
    if (local >= FINALE_GROW_END) {
      return lerp(FINALE_SCALE_FULL, FINALE_SCALE_END, (local - FINALE_GROW_END) / (1 - FINALE_GROW_END));
    }
    return lerp(0.35, FINALE_SCALE_FULL, easeOutCubic(local / FINALE_GROW_END));
  }

  function finaleStyle(local) {
    var f = clamp01(local / FINALE_FADE_END);
    return {
      transform: "scale(" + fmt(finaleScale(local)) + ")",
      opacity: f >= 1 ? "" : fmt(Math.pow(f, FINALE_FADE_POWER)),
      filter: "",
    };
  }

  // How far the finale card's lower surface has faded to the page ground
  // (0..1, the --seam property, see .panel--finale::before). It starts late in
  // the segment, when the card's edges are already past the viewport, and is
  // complete at the end, so the stage unpins with no hard edge at its bottom.
  function seamFade(local) {
    return easeInOutCubic(clamp01((local - SEAM_START) / (1 - SEAM_START)));
  }

  function wholeStyle(i, active, locals) {
    if (i === active - 1 && (active === 1 || active === 2)) {
      var l = locals[active];
      return exitStyle(easeOutCubic(clamp01(l / EXIT_END)), easeOutCubic(clamp01(l / EXIT_FADE_END)));
    }
    if (i === 2 && active === 3) return pushBackStyle(easeOutCubic(clamp01(locals[3] / PUSH_END)));
    if (i === 4) return finaleStyle(locals[4]);
    return null;
  }

  /* -------------------------------------------------------------------------
     State
  ------------------------------------------------------------------------- */

  var isLive = false;
  var ticking = false;
  var rafId = 0;
  var resizeTimer = 0;

  var seq = null;
  var stage = null;
  var intro = null;
  var panels = [];
  var halves = [];
  var parts = [];
  var hooks = []; // [{ el, text }], the original hook strings
  var seam = { left: 0, right: 0 };
  var introRise = INTRO_RISE; // see placeIntro()
  var introFits = true; // false on a window too short to hold the title card
  var prevMounted = [false, false, false, false, false];
  var prevHalves = false;
  var written = new Set();
  var hud = null;
  var lastInput = "keyboard"; // see keyboardFocus()

  /* -------------------------------------------------------------------------
     Writes. Values are cached per element, so a frame only touches what
     actually changed, and everything written is remembered so static mode can
     take it all back.
  ------------------------------------------------------------------------- */

  function put(el, prop, value) {
    var cache = el.__seq || (el.__seq = {});
    if (cache[prop] === value) return;
    cache[prop] = value;
    if (value === "") el.style.removeProperty(prop);
    else el.style.setProperty(prop, value);
    written.add(el);
  }

  function clearWritten() {
    written.forEach(function (el) {
      SCRUB_PROPS.forEach(function (p) {
        el.style.removeProperty(p);
      });
      el.__seq = null;
      if (el.getAttribute("style") === "") el.removeAttribute("style");
    });
    written.clear();
  }

  /* -------------------------------------------------------------------------
     Per-frame render
  ------------------------------------------------------------------------- */

  function readState() {
    // The one layout read per frame.
    var r = seq.getBoundingClientRect();
    return sequenceState(-r.top, r.height, window.innerHeight);
  }

  function renderParts(i, local) {
    var list = parts[i];
    for (var k = 0; k < list.length; k++) {
      var part = list[k];
      var p = progressIn(local, part.start, part.end);
      var e = easeOutCubic(p);
      if (e >= ASSEMBLED) {
        // Fully assembled is the CSS default, with no inline style left over.
        // The last sliver of the ease (under 0.01px, 0.0001 opacity) snaps to
        // it, so a position a rounded pixel short of a window's end is clean.
        // (A lagged opacity is always ahead of e by then, so it snaps too.)
        put(part.el, "opacity", "");
        put(part.el, "transform", "");
        continue;
      }
      var rest = 1 - e;
      put(part.el, "opacity", fmt(partOpacity(p, part.lag)));
      put(part.el, "transform", "translate(" + fmt(part.dx * rest) + "px, " + fmt(part.dy * rest) + "px)");
    }
  }

  function applyWhole(el, style) {
    put(el, "transform", style ? style.transform : "");
    put(el, "opacity", style ? style.opacity : "");
    put(el, "filter", style ? style.filter : "");
  }

  // A layer that leaves the stage goes back to its CSS defaults (no inline
  // scrub styles, only display:none), so the hidden DOM never depends on the
  // scroll history. It is fully re-rendered in the frame it comes back.
  function resetPanel(i) {
    applyWhole(panels[i], null);
    parts[i].forEach(function (part) {
      put(part.el, "opacity", "");
      put(part.el, "transform", "");
    });
    if (i === 4) put(panels[4], "--seam", "");
  }

  function render() {
    ticking = false;
    rafId = 0;
    if (!isLive) return;

    var st = readState();
    var locals = [];
    var i;
    for (i = 0; i < PANELS; i++) locals.push(ownLocal(st.posFloat, i));
    var plan = mountPlan(st.active, locals);
    var shown = [];

    for (i = 0; i < PANELS; i++) {
      if (plan.panels[i] && !prevMounted[i]) shown.push(panels[i]);
      if (!plan.panels[i] && prevMounted[i]) resetPanel(i);
      put(panels[i], "display", plan.panels[i] ? "" : "none");
    }
    if (plan.halves && !prevHalves) shown.push(halves[0], halves[1]);
    halves.forEach(function (half) {
      if (!plan.halves) {
        put(half, "transform", "");
        put(half, "will-change", "");
      }
      put(half, "display", plan.halves ? "block" : "");
    });
    if (intro) {
      // Hidden or at rest, the intro carries no inline style but display.
      var showIntro = plan.intro && introFits;
      applyWhole(intro, showIntro ? introStyle(locals[0], introRise) : null);
      put(intro, "display", showIntro ? "" : "none");
    }
    prevMounted = plan.panels;
    prevHalves = plan.halves;

    for (i = 0; i < PANELS; i++) {
      if (!plan.panels[i]) continue;
      renderParts(i, locals[i]);
      applyWhole(panels[i], wholeStyle(i, st.active, locals));
    }

    if (plan.panels[4]) {
      var fade = fmt(seamFade(locals[4]));
      put(panels[4], "--seam", fade === "0" ? "" : fade);
    }

    if (plan.halves) {
      // Promoted to their own layers only while they move. At rest (the swap
      // itself) they paint in the stage like project 4 did, pixel for pixel.
      var apart = easeInOutCubic(clamp01(locals[4] / SPLIT_END));
      var moving = fmt(apart) !== "0";
      put(halves[0], "transform", moving ? "translate(" + fmt(-seam.left * apart) + "px, 0px)" : "");
      put(halves[1], "transform", moving ? "translate(" + fmt(seam.right * apart) + "px, 0px)" : "");
      put(halves[0], "will-change", moving ? "transform" : "");
      put(halves[1], "will-change", moving ? "transform" : "");
    }

    shown.forEach(lockPhase);
    updateHud(st, plan);
  }

  function requestRender() {
    if (ticking) return;
    ticking = true;
    rafId = window.requestAnimationFrame(render);
  }

  // Every idle loop in a layer that just appeared is pinned to the document
  // timeline's origin. CSS animations restart whenever an element leaves
  // display:none, so without this the split halves (fresh clones) and the real
  // project 4 would run their loops out of phase and the swap would jump.
  function lockPhase(el) {
    if (!el.getAnimations) return;
    el.getAnimations({ subtree: true }).forEach(function (a) {
      a.startTime = 0;
    });
  }

  /* -------------------------------------------------------------------------
     Layout-dependent setup: hook lines, part lists, split halves, the seam,
     the intro's place. Runs on entering live mode, after fonts load and after
     a resize settles.
  ------------------------------------------------------------------------- */

  // Measures a layer (a panel or the intro) even while it is unmounted.
  function withLayout(panel, fn) {
    var hidden = panel.style.display === "none";
    if (hidden) {
      panel.style.display = "";
      panel.style.visibility = "hidden";
    }
    fn();
    if (hidden) {
      panel.style.display = "none";
      panel.style.removeProperty("visibility");
    }
  }

  // Wraps each rendered line of the hook in a block span so the lines can be
  // staggered. Words are laid out first and grouped by offsetTop; spaces stay
  // text nodes, so the concatenated text is the original string exactly.
  function splitHook(hook) {
    var el = hook.el;
    var text = hook.text;
    el.textContent = "";
    text.split(/(\s+)/).forEach(function (tok) {
      if (!tok) return;
      if (/^\s+$/.test(tok)) {
        el.appendChild(document.createTextNode(tok));
      } else {
        var word = document.createElement("span");
        word.textContent = tok;
        el.appendChild(word);
      }
    });

    var lines = [];
    var cur = null;
    var curTop = 0;
    var lead = "";
    Array.prototype.forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3) {
        if (cur) cur.text += n.data;
        else lead += n.data;
        return;
      }
      var top = n.offsetTop;
      if (!cur || Math.abs(top - curTop) > 2) {
        cur = { text: lead };
        lead = "";
        lines.push(cur);
        curTop = top;
      }
      cur.text += n.textContent;
    });

    el.textContent = "";
    lines.forEach(function (line) {
      var span = document.createElement("span");
      span.className = "hook-line";
      span.textContent = line.text;
      el.appendChild(span);
    });
    // Never lose a word: if anything went wrong, fall back to one line.
    if (el.textContent !== text) {
      el.textContent = "";
      var whole = document.createElement("span");
      whole.className = "hook-line";
      whole.textContent = text;
      el.appendChild(whole);
    }
  }

  function restoreHooks() {
    hooks.forEach(function (h) {
      h.el.textContent = h.text;
    });
  }

  function buildParts(i) {
    var panel = panels[i];
    var enter = panel.getAttribute("data-enter");
    var off = ENTRY_OFFSET[enter] || [0, 0];
    var lag = enter === "top" ? TOP_FADE_LAG : 0;
    // The finale's pieces run on a squeezed clock; see FINALE_WINDOW.
    var squeeze = enter === "finale" ? FINALE_WINDOW : 1;
    var list = [];
    function q(name) {
      return panel.querySelector('[data-part="' + name + '"]');
    }
    function add(el, win, dx, dy) {
      if (el) list.push({ el: el, start: win[0] * squeeze, end: win[1] * squeeze, dx: dx, dy: dy, lag: lag });
    }
    add(q("kicker"), WINDOWS.kicker, off[0], off[1]);
    add(q("title"), WINDOWS.title, off[0], off[1]);
    var hook = q("hook");
    var lines = hook ? hook.querySelectorAll(".hook-line") : [];
    if (lines.length) {
      var wins = hookWindows(lines.length);
      for (var k = 0; k < lines.length; k++) add(lines[k], wins[k], off[0], off[1]);
    } else {
      add(hook, WINDOWS.hook, off[0], off[1]);
    }
    add(q("stats"), WINDOWS.stats, off[0], off[1]);
    add(q("viz"), WINDOWS.viz, off[0], off[1]);
    add(q("cta"), WINDOWS.cta, 0, CTA_RISE);
    parts[i] = list;
  }

  // A clone that looks exactly like its source at rest: no scrub styles, no
  // ids, no hooks for the scrubber, and invisible to assistive tech and focus.
  function cleanClone(src) {
    var clone = src.cloneNode(true);
    var all = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll("*")));
    all.forEach(function (el) {
      el.removeAttribute("id");
      el.removeAttribute("aria-labelledby");
      el.removeAttribute("data-part");
      if (!el.style) return;
      SCRUB_PROPS.forEach(function (p) {
        el.style.removeProperty(p);
      });
      el.style.removeProperty("visibility");
      if (el.getAttribute("style") === "") el.removeAttribute("style");
    });
    clone.removeAttribute("data-index");
    clone.classList.add("panel--clone");
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("inert", "");
    return clone;
  }

  // Each half is project 4 as it stands at the end of its segment, clipped to
  // one side. (It used to carry a dimmed clone of project 3 underneath as
  // well; project 3 now fades out early in segment 4, so there is nothing
  // behind project 4 to reproduce.)
  function buildHalves() {
    halves.forEach(function (half) {
      half.textContent = "";
      half.appendChild(cleanClone(panels[3]));
    });
    if (prevHalves) halves.forEach(lockPhase);
  }

  // The seam on a whole pixel, so the two clip-paths meet with no hairline.
  function measureSeam() {
    var w = stage.clientWidth;
    seam.left = Math.round(w / 2);
    seam.right = w - seam.left;
    stage.style.setProperty("--split-at", seam.left + "px");
    stage.style.setProperty("--split-rest", seam.right + "px");
  }

  // The intro's resting place (--intro-y): centred in the band above project
  // 1's content block, but never closer to that block than INTRO_GAP, so it
  // shares no pixels with the kicker arriving below it. On a short viewport
  // (a laptop window around 650px tall) the band cannot hold the paragraph,
  // so the intro drops to its label alone. offsetTop ignores the scrub
  // transforms, so this is the resting layout wherever the page is. Its rise
  // is capped by the room above it, so the label never crosses the top edge.
  // The fixed page bar is over the stage, so the title card has to start
  // below it (the bar is on screen for the whole page, pinned stage included).
  function topClear() {
    var bar = document.querySelector(".topbar");
    var h = bar ? bar.offsetHeight : 0;
    return Math.max(INTRO_MIN_TOP, h + 8);
  }

  function placeIntro() {
    if (!intro) return;
    var minTop = topClear();
    var inner = panels[0].querySelector(".panel__inner");
    var band = 0;
    var height = 0;
    withLayout(panels[0], function () {
      band = inner.offsetTop;
    });
    function measure() {
      withLayout(intro, function () {
        height = intro.offsetHeight;
      });
    }
    // Two steps down, not one: first the tighter type (and no scroll cue),
    // and only on a very short window the label by itself. Dropping straight
    // to the label left the pinned stage nearly blank on a 720px-tall laptop,
    // which is the thing the title card exists to prevent.
    function fits() {
      return band - INTRO_GAP - height >= minTop;
    }
    intro.classList.remove("work__intro--compact", "work__intro--label-only");
    measure();
    if (!fits()) {
      intro.classList.add("work__intro--compact");
      measure();
    }
    if (!fits()) {
      intro.classList.add("work__intro--label-only");
      measure();
    }
    // A very short window (a 600px-tall browser, say) has no room for the bar,
    // the title card and a clear gap above project 1. The card is the thing
    // that gives way: an overlapping label is worse than none.
    introFits = fits();
    if (!introFits) {
      put(intro, "display", "none");
      return;
    }
    var y = Math.max(minTop, Math.min(Math.round((band - height) / 2), band - INTRO_GAP - height));
    stage.style.setProperty("--intro-y", y + "px");
    // The rise is capped by the room above it, so the label never slides
    // under the bar (or off the top of the window when there is no bar).
    introRise = Math.max(0, Math.min(INTRO_RISE, y - Math.max(INTRO_TOP_CLEAR, topClear() - INTRO_GAP)));
  }

  function relayout() {
    hooks.forEach(function (h) {
      withLayout(h.panel, function () {
        splitHook(h);
      });
    });
    written.forEach(function (el) {
      if (!el.isConnected) written.delete(el);
    });
    for (var i = 0; i < PANELS; i++) buildParts(i);
    buildHalves();
    measureSeam();
    placeIntro();
  }

  /* -------------------------------------------------------------------------
     Modes
  ------------------------------------------------------------------------- */

  function onScroll() {
    requestRender();
  }

  function onResize() {
    measureSeam();
    requestRender();
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (!isLive) return;
      relayout();
      render();
    }, 150);
  }

  function enterLive() {
    isLive = true;
    root.classList.remove("seq-static");
    root.classList.add("seq-live");
    // Live, the intro is a stage layer that is display:none for most of the
    // sequence; assistive tech reads its always-rendered copy (.work__a11y).
    if (intro) intro.setAttribute("aria-hidden", "true");
    relayout();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    render();
    announce();
  }

  function enterStatic() {
    isLive = false;
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
    ticking = false;
    window.clearTimeout(resizeTimer);
    clearWritten();
    halves.forEach(function (half) {
      half.textContent = "";
    });
    restoreHooks();
    stage.style.removeProperty("--split-at");
    stage.style.removeProperty("--split-rest");
    stage.style.removeProperty("--intro-y");
    if (stage.getAttribute("style") === "") stage.removeAttribute("style");
    if (intro) {
      intro.classList.remove("work__intro--compact", "work__intro--label-only");
      intro.removeAttribute("aria-hidden");
    }
    introRise = INTRO_RISE;
    introFits = true;
    prevMounted = [false, false, false, false, false];
    prevHalves = false;
    root.classList.remove("seq-live");
    root.classList.add("seq-static");
    updateHud(null, null);
    announce();
  }

  function syncMode() {
    var live = motionAllowed();
    if (live === isLive) return;
    if (live) enterLive();
    else enterStatic();
  }

  // carousel.js listens, to drop any tilt it left behind.
  function announce() {
    document.dispatchEvent(new CustomEvent("seq:mode", { detail: { mode: isLive ? "live" : "static" } }));
  }

  /* -------------------------------------------------------------------------
     Keyboard. Unmounted panels are display:none and so not focusable; these
     keep all five reachable and make sure a focused panel is fully assembled.
  ------------------------------------------------------------------------- */

  function panelOf(el) {
    return el && el.closest ? el.closest(".sequence__stage > .panel") : null;
  }

  function focusables(panel) {
    return panel.querySelectorAll("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])");
  }

  // The ownLocal at which panel i is finished: its last piece (the call to
  // action) has landed. The finale runs on a squeezed clock, and project 4's
  // pieces fade late, so this cannot be one number for every panel.
  function assembledLocal(i) {
    var end = WINDOWS.cta[1] * (i === PANELS - 1 ? FINALE_WINDOW : 1);
    return Math.min(0.98, end + 0.04);
  }

  // Parks panel i past that point, so a focused panel is fully built.
  function jumpTo(i) {
    window.scrollTo(0, scrollYFor(i, assembledLocal(i)));
    render();
  }

  // Focus that came from the keyboard (or from script), not from a click. The
  // jump below is for keyboard users; a mouse click on a CTA that is still
  // fading in must not move the page under the pointer.
  function keyboardFocus(el) {
    try {
      if (el.matches(":focus-visible")) return true;
    } catch (err) {
      // No :focus-visible support: fall back to the last input alone.
    }
    return lastInput !== "pointer";
  }

  function onFocusIn(e) {
    if (!isLive || !keyboardFocus(e.target)) return;
    var panel = panelOf(e.target);
    if (!panel) return;
    var i = panels.indexOf(panel);
    var st = readState();
    if (st.active === i && ownLocal(st.posFloat, i) >= assembledLocal(i)) return;
    jumpTo(i);
  }

  function onKeyDown(e) {
    if (!isLive || e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return;
    var panel = panelOf(document.activeElement);
    if (!panel) return;
    var list = focusables(panel);
    var edge = e.shiftKey ? list[0] : list[list.length - 1];
    if (document.activeElement !== edge) return;
    var j = panels.indexOf(panel) + (e.shiftKey ? -1 : 1);
    if (j < 0 || j >= PANELS) return; // leave the sequence the normal way
    e.preventDefault();
    jumpTo(j);
    var next = focusables(panels[j]);
    var target = e.shiftKey ? next[next.length - 1] : next[0];
    if (target) target.focus({ preventScroll: true });
  }

  /* -------------------------------------------------------------------------
     Test hook and debug HUD
  ------------------------------------------------------------------------- */

  // The scrollY that puts panel `index` at ownLocal `local`. Browsers keep
  // whole-pixel scroll positions, so it is rounded, and at a segment boundary
  // rounded toward the requested panel: local 0 lands on the panel being
  // active (a hair past its start) rather than on the tail of the previous
  // one, local 1 on exactly 1, and the very top of the sequence on exactly 0.
  function scrollYFor(index, local) {
    var r = seq.getBoundingClientRect();
    var top = r.top + window.pageYOffset;
    var span = Math.max(1, r.height - window.innerHeight);
    var l = clamp01(local);
    var y = top + ((index + l) / PANELS) * span;
    if (l <= 0) return index === 0 ? Math.floor(y) : Math.ceil(y);
    if (l >= 1) return Math.ceil(y);
    return Math.round(y);
  }

  function snapshot() {
    var st = readState();
    var locals = [];
    for (var i = 0; i < PANELS; i++) locals.push(ownLocal(st.posFloat, i));
    var plan = mountPlan(st.active, locals);
    return {
      g: st.g,
      posFloat: st.posFloat,
      active: st.active,
      local: st.local,
      mounted: isLive ? mountedIndexes(plan) : [0, 1, 2, 3, 4],
      halves: isLive && plan.halves,
      intro: !isLive || plan.intro,
    };
  }

  function updateHud(st, plan) {
    if (!hud) return;
    if (!isLive || !st) {
      hud.textContent = "mode   static";
      return;
    }
    hud.textContent =
      "mode   live\n" +
      "g      " + st.g.toFixed(3) + "\n" +
      "active " + st.active + "  (P" + (st.active + 1) + ")\n" +
      "local  " + st.local.toFixed(3) + "\n" +
      "mount  " + mountedIndexes(plan).join(",") + (plan.halves ? " + halves" : "") + (plan.intro ? " + intro" : "");
  }

  /* -------------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------------- */

  function init() {
    seq = document.querySelector(".sequence");
    if (!seq) return;
    stage = seq.querySelector(".sequence__stage");
    intro = stage.querySelector(":scope > .work__intro");
    panels = Array.prototype.slice.call(stage.querySelectorAll(":scope > .panel"));
    halves = [stage.querySelector(".split-half--left"), stage.querySelector(".split-half--right")];
    panels.forEach(function (panel) {
      var el = panel.querySelector('[data-part="hook"]');
      if (el) hooks.push({ el: el, text: el.textContent, panel: panel });
    });

    if (/[?&]debug\b/.test(window.location.search)) {
      hud = document.createElement("div");
      hud.className = "seq-hud";
      hud.setAttribute("aria-hidden", "true");
      document.body.appendChild(hud);
    }

    window.__seq = {
      get mode() {
        return isLive ? "live" : "static";
      },
      state: snapshot,
      scrollYFor: scrollYFor,
    };

    queries.forEach(function (q) {
      q.addEventListener("change", syncMode);
    });
    // Capture phase, so the input type is known before any focus handler runs.
    document.addEventListener("pointerdown", function () {
      lastInput = "pointer";
    }, true);
    document.addEventListener("keydown", function () {
      lastInput = "keyboard";
    }, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);

    if (motionAllowed()) enterLive();
    else enterStatic();

    // Line breaks depend on the web font, so re-split once it is in.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (!isLive) return;
        relayout();
        render();
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
