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
  primary: "#6480F0",
  compare: "#D95926",
  third: "#199E70",
} as const;

/** Fill for a forecast interval — the primary hue at low alpha, never a new hue. */
export const bandFill = "rgba(100, 128, 240, 0.16)";

/**
 * Status colours, reserved. These mean good / warning / bad and are never
 * reused as a fourth series.
 */
export const status = {
  good: "#199E70",
  warn: "#C87A2F",
  bad: "#D95926",
} as const;
