"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * The chart used by the price and forecast demos.
 *
 * Written against the project's dataviz rules rather than a charting library:
 * 2px marks on a recessive grid, a crosshair that snaps to the nearest x and
 * reports every series in one tooltip, a legend whenever there is more than one
 * series, keyboard access to the same readout, and a table view so no value is
 * reachable only by hovering.
 *
 * Series colours come from the validated three-slot palette in `palette.ts`.
 */

export type Series = {
  id: string;
  name: string;
  color: string;
  values: (number | null)[];
  /** Index from which the line renders dashed — used for the forecast tail. */
  dashedFrom?: number;
};

export type Band = {
  upper: (number | null)[];
  lower: (number | null)[];
  color: string;
  label: string;
};

type Props = {
  xLabels: string[];
  series: Series[];
  band?: Band;
  format: (n: number) => string;
  height?: number;
  /** Draws a labelled vertical rule, e.g. where history ends and forecast begins. */
  divider?: { at: number; label: string };
  caption: string;
};

const PAD = { top: 14, right: 14, bottom: 30, left: 56 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 0.01; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

export function LineChart({
  xLabels,
  series,
  band,
  format,
  height = 260,
  divider,
  caption,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const n = xLabels.length;
  const plotW = Math.max(120, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;

  const { lo, hi, ticks } = useMemo(() => {
    const all: number[] = [];
    for (const s of series) for (const v of s.values) if (v != null) all.push(v);
    if (band) for (const v of [...band.upper, ...band.lower]) if (v != null) all.push(v);
    const min = Math.min(...all);
    const max = Math.max(...all);
    const pad = (max - min) * 0.12 || 1;
    const l = min - pad;
    const h = max + pad;
    return { lo: l, hi: h, ticks: niceTicks(l, h) };
  }, [series, band]);

  const x = useCallback((i: number) => PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW), [n, plotW]);
  const y = useCallback((v: number) => PAD.top + plotH - ((v - lo) / (hi - lo)) * plotH, [plotH, lo, hi]);

  /** Builds one path, breaking at nulls, restricted to [from, to]. */
  const linePath = (values: (number | null)[], from = 0, to = n - 1) => {
    let d = "";
    let pen = false;
    for (let i = from; i <= to; i++) {
      const v = values[i];
      if (v == null) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"} ${x(i).toFixed(2)} ${y(v).toFixed(2)} `;
      pen = true;
    }
    return d.trim();
  };

  const bandPath = useMemo(() => {
    if (!band) return "";
    const up: string[] = [];
    const dn: string[] = [];
    for (let i = 0; i < n; i++) {
      const u = band.upper[i];
      const l = band.lower[i];
      if (u == null || l == null) continue;
      up.push(`${x(i).toFixed(2)} ${y(u).toFixed(2)}`);
      dn.unshift(`${x(i).toFixed(2)} ${y(l).toFixed(2)}`);
    }
    if (!up.length) return "";
    return `M ${up.join(" L ")} L ${dn.join(" L ")} Z`;
  }, [band, n, x, y]);

  const indexFromClientX = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const px = clientX - rect.left - PAD.left;
    const i = Math.round((px / plotW) * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  };

  // Tick density follows the width that is actually available: on a phone the
  // same series gets three labels rather than seven overlapping ones.
  const maxTicks = Math.max(2, Math.floor(plotW / 74));
  const xTickEvery = Math.max(1, Math.ceil(n / maxTicks));
  // Drop the final label when it would sit on top of the previous one.
  const showLast = (n - 1) % xTickEvery > xTickEvery / 2;

  return (
    <figure className="not-prose m-0">
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-2">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs text-fg-2">
              <svg aria-hidden viewBox="0 0 18 8" className="h-2 w-[18px]">
                <line
                  x1="0"
                  y1="4"
                  x2="18"
                  y2="4"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeDasharray={s.dashedFrom === 0 ? "5 4" : undefined}
                />
              </svg>
              {s.name}
            </li>
          ))}
          {band && (
            <li className="flex items-center gap-2 text-xs text-fg-3">
              <span
                aria-hidden
                className="h-2.5 w-[18px] rounded-[2px]"
                style={{ backgroundColor: band.color }}
              />
              {band.label}
            </li>
          )}
        </ul>
      )}

      <div ref={wrapRef} className="relative w-full">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={caption}
          tabIndex={0}
          className="block touch-pan-y focus-visible:outline-2 focus-visible:outline-iris"
          onPointerMove={(e) => setActive(indexFromClientX(e.clientX))}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((a) => a ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              setActive((a) => {
                const base = a ?? n - 1;
                return Math.max(0, Math.min(n - 1, base + (e.key === "ArrowLeft" ? -1 : 1)));
              });
            }
          }}
        >
          <title>{caption}</title>

          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                y1={y(t)}
                x2={PAD.left + plotW}
                y2={y(t)}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 10}
                y={y(t) + 3.5}
                textAnchor="end"
                fontSize={10.5}
                fill="var(--color-fg-3)"
                fontFamily="var(--font-mono)"
              >
                {format(t)}
              </text>
            </g>
          ))}

          {xLabels.map((label, i) =>
            i % xTickEvery === 0 || (i === n - 1 && showLast) ? (
              <text
                key={`${label}-${i}`}
                x={x(i)}
                y={height - 10}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                fontSize={10.5}
                fill="var(--color-fg-3)"
                fontFamily="var(--font-mono)"
              >
                {label}
              </text>
            ) : null,
          )}

          {bandPath && <path d={bandPath} fill={band!.color} stroke="none" />}

          {divider && (
            <g>
              <line
                x1={x(divider.at)}
                y1={PAD.top}
                x2={x(divider.at)}
                y2={PAD.top + plotH}
                stroke="rgba(255,255,255,0.22)"
                strokeWidth={1}
                strokeDasharray="3 4"
              />
              <text
                x={x(divider.at) + 6}
                y={PAD.top + 10}
                fontSize={10}
                fill="var(--color-fg-3)"
                fontFamily="var(--font-mono)"
              >
                {divider.label}
              </text>
            </g>
          )}

          {series.map((s) => (
            <g key={s.id}>
              <path
                d={linePath(s.values, 0, s.dashedFrom != null ? s.dashedFrom : n - 1)}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.dashedFrom != null && (
                <path
                  d={linePath(s.values, s.dashedFrom, n - 1)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                />
              )}
            </g>
          ))}

          {active != null && (
            <g pointerEvents="none">
              <line
                x1={x(active)}
                y1={PAD.top}
                x2={x(active)}
                y2={PAD.top + plotH}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1}
              />
              {series.map((s) => {
                const v = s.values[active];
                if (v == null) return null;
                return (
                  <circle
                    key={s.id}
                    cx={x(active)}
                    cy={y(v)}
                    r={4}
                    fill={s.color}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {active != null && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg border border-line-strong bg-ground/95 px-3 py-2.5 shadow-lg backdrop-blur-sm"
            style={
              x(active) > PAD.left + plotW / 2
                ? { right: Math.max(8, width - x(active) + 12) }
                : { left: Math.min(width - 170, x(active) + 12) }
            }
          >
            <p className="font-mono text-[0.6875rem] text-fg-3">{xLabels[active]}</p>
            <ul className="mt-2 space-y-1.5">
              {series.map((s) => {
                const v = s.values[active];
                return (
                  <li key={s.id} className="flex items-center gap-2.5 text-xs whitespace-nowrap">
                    <svg aria-hidden viewBox="0 0 14 8" className="h-2 w-3.5 shrink-0">
                      <line x1="0" y1="4" x2="14" y2="4" stroke={s.color} strokeWidth="2" />
                    </svg>
                    <span className="font-semibold text-fg">{v == null ? "n/a" : format(v)}</span>
                    <span className="text-fg-3">{s.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <details className="group mt-4">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 font-mono text-[0.6875rem] tracking-[0.12em] text-fg-3 uppercase transition-colors hover:text-iris">
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className="h-3 w-3 transition-transform group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
          >
            <path d="M4.5 2.5 8 6l-3.5 3.5" />
          </svg>
          Table view
        </summary>
        <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-line">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-2">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-fg-3">Week</th>
                {series.map((s) => (
                  <th key={s.id} className="px-3 py-2 text-right font-medium text-fg-2">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {xLabels.map((label, i) => (
                <tr key={`${label}-${i}`} className="border-t border-line">
                  <td className="px-3 py-1.5 font-mono text-fg-3">{label}</td>
                  {series.map((s) => (
                    <td
                      key={s.id}
                      className="px-3 py-1.5 text-right text-fg-2 tabular-nums"
                    >
                      {s.values[i] == null ? "n/a" : format(s.values[i]!)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
