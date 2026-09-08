"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The neural field behind the page.
 *
 * It starts assembled: a dense network of nodes and edges gathered around the
 * centre of the first screen, which is the same gesture as the brand mark. As
 * the page scrolls it decomposes — nodes drift outward along their own
 * vectors, the edges that held them stretch and fade as they pass a distance
 * threshold, and the field thins to a scatter of points by the footer. Scroll
 * back up and it reassembles, because position is a pure function of scroll
 * rather than an accumulated animation.
 *
 * It lives in the fixed background layer, so it spans the whole document and
 * the content scrolls over it.
 *
 * It renders on the home page only. On the case studies and the about page the
 * body copy runs the full width of the viewport, and a review measured the
 * particles at a higher luminance than the text they sat behind: the decoration
 * was literally brighter than the sentences. Those pages keep the auroras and
 * the grid, which never cross a glyph.
 *
 * Drawn on a canvas rather than as DOM or SVG: at ~90 nodes with edges
 * recomputed per frame this is far cheaper, and it never triggers layout.
 *
 * Behaviour it must respect:
 *   - `prefers-reduced-motion`: renders the assembled state once, no loop.
 *   - Off-screen: the loop parks itself, so a scrolled-past hero costs nothing.
 *   - No JavaScript: the component simply never mounts and the page is fine.
 */

type Node = {
  /** Home position, in normalised hero space. */
  hx: number;
  hy: number;
  /** Direction and distance it drifts to as the page scrolls. */
  dx: number;
  dy: number;
  r: number;
  /** Phase offset so the drift does not look synchronised. */
  phase: number;
};

const NODE_COUNT = 110;
const LINK_DIST = 0.14;
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
 * Nodes are seeded in a radial cluster so the assembled state reads as one
 * organism rather than scattered confetti.
 *
 * The cluster is centred on the right of the viewport, where the hero artwork's
 * burst sits, so on the home page the living network appears to emanate from
 * the static mark instead of competing with it. On the other pages it simply
 * reads as a figure in the upper right.
 */
const HOME_X = 0.72;
const HOME_Y = 0.42;

function seedNodes(): Node[] {
  const rand = mulberry32(20260907);
  const nodes: Node[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const angle = rand() * Math.PI * 2;
    // Square root keeps the area density even instead of crowding the centre.
    const radius = Math.sqrt(rand()) * 0.30;
    const hx = HOME_X + Math.cos(angle) * radius * 1.15;
    const hy = HOME_Y + Math.sin(angle) * radius;
    // Drift is outward from the centre, so decomposition reads as an
    // explosion rather than a slide.
    const spread = 0.55 + rand() * 1.5;
    nodes.push({
      hx,
      hy,
      dx: Math.cos(angle) * spread + (rand() - 0.5) * 0.35,
      dy: Math.sin(angle) * spread * 0.6 + rand() * 0.5,
      r: 1 + rand() * 2.2,
      phase: rand() * Math.PI * 2,
    });
  }
  return nodes;
}

export function NeuralField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const onHome = pathname === "/";

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
    let lastProgress = -1;

    /*
     * Everything is sized in CSS pixels, so on a 390px phone the same field is
     * proportionally three times denser and swamps the text it sits behind.
     * `scale` shrinks the marks and thins the population to match the viewport.
     */
    let scale = 1;
    let visibleCount = NODE_COUNT;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(1, Math.max(0.5, width / 1100));
      visibleCount = Math.round(NODE_COUNT * (0.45 + 0.55 * scale));
    };

    /** 0 assembled, 1 fully decomposed. */
    const progress = () => {
      const span = window.innerHeight * 2.2;
      return Math.min(1, Math.max(0, window.scrollY / span));
    };

    const draw = () => {
      const p = progress();
      // Ease out: most of the decomposition happens early, so the effect is
      // legible in the first screen rather than needing the whole page.
      const e = 1 - Math.pow(1 - p, 2);

      ctx.clearRect(0, 0, width, height);

      const pts = nodes.slice(0, visibleCount).map((n) => {
        // A slow bob keeps the assembled state alive rather than frozen.
        const bob = reduced ? 0 : Math.sin(t * 0.0004 + n.phase) * 0.006;
        return {
          x: (n.hx + n.dx * e) * width,
          y: (n.hy + n.dy * e + bob) * height,
          r: n.r * scale,
        };
      });

      // Edges first, so nodes sit on top of them.
      const linkAlpha = Math.max(0, 1 - e * 1.5);
      if (linkAlpha > 0.01) {
        ctx.lineWidth = 1;
        /*
         * Edges are bucketed by opacity and each bucket stroked as one path.
         * Stroking every edge separately meant a style change and a draw call
         * per edge, which is where the rest of the frame budget went.
         */
        const BUCKETS = 4;
        const buckets: Path2D[] = [];
        for (let b = 0; b < BUCKETS; b++) buckets.push(new Path2D());

        const limit = LINK_DIST * LINK_DIST;
        for (let i = 0; i < pts.length; i++) {
          let made = 0;
          for (let j = i + 1; j < pts.length && made < MAX_LINKS; j++) {
            const dx = (pts[i].x - pts[j].x) / width;
            const dy = (pts[i].y - pts[j].y) / height;
            // Squared distance: the square root was per candidate pair.
            const d2 = dx * dx + dy * dy;
            if (d2 > limit) continue;
            made++;
            const closeness = 1 - Math.sqrt(d2) / LINK_DIST;
            const b = Math.min(BUCKETS - 1, Math.floor(closeness * BUCKETS));
            buckets[b].moveTo(pts[i].x, pts[i].y);
            buckets[b].lineTo(pts[j].x, pts[j].y);
          }
        }

        for (let b = 0; b < BUCKETS; b++) {
          const a = ((b + 0.5) / BUCKETS) * linkAlpha * 0.72;
          ctx.strokeStyle = `rgba(150, 165, 255, ${a.toFixed(3)})`;
          ctx.stroke(buckets[b]);
        }
      }

      // Nodes dim as they scatter, so the field recedes instead of competing
      // with the content that scrolls over it.
      // Dimmer on a small screen, where the field is closer to the text.
      const a = (0.55 + 0.3 * scale) * (1 - e * 0.8);

      ctx.globalAlpha = a;
      for (const q of pts) {
        if (q.r <= 2.2 * scale) continue;
        const d = q.r * 10;
        ctx.drawImage(sprite, q.x - d / 2, q.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;

      // One path for every dot: a fill per node was a state change per node.
      ctx.fillStyle = `rgba(190, 200, 255, ${a.toFixed(3)})`;
      ctx.beginPath();
      for (const q of pts) {
        ctx.moveTo(q.x + q.r, q.y);
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    /*
     * Once the field is fully decomposed it is a static scatter, and the bob
     * is invisible at that opacity, so the loop parks itself and only scroll
     * wakes it. Scrolling the rest of a long page costs nothing.
     */
    const loop = (now: number) => {
      t = now;
      draw();
      if (progress() > 0.995) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const wake = () => {
      if (!reduced && !raf) raf = requestAnimationFrame(loop);
    };

    resize();

    if (reduced) {
      draw();
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onResize = () => {
      resize();
      draw();
    };
    window.addEventListener("resize", onResize);

    const onScroll = () => {
      const p = progress();
      if (p === lastProgress) return;
      lastProgress = p;
      if (reduced) draw();
      else wake();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!onHome) return null;

  /*
   * The mask keeps the field out of the left column, where the headline and
   * every body paragraph live. It is a hard guarantee rather than a matter of
   * opacity: no node can be drawn over text because the layer is not painted
   * there at all.
   */
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 h-full w-full"
      style={{
        WebkitMaskImage:
          "linear-gradient(90deg, transparent 0%, transparent 38%, rgba(0,0,0,0.55) 55%, #000 72%)",
        maskImage:
          "linear-gradient(90deg, transparent 0%, transparent 38%, rgba(0,0,0,0.55) 55%, #000 72%)",
      }}
    />
  );
}
