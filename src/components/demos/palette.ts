/**
 * Categorical series colours for the demo charts.
 *
 * Validated with the dataviz palette checker against this site's dark chart
 * surface (#0A0C18): all three sit inside the dark lightness band L 0.48–0.67,
 * clear the chroma floor, and the worst adjacent pair separates by ΔE 9.4 under
 * simulated deuteranopia (target ≥ 8) and 26.5 for normal vision (floor 15).
 *
 * Slot 1 is deliberately close to the site's own accent so charts belong to the
 * page; slots 2 and 3 are the hues that keep their distance from it.
 *
 * Assign in fixed order. Never cycle, never repaint a series because a filter
 * changed the series count.
 */
export const seriesColor = {
  /**
   * Slot 1 follows the case study's own accent, so a demo reads as part of its
   * page rather than as a widget dropped into it. Slots 2 and 3 stay fixed:
   * they carry comparison and status, jobs that must not change meaning from
   * one project to the next.
   */
  primary: "var(--accent, #6480F0)",
  compare: "#D95926",
  third: "#199E70",
} as const;

/** Fill for a forecast interval — the primary hue at low alpha, never a new hue. */
export const bandFill = "color-mix(in srgb, var(--accent, #6480F0) 16%, transparent)";

/**
 * Status colours, reserved. These mean good / warning / bad and are never
 * reused as a fourth series.
 */
export const status = {
  good: "#199E70",
  warn: "#C87A2F",
  bad: "#D95926",
} as const;
