/**
 * Vanilla-JS port of the site's NeuralField: a canvas brain that comes apart
 * into a field of nodes as the page scrolls. Ported for these static
 * mockups so the "cerebro móvil" carries over unchanged for comparison.
 *
 * Two phases, both driven by the same trigger (see resize()'s triggerY):
 * ordinary document flow next to "Selected work" until that section is a
 * quarter of the way down the viewport, then stuck to the screen and
 * dispersing for the rest of the page (see #brain-canvas and .brain-track
 * in style.css for the position: sticky mechanics behind that).
 */
(function () {
  const canvas = document.getElementById("brain-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Round 4 confined this to the hero (fewer nodes, stops once it scrolls
  // off) for a two-core machine's frame budget. The node count is still
  // capped for the same reason — the link search below is O(n^2) over the
  // node list, and once stuck it runs for the rest of the page, not less.
  const CORES = navigator.hardwareConcurrency || 4;
  const NODE_COUNT = CORES <= 4 || window.innerWidth < 900 ? 84 : 132;
  // Where the field rests, and when it starts coming apart: just left of the
  // "Selected work" lede, not before that section is a quarter of the way
  // down the viewport. Both targets are normal-flow content above the
  // pinned sequence's pin point, so their document position is stable and
  // safe to measure once per resize(), not something read every frame.
  const homeTarget = document.querySelector(".work__lede");
  const triggerTarget = document.getElementById("work-title");
  const HOME_R = 78;
  const LINK_NEAR = 0.036;
  const LINK_FAR = 0.15;
  const MAX_LINKS = 3;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function inBrain(x, y, fold) {
    const cerebrum = (x / 1) ** 2 + ((y + 0.1) / 0.72) ** 2 <= 1 && y < 0.45;
    const cerebellum = ((x + 0.52) / 0.36) ** 2 + ((y - 0.42) / 0.28) ** 2 <= 1;
    const stem = x > -0.3 && x < -0.06 && y > 0.3 && y < 0.78;
    if (!(cerebrum || cerebellum || stem)) return false;
    if (!fold) return true;
    return Math.abs(Math.sin(x * 4.6 + y * 2.9 + Math.cos(y * 3.1) * 1.4)) > 0.32;
  }

  function seedNodes() {
    const rand = mulberry32(20260908);
    const cols = 13;
    const rows = Math.ceil(NODE_COUNT / cols);
    const nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      let hx = 0;
      let hy = 0;
      for (let attempt = 0; attempt < 200; attempt++) {
        hx = rand() * 2.2 - 1.1;
        hy = rand() * 2.2 - 1.1;
        if (inBrain(hx, hy, attempt < 160)) break;
      }
      const gx = ((i % cols) + 0.5) / cols;
      const gy = (Math.floor(i / cols) + 0.5) / rows;
      const warpX = Math.sin(gy * 5.1 + i * 0.7) * 0.11;
      const warpY = Math.cos(gx * 4.3 + i * 0.4) * 0.09;
      nodes.push({
        hx: hx,
        hy: hy,
        tx: gx * 1.26 - 0.13 + (rand() - 0.5) * 0.16 + warpX,
        ty: gy * 1.26 - 0.13 + (rand() - 0.5) * 0.18 + warpY,
        r: 0.9 + rand() * 1.5,
        lag: 0.62 + rand() * 0.76,
        phase: rand() * Math.PI * 2,
      });
    }
    return nodes;
  }

  const nodes = seedNodes();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SPRITE = 64;
  const sprite = document.createElement("canvas");
  sprite.width = SPRITE;
  sprite.height = SPRITE;
  const sctx = sprite.getContext("2d");
  if (sctx) {
    const g = sctx.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
    g.addColorStop(0, "rgba(150,165,255,0.5)");
    g.addColorStop(1, "rgba(150,165,255,0)");
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, SPRITE, SPRITE);
  }

  let width = 0,
    height = 0,
    dpr = 1,
    raf = 0,
    t = 0,
    scale = 1,
    visibleCount = NODE_COUNT;

  function resize() {
    // A retina backing store costs 4x the fill for an ornament nobody reads
    // pixel by pixel; 1.5 is indistinguishable here and much cheaper.
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // The full scrollable length of the page, not one screen of it: the
    // field should still be visibly coming apart wherever you are in the
    // scroll, not finish early and then just sit there idling for the rest
    // of a page this long. Recomputed on resize since the document's height
    // changes with the viewport (the pinned sequence is defined in vh).
    span = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    // triggerY: the scrollY at which #work-title's top reaches a quarter of
    // the way down the viewport. Its document position (getBoundingClientRect
    // plus the current scroll) is scroll-invariant, so this is correct
    // however far the page happens to be scrolled when resize() runs. It
    // doubles as #brain-canvas's margin-top (--brain-anchor in style.css):
    // .brain-track starts at document y0, so a sticky child's natural,
    // un-stuck top sits at margin-top, and with `top: 0` it sticks exactly
    // once scrollY passes that — the same instant JS starts the dispersal
    // below, so the canvas locks to the screen and the field starts coming
    // apart on the same frame.
    if (triggerTarget) {
      const titleDocTop = triggerTarget.getBoundingClientRect().top + window.scrollY;
      triggerY = titleDocTop - height * 0.25;
      canvas.style.setProperty("--brain-anchor", Math.max(0, triggerY) + "px");
      // homeY: level with the lede, expressed as where the lede would sit in
      // the viewport at the moment of the trigger above — the offset between
      // the two document positions is fixed, so this holds at any scroll.
      if (homeTarget) {
        const ledeRect = homeTarget.getBoundingClientRect();
        const ledeDocTop = ledeRect.top + window.scrollY;
        homeX = Math.max(0.02, (ledeRect.left * 0.5) / width);
        homeY = Math.min(0.85, Math.max(0.05, (ledeDocTop - titleDocTop + height * 0.25) / height));
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(1, Math.max(0.55, width / 1100));
    visibleCount = Math.round(NODE_COUNT * (0.5 + 0.5 * scale));
  }

  // Cached by resize(), so no frame reads layout.
  let span = 1;
  let triggerY = 0;
  let homeX = 0.06;
  let homeY = 0.3;

  function progress() {
    return Math.min(1, Math.max(0, (window.scrollY - triggerY) / span));
  }

  function draw() {
    const p = progress();
    const e = Math.pow(p, 0.85);
    ctx.clearRect(0, 0, width, height);

    const homeXPx = homeX * width;
    const homeYPx = homeY * height;
    const knot = HOME_R * scale;

    const pts = nodes.slice(0, visibleCount).map(function (n) {
      // Faster and wider than before: at rest (e near 0, the resting
      // cluster) the old 2px/15.7s drift was too slow and too small to read
      // as motion at a glance, which is what made the field look static.
      const bobY = reduced ? 0 : Math.sin(t * 0.00085 + n.phase) * (3.5 + 6 * e);
      const bobX = reduced ? 0 : Math.cos(t * 0.00065 + n.phase * 1.3) * (2 + 4 * e);
      const ei = Math.min(1, e * n.lag);
      const hx = homeXPx + n.hx * knot;
      const hy = homeYPx + n.hy * knot;
      return {
        x: hx + (n.tx * width - hx) * ei + bobX,
        y: hy + (n.ty * height - hy) * ei + bobY,
        r: n.r * scale * (0.62 + 0.95 * ei),
      };
    });

    const linkDist = (LINK_NEAR + (LINK_FAR - LINK_NEAR) * e) * width;
    const limit = linkDist * linkDist;

    ctx.lineWidth = 1;
    const BUCKETS = 4;
    const buckets = [];
    for (let b = 0; b < BUCKETS; b++) buckets.push(new Path2D());

    for (let i = 0; i < pts.length; i++) {
      let made = 0;
      for (let j = i + 1; j < pts.length && made < MAX_LINKS; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 > limit) continue;
        made++;
        const closeness = 1 - Math.sqrt(d2) / linkDist;
        const b = Math.min(BUCKETS - 1, Math.floor(closeness * BUCKETS));
        buckets[b].moveTo(pts[i].x, pts[i].y);
        buckets[b].lineTo(pts[j].x, pts[j].y);
      }
    }

    const dim = 0.72 + 0.28 * scale;
    for (let b = 0; b < BUCKETS; b++) {
      const a = ((b + 0.5) / BUCKETS) * 0.14 * dim;
      ctx.strokeStyle = "rgba(150, 165, 255, " + a.toFixed(3) + ")";
      ctx.stroke(buckets[b]);
    }

    const nodeAlpha = 0.32 * dim;
    const glow = nodeAlpha * (1 - e) * 0.85;
    if (glow > 0.01) {
      ctx.globalAlpha = glow;
      for (const q of pts) {
        const d = q.r * 11;
        ctx.drawImage(sprite, q.x - d / 2, q.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "rgba(190, 200, 255, " + nodeAlpha.toFixed(3) + ")";
    ctx.beginPath();
    for (const q of pts) {
      ctx.moveTo(q.x + q.r, q.y);
      ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  function loop(now) {
    t = now;
    draw();
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (!reduced && !raf) raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  resize();
  if (reduced) draw();
  else start();

  window.addEventListener("resize", function () {
    resize();
    draw();
  });
  window.addEventListener(
    "scroll",
    function () {
      if (reduced) draw();
    },
    { passive: true },
  );

  let onScreen = true;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (onScreen && !reduced) start();
  });

  // Sticky, not fixed: before the trigger it scrolls like ordinary content,
  // so there is a real stretch (0 to triggerY) where it is genuinely off
  // the top of the screen, not just quiet — the loop pauses there instead
  // of repainting a hidden canvas.
  if (window.IntersectionObserver) {
    new IntersectionObserver(
      function (entries) {
        onScreen = entries[entries.length - 1].isIntersecting;
        if (!onScreen) stop();
        else if (!document.hidden && !reduced) start();
      },
      { rootMargin: "80px" },
    ).observe(canvas);
  }
})();
