"use client";

import { useEffect, useRef } from "react";

/**
 * The neural field: the page's background, and a scroll indicator that happens
 * to be pretty.
 *
 * At the top of the page it is a brain, drawn as nodes and edges, in the top
 * left corner clear of the headline. As the page scrolls it comes apart and
 * spreads until, by the footer, the network spans the whole viewport. The edges
 * follow: the link radius grows with the expansion, so the thing stays a
 * connected network the whole way instead of coming apart into loose points.
 *
 * Nothing about the expanded state is regular. Nodes travel at their own speeds
 * and their targets are a warped, heavily jittered grid, because the first
 * version of this was legibly a rectangle of evenly spaced dots.
 *
 * Position is a pure function of scroll, not an accumulated animation, so
 * scrolling back up runs it backwards exactly.
 *
 * It used to live inside the hero, scoped to the right of the artwork and
 * masked off the text. That was a workaround for a legibility problem: measured
 * across breakpoints, no fixed mask could keep a bright field off every glyph.
 * The answer here is different in kind. The field is dim by construction — the
 * alpha ceilings below sit near the dot grid's own contribution — so it never
 * competes with text at any width, and it needs no mask at all.
 *
 * Behaviour it must respect:
 *   - `prefers-reduced-motion`: renders the current scroll state, no bob, no loop.
 *   - Hidden tab: the loop stops and resumes with the tab.
 *   - No JavaScript: the component never mounts and the page is fine.
 */

type Node = {
  /** Position inside the brain, in units of HOME_R from its centre. */
  hx: number;
  hy: number;
  /** Where it ends up once the field has expanded, in viewport fractions. */
  tx: number;
  ty: number;
  r: number;
  /**
   * How fast this node makes the journey, as a multiplier on the shared
   * progress. Without it every node arrives at once and the expansion has a
   * single visible front; with it the field comes apart raggedly.
   */
  lag: number;
  /** Phase offset so the drift does not look synchronised. */
  phase: number;
};

/*
 * Enough nodes that the silhouette survives a short link radius. At 110 the
 * fold bands were far enough apart that the edges could not bridge them and
 * the brain fell into two disconnected clumps.
 */
const NODE_COUNT = 150;

/**
 * The brain's centre, in viewport fractions, and its radius in CSS pixels.
 *
 * Top left, not centre left, and clear of the sticky header. HOME_R is the
 * half-width: the shape spans twice this, so it reads as a mark rather than a
 * speck, while still sitting left of where the headline starts at every width.
 */
const HOME_X = 0.082;
const HOME_Y = 0.235;
const HOME_R = 78;

/**
 * The link radius at both ends of the journey, as a fraction of the viewport's
 * width. It grows with the expansion because a fixed threshold severs every
 * edge in the first few hundred pixels of scroll, which is the opposite of the
 * effect: the network is supposed to spread, not dissolve.
 *
 * The near value is deliberately short. A longer one connects nodes across the
 * whole brain, and those chords fill the silhouette with straight lines until
 * it reads as a blob; keeping edges local makes the folds visible as chains.
 */
const LINK_NEAR = 0.036;
const LINK_FAR = 0.15;
const MAX_LINKS = 3;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Is this point inside the brain?
 *
 * Coordinates are in units of HOME_R, x to the right and y down, so the shape
 * spans roughly -1..1 on both axes. It is a side view, which is the reading
 * that survives at this size: a lateral silhouette is recognisable as a brain
 * from its outline alone, where a top view needs the fissure to be visible to
 * be anything but an oval.
 *
 * Three parts, in the order a neuroanatomy diagram draws them: the cerebrum,
 * the cerebellum tucked under its back, and the stem below that.
 *
 * The `fold` test is what makes it read as brain rather than blob. It keeps
 * points near the crests of a sine ripple and rejects the troughs, which
 * scatters the nodes along curved bands. Once the edges are drawn between
 * them, those bands look like gyri.
 */
function inBrain(x: number, y: number, fold: boolean): boolean {
  const cerebrum = (x / 1) ** 2 + ((y + 0.1) / 0.72) ** 2 <= 1 && y < 0.45;
  const cerebellum = ((x + 0.52) / 0.36) ** 2 + ((y - 0.42) / 0.28) ** 2 <= 1;
  const stem = x > -0.3 && x < -0.06 && y > 0.3 && y < 0.78;
  if (!(cerebrum || cerebellum || stem)) return false;
  if (!fold) return true;
  // Ripples running front to back, tilted, so the bands curve with the shape.
  return Math.abs(Math.sin(x * 4.6 + y * 2.9 + Math.cos(y * 3.1) * 1.4)) > 0.32;
}

/**
 * Targets are jittered on a coarse grid rather than drawn uniformly. Uniform
 * random points clump, and a background of clumps and bald patches reads as a
 * mistake; a jittered grid covers the viewport evenly and still looks
 * unplanned. Targets run well past the edges so the network bleeds off-screen
 * instead of stopping at a visible boundary.
 *
 * The grid on its own is the problem it solves, though: it was legible AS a
 * grid, a rectangle of evenly spaced points. So the jitter is a full cell
 * rather than half, and every target is then pushed through a low-frequency
 * warp that bunches some regions and opens voids in others. Combined with the
 * per-node `lag`, nothing in the expanded state lines up with anything.
 */
function seedNodes(): Node[] {
  const rand = mulberry32(20260908);
  const cols = 13;
  const rows = Math.ceil(NODE_COUNT / cols);
  const nodes: Node[] = [];

  for (let i = 0; i < NODE_COUNT; i++) {
    // Rejection sampling into the silhouette. The attempt cap matters: the
    // fold test rejects most of the box, and an unbounded loop here would
    // hang the first paint rather than merely look wrong.
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
      hx,
      hy,
      tx: gx * 1.26 - 0.13 + (rand() - 0.5) * 0.16 + warpX,
      ty: gy * 1.26 - 0.13 + (rand() - 0.5) * 0.18 + warpY,
      r: 0.9 + rand() * 1.5,
      lag: 0.62 + rand() * 0.76,
      phase: rand() * Math.PI * 2,
    });
  }
  return nodes;
}

export function NeuralField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nodes = seedNodes();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /*
     * The glow is drawn once into an offscreen canvas and then blitted per
     * node. Building a radial gradient per node per frame was the single most
     * expensive thing this component did: it took the median frame from ~4ms
     * to ~68ms, which is 15fps.
     */
    const SPRITE = 64;
    const sprite = document.createElement("canvas");
    sprite.width = SPRITE;
    sprite.height = SPRITE;
    const sctx = sprite.getContext("2d");
    if (sctx) {
      const g = sctx.createRadialGradient(
        SPRITE / 2,
        SPRITE / 2,
        0,
        SPRITE / 2,
        SPRITE / 2,
        SPRITE / 2,
      );
      g.addColorStop(0, "rgba(150,165,255,0.5)");
      g.addColorStop(1, "rgba(150,165,255,0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, SPRITE, SPRITE);
    }

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let t = 0;

    /** Thins the population on a small screen, where the field is denser. */
    let scale = 1;
    let visibleCount = NODE_COUNT;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(1, Math.max(0.55, width / 1100));
      visibleCount = Math.round(NODE_COUNT * (0.5 + 0.5 * scale));
    };

    /**
     * 0 is the knot, 1 is the field across the whole viewport.
     *
     * Measured against the scrollable length of the document rather than a
     * fixed number of pixels, so the expansion finishes at the foot of the page
     * whether that page is the home page or a 7,000px case study.
     */
    const progress = () => {
      const span = document.documentElement.scrollHeight - window.innerHeight;
      if (span <= 0) return 0;
      return Math.min(1, Math.max(0, window.scrollY / span));
    };

    const draw = () => {
      const p = progress();
      // Very slightly front-loaded: the field has to visibly move within the
      // first screen or the effect goes unnoticed, but it must still have
      // somewhere left to go on the way down.
      const e = Math.pow(p, 0.85);

      ctx.clearRect(0, 0, width, height);

      const homeX = HOME_X * width;
      const homeY = HOME_Y * height;
      const knot = HOME_R * scale;

      const pts = nodes.slice(0, visibleCount).map((n) => {
        // A slow bob keeps the brain alive rather than frozen, and grows with
        // the field so the expanded state is not a static wallpaper either.
        const bob = reduced ? 0 : Math.sin(t * 0.0004 + n.phase) * (2 + 5 * e);
        // Each node runs its own clock. Clamped, so the fast ones settle at
        // their target instead of sailing past it.
        const ei = Math.min(1, e * n.lag);
        const hx = homeX + n.hx * knot;
        const hy = homeY + n.hy * knot;
        return {
          x: hx + (n.tx * width - hx) * ei,
          y: hy + (n.ty * height - hy) * ei + bob,
          // The points grow as they spread: small and tight in the brain, and
          // half again as large by the time they are the whole background.
          r: n.r * scale * (0.62 + 0.95 * ei),
        };
      });

      // Edges first, so nodes sit on top of them.
      const linkDist = (LINK_NEAR + (LINK_FAR - LINK_NEAR) * e) * width;
      const limit = linkDist * linkDist;

      ctx.lineWidth = 1;
      /*
       * Edges are bucketed by opacity and each bucket stroked as one path.
       * Stroking every edge separately meant a style change and a draw call
       * per edge, which is where the rest of the frame budget went.
       */
      const BUCKETS = 4;
      const buckets: Path2D[] = [];
      for (let b = 0; b < BUCKETS; b++) buckets.push(new Path2D());

      for (let i = 0; i < pts.length; i++) {
        let made = 0;
        for (let j = i + 1; j < pts.length && made < MAX_LINKS; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          // Squared distance: the square root was per candidate pair.
          const d2 = dx * dx + dy * dy;
          if (d2 > limit) continue;
          made++;
          const closeness = 1 - Math.sqrt(d2) / linkDist;
          const b = Math.min(BUCKETS - 1, Math.floor(closeness * BUCKETS));
          buckets[b].moveTo(pts[i].x, pts[i].y);
          buckets[b].lineTo(pts[j].x, pts[j].y);
        }
      }

      /*
       * These two alpha ceilings are the whole legibility argument, which is
       * why they are constants and not something derived. The field now sits
       * behind every paragraph on the site; raising either number is a contrast
       * decision, not a styling one.
       */
      const dim = 0.72 + 0.28 * scale;
      for (let b = 0; b < BUCKETS; b++) {
        const a = ((b + 0.5) / BUCKETS) * 0.14 * dim;
        ctx.strokeStyle = `rgba(150, 165, 255, ${a.toFixed(3)})`;
        ctx.stroke(buckets[b]);
      }

      const nodeAlpha = 0.32 * dim;

      /*
       * The glow is what makes the knot read as a mark at the top of the page.
       * It fades out as the field spreads, because a hundred glows behind body
       * copy is exactly the contrast problem the old version had.
       */
      const glow = nodeAlpha * (1 - e) * 0.85;
      if (glow > 0.01) {
        ctx.globalAlpha = glow;
        for (const q of pts) {
          const d = q.r * 11;
          ctx.drawImage(sprite, q.x - d / 2, q.y - d / 2, d, d);
        }
        ctx.globalAlpha = 1;
      }

      // One path for every dot: a fill per node was a state change per node.
      ctx.fillStyle = `rgba(190, 200, 255, ${nodeAlpha.toFixed(3)})`;
      ctx.beginPath();
      for (const q of pts) {
        ctx.moveTo(q.x + q.r, q.y);
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    const loop = (now: number) => {
      t = now;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!reduced && !raf) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    if (reduced) draw();
    else start();

    const onResize = () => {
      resize();
      draw();
    };
    window.addEventListener("resize", onResize);

    // Under reduced motion there is no loop, so scroll is what redraws.
    const onScroll = () => {
      if (reduced) draw();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // A background animation nobody is looking at is pure battery cost.
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  /*
   * Its own fixed layer at z-index -5, not a child of `.site-bg`.
   *
   * `.site-bg` sits at -10, and so does the hero's artwork stack on the home
   * page — including the left-to-right gradient that buys the headline its
   * contrast, which is opaque exactly where this field starts. Inside that
   * layer the knot was painted over and invisible for the whole first screen.
   * At -5 it clears the hero's own background and still sits behind every piece
   * of content on the site, which is z-index auto.
   */
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 h-full w-full"
      style={{ zIndex: -5 }}
    />
  );
}
