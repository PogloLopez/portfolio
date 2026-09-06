import type { CardVisual as Spec } from "@/content/projects";
import { seriesColor } from "@/components/demos/palette";

/**
 * The miniature on a home-page card. Static SVG, no client JavaScript: it is a
 * glance at what the system produces, not an interactive chart. The real
 * interaction lives in the demo on each case-study page.
 */
export function CardVisual({ spec }: { spec: Spec }) {
  return (
    <div
      className="relative h-24 w-full overflow-hidden rounded-lg border border-line bg-ground/60"
      role="img"
      aria-label={spec.caption}
    >
      {spec.kind === "line" && <LineMini points={spec.points} />}
      {spec.kind === "bars" && <BarsMini points={spec.points} />}
      {spec.kind === "chat" && <ChatMini />}
      {spec.kind === "gate" && <GateMini />}
    </div>
  );
}

function LineMini({ points }: { points: number[] }) {
  const w = 300;
  const h = 96;
  const pad = 10;
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2);

  // The last third renders dashed, standing in for the forecast tail.
  const split = Math.floor((points.length - 1) * 0.66);
  const seg = (from: number, to: number) =>
    points
      .slice(from, to + 1)
      .map((v, k) => `${k === 0 ? "M" : "L"} ${x(from + k).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");

  const area =
    `${seg(0, points.length - 1)} L ${x(points.length - 1).toFixed(1)} ${h} L ${x(0).toFixed(1)} ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="cardFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={seriesColor.primary} stopOpacity="0.28" />
          <stop offset="100%" stopColor={seriesColor.primary} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#cardFade)" />
      <path
        d={seg(0, split)}
        fill="none"
        stroke={seriesColor.primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={seg(split, points.length - 1)}
        fill="none"
        stroke={seriesColor.primary}
        strokeWidth="2"
        strokeDasharray="4 4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function BarsMini({ points }: { points: number[] }) {
  const hi = Math.max(...points);
  return (
    <div className="flex h-full items-end gap-1.5 px-3 pb-3 pt-4">
      {points.map((v, i) => (
        <span
          key={i}
          className="flex-1 rounded-[3px]"
          style={{
            height: `${Math.max(8, (v / hi) * 100)}%`,
            // Short cover is the problem state; the rest reads as healthy.
            backgroundColor: v < 25 ? seriesColor.compare : seriesColor.primary,
            opacity: v < 25 ? 0.95 : 0.55,
          }}
        />
      ))}
    </div>
  );
}

function ChatMini() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-3">
      <span className="ml-auto block h-3.5 w-[58%] rounded-full rounded-br-sm bg-iris/35" />
      <span className="block h-2.5 w-[34%] rounded-full bg-white/10" />
      <span className="block h-3.5 w-[72%] rounded-full rounded-bl-sm bg-white/14" />
      <span
        className="block h-2 w-[44%] rounded-full"
        style={{ backgroundColor: seriesColor.third, opacity: 0.6 }}
      />
    </div>
  );
}

function GateMini() {
  return (
    <div className="flex h-full flex-col justify-center gap-1 px-3 font-mono text-[0.5625rem] leading-relaxed">
      <span className="text-fg-3">| 2026-09-04 | Mercado | -186,400 |</span>
      <span style={{ color: seriesColor.third }}>+ | 2026-09-06 | Energía | -214,300 |</span>
      <span className="mt-1 flex items-center gap-1.5">
        <span className="rounded-sm border border-violet/50 bg-violet/15 px-1.5 py-0.5 text-violet">
          approval required
        </span>
      </span>
    </div>
  );
}
