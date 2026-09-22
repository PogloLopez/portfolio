/**
 * Closing carousel: cursor spotlight and tilt, ported from the
 * showcase-concepts tilt.js.
 *
 * The drift itself is pure CSS: two identical card sets in a max-content
 * track, translated 0 -> -50% and paused on :hover and :focus-within. This
 * file writes --mx/--my/--spot-opacity on the row and --rx/--ry/--cx/--cy on
 * the card under the cursor, batched into one requestAnimationFrame.
 *
 * Hit-testing is by geometry rather than event.target, so the tilt follows the
 * card under the cursor whichever copy it is. The copies are aria-hidden with
 * their links out of the tab order, so assistive tech and the keyboard meet
 * each project once, but they stay clickable.
 *
 * Keyboard focus on a real card moves the drift to the phase where that card
 * sits fully inside the row's clear band (the :focus-within pause then holds
 * it there), and the toggle beside the heading pauses the drift for good.
 */
(function () {
  "use strict";

  var row = document.querySelector(".marquee");
  if (!row) return;

  var root = document.documentElement;
  var track = row.querySelector(".marquee__track");
  var toggle = document.querySelector(".marquee-toggle");
  var cards = Array.prototype.slice.call(row.querySelectorAll(".mcard"));
  var TILT = 14; // degrees across the full card, as in tilt.js
  var CLEAR = [0.06, 0.94]; // the unmasked band, as fractions of the row (see style.css)
  var FOCUS_INSET = 16; // px kept between a focused card and the fade, for the focus ring

  var pointer = null;
  var hovered = null;
  var raf = 0;
  var lastInput = "keyboard";

  // Tilt is motion, so it follows the same live/static switch as the sequence.
  function live() {
    return root.classList.contains("seq-live");
  }

  function inside(x, y, r) {
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function cardAt(x, y) {
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      if (inside(x, y, r)) return { card: cards[i], rect: r };
    }
    return null;
  }

  function release(card) {
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.classList.remove("is-hover");
  }

  function releaseAll() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    pointer = null;
    if (hovered) release(hovered);
    hovered = null;
    row.classList.remove("has-hover");
    row.style.setProperty("--spot-opacity", "0");
  }

  function frame() {
    raf = 0;
    if (!pointer || !live()) return;

    // All reads first, then all writes, so a frame never forces two layouts.
    var rowRect = row.getBoundingClientRect();
    var hit = cardAt(pointer.x, pointer.y);

    row.style.setProperty("--mx", (pointer.x - rowRect.left).toFixed(1) + "px");
    row.style.setProperty("--my", (pointer.y - rowRect.top).toFixed(1) + "px");
    row.style.setProperty("--spot-opacity", "1");

    if (hovered && (!hit || hit.card !== hovered)) release(hovered);
    hovered = hit ? hit.card : null;
    row.classList.toggle("has-hover", !!hit);
    if (!hit) return;

    var px = (pointer.x - hit.rect.left) / hit.rect.width;
    var py = (pointer.y - hit.rect.top) / hit.rect.height;
    hit.card.style.setProperty("--rx", ((px - 0.5) * TILT).toFixed(2) + "deg");
    hit.card.style.setProperty("--ry", ((py - 0.5) * -TILT).toFixed(2) + "deg");
    hit.card.style.setProperty("--cx", (px * 100).toFixed(1) + "%");
    hit.card.style.setProperty("--cy", (py * 100).toFixed(1) + "%");
    hit.card.classList.add("is-hover");
  }

  row.addEventListener("mousemove", function (e) {
    if (!live()) return;
    pointer = { x: e.clientX, y: e.clientY };
    if (!raf) raf = window.requestAnimationFrame(frame);
  });

  row.addEventListener("mouseleave", releaseAll);

  // No click handling here. The copies used to be inert, which made them
  // unclickable, and a handler tried to forward their clicks by setting
  // location.hash: that only ever produced "#../project-pages/…" (or a
  // missing #case- anchor), so every other pass of the carousel was dead.
  // The copies are ordinary links now (aria-hidden, out of the tab order),
  // and the browser handles their clicks like any other.

  document.addEventListener("seq:mode", function (e) {
    if (e.detail && e.detail.mode === "static") releaseAll();
  });

  /* -------------------------------------------------------------------------
     Keyboard focus. :focus-within pauses the drift wherever it happens to be,
     which could leave the focused card off-screen with only its inert copy
     showing. So the drift is moved to the phase where the focused card sits
     inside the clear band, by the smallest shift that gets it there.
  ------------------------------------------------------------------------- */

  function drift() {
    var list = track.getAnimations ? track.getAnimations() : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].animationName === "marquee-drift") return list[i];
    }
    return null;
  }

  // The track offset (px, <= 0) that puts a card whose resting left edge is
  // `left` inside [lo, hi], or null if it already is. Pure, so it ports as is.
  function offsetToShow(left, current, lo, hi) {
    var x = left + current;
    if (x >= lo && x <= hi) return null;
    return (x < lo ? lo : hi) - left;
  }

  function bringIntoBand(card) {
    // getAnimations() flushes style, so the :focus-within pause is already
    // applied and the new time is held exactly.
    var anim = drift();
    if (!anim) return;
    var half = track.offsetWidth / 2; // the keyframes run 0 -> -50%
    var duration = anim.effect.getTiming().duration;
    var current = new DOMMatrix(getComputedStyle(track).transform).m41;
    // Layout offsets, so neither the drift nor a card's tilt skews them.
    var left = track.offsetLeft + card.offsetLeft;
    var width = row.clientWidth;
    var lo = width * CLEAR[0] + FOCUS_INSET;
    var hi = width * CLEAR[1] - FOCUS_INSET - card.offsetWidth;
    var target = offsetToShow(left, current, lo, hi);
    if (target === null) return;
    // Offset t is reached at active time -t / half * duration, i.e. at
    // currentTime = active time + delay. The loop is periodic, so whole
    // durations can be added; a current time below the before/active
    // boundary (never below 0, whatever the delay) would unapply the drift.
    // Setting currentTime moves the drift without touching its play state.
    var delay = anim.effect.getTiming().delay || 0;
    var time = (-target / half) * duration + delay;
    while (time < Math.max(0, delay)) time += duration;
    anim.currentTime = time;
    row.scrollLeft = 0;
  }

  // Focus that came from the keyboard (or script), not a click: a click must
  // never move the card it is landing on.
  function keyboardFocus(el) {
    try {
      if (el.matches(":focus-visible")) return true;
    } catch (err) {
      // No :focus-visible support: fall back to the last input alone.
    }
    return lastInput !== "pointer";
  }

  document.addEventListener("pointerdown", function () {
    lastInput = "pointer";
  }, true);
  document.addEventListener("keydown", function () {
    lastInput = "keyboard";
  }, true);

  row.addEventListener("focusin", function (e) {
    if (!live() || !keyboardFocus(e.target)) return;
    var card = e.target.closest ? e.target.closest(".mcard") : null;
    // Inert copies never take focus; this only guards the markup contract.
    if (!card || card.closest('[aria-hidden="true"]')) return;
    bringIntoBand(card);
  });

  /* -------------------------------------------------------------------------
     Pause / play. A button whose label says what it will do ("Pause the
     carousel" / "Play the carousel"), with the icon to match. The label
     changes, so it has no aria-pressed: a toggle button's name must stay
     fixed. .is-paused on the row holds the drift (and the cards' own loops)
     regardless of hover or focus.
  ------------------------------------------------------------------------- */

  if (toggle) {
    var toggleLabel = toggle.querySelector(".marquee-toggle__label");
    var toggleName = toggle.querySelector(".sr-only");
    toggle.addEventListener("click", function () {
      var paused = !row.classList.contains("is-paused");
      var verb = paused ? "Play" : "Pause";
      row.classList.toggle("is-paused", paused);
      toggle.classList.toggle("is-paused", paused);
      if (toggleLabel) toggleLabel.textContent = verb;
      if (toggleName) toggleName.textContent = verb + " the carousel";
    });
  }
})();
