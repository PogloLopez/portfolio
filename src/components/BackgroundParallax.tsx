"use client";

import { useEffect } from "react";

/**
 * Drives the background's parallax from the scroll position.
 *
 * Kept as its own tiny client component so the background itself stays a
 * server component and the page still renders correctly with no JavaScript:
 * without this, `--par` is never set and the grid is simply static.
 */
export function BackgroundParallax() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const grid = document.querySelector<HTMLElement>(".site-bg__grid");
    if (!grid) return;

    let ticking = false;
    const apply = () => {
      grid.style.setProperty("--par", String(window.scrollY * 0.08));
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
