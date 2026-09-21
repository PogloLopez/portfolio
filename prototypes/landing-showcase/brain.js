/**
 * Vanilla-JS port of the site's NeuralField: a canvas brain, top-left, that
 * comes apart into a field of nodes as the page scrolls. Ported for these
 * static mockups so the "cerebro móvil" carries over unchanged for comparison.
 */
(function () {
  const canvas = document.getElementById("brain-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const NODE_COUNT = 150;
  const HOME_X = 0.082;
  const HOME_Y = 0.235;
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
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(1, Math.max(0.55, width / 1100));
    visibleCount = Math.round(NODE_COUNT * (0.5 + 0.5 * scale));
  }

  function progress() {
    const span = document.documentElement.scrollHeight - window.innerHeight;
    if (span <= 0) return 0;
    return Math.min(1, Math.max(0, window.scrollY / span));
  }

  function draw() {
    const p = progress();
    const e = Math.pow(p, 0.85);
    ctx.clearRect(0, 0, width, height);

    const homeX = HOME_X * width;
    const homeY = HOME_Y * height;
    const knot = HOME_R * scale;

    const pts = nodes.slice(0, visibleCount).map(function (n) {
      const bob = reduced ? 0 : Math.sin(t * 0.0004 + n.phase) * (2 + 5 * e);
      const ei = Math.min(1, e * n.lag);
      const hx = homeX + n.hx * knot;
      const hy = homeY + n.hy * knot;
      return {
        x: hx + (n.tx * width - hx) * ei,
        y: hy + (n.ty * height - hy) * ei + bob,
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
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });
})();
