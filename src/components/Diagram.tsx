/**
 * A small declarative diagram renderer.
 *
 * Architecture diagrams are described as nodes on a grid plus edges between
 * them, and rendered as inline SVG. This is deliberately not Mermaid: the
 * diagrams are the visual centrepiece of each deep dive, and rendering them
 * ourselves keeps them on the site's palette, ships zero client-side
 * JavaScript, and keeps real selectable text in the markup. The cost is that
 * layout is explicit — every node states its column and row.
 */

import type { ReactNode } from "react";

export type NodeTone = "default" | "accent" | "gate" | "ghost" | "store";

export type DiagramNode = {
  id: string;
  col: number;
  row: number;
  label: string;
  sub?: string;
  tone?: NodeTone;
  colSpan?: number;
};

export type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /**
   * "h" straight across, "v" straight down, "hv" out the side then down,
   * "vh" out the bottom then across, "hvh" the fan-out: out the side, across
   * the gap between two columns, then in. Omit to let the layout pick.
   */
  route?: "h" | "v" | "hv" | "vh" | "hvh";
};

export type DiagramGroup = {
  label: string;
  cols: [number, number];
  rows: [number, number];
};

export type DiagramSpec = {
  title: string;
  /** Read out to screen readers in place of the drawing. */
  description: string;
  lanes?: string[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
};

const NODE_W = 176;
const NODE_H = 66;
const GAP_X = 62;
const GAP_Y = 40;
const PAD = 18;
const LANE_H = 30;
/**
 * Advance width per character, measured rather than guessed: the label face is
 * Inter semibold and the sub-label is a monospace, which is materially wider
 * per character at the same size.
 */
const LABEL_CHAR_W = 0.56;
const SUB_CHAR_W = 0.62;

const colX = (col: number) => PAD + col * (NODE_W + GAP_X);
const nodeW = (n: DiagramNode) => (n.colSpan ?? 1) * NODE_W + ((n.colSpan ?? 1) - 1) * GAP_X;

function wrap(text: string, width: number, size: number, charW: number): string[] {
  const max = Math.max(6, Math.floor(width / (charW * size)));
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > max && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

const toneStyle: Record<NodeTone, { fill: string; stroke: string; dash?: string }> = {
  default: { fill: "var(--color-surface-2)", stroke: "rgba(255,255,255,0.18)" },
  accent: { fill: "color-mix(in srgb, var(--color-glow) 20%, var(--color-surface))", stroke: "var(--color-iris)" },
  gate: { fill: "color-mix(in srgb, var(--color-violet) 12%, var(--color-surface))", stroke: "var(--color-violet)", dash: "5 4" },
  ghost: { fill: "transparent", stroke: "rgba(255,255,255,0.16)", dash: "4 5" },
  store: { fill: "var(--color-surface)", stroke: "rgba(167,139,250,0.42)" },
};

export function Diagram({ spec }: { spec: DiagramSpec }) {
  const laneOffset = (spec.lanes?.length ? LANE_H : 0) + (spec.groups?.length ? 26 : 0);
  const rowY = (row: number) => PAD + laneOffset + row * (NODE_H + GAP_Y);

  const maxCol = Math.max(...spec.nodes.map((n) => n.col + (n.colSpan ?? 1)));
  const maxRow = Math.max(...spec.nodes.map((n) => n.row)) + 1;
  const width = PAD * 2 + maxCol * NODE_W + (maxCol - 1) * GAP_X;
  const height = PAD * 2 + laneOffset + maxRow * NODE_H + (maxRow - 1) * GAP_Y;

  const box = (id: string) => {
    const n = spec.nodes.find((x) => x.id === id);
    if (!n) throw new Error(`diagram "${spec.title}": unknown node "${id}"`);
    const x = colX(n.col);
    const y = rowY(n.row);
    const w = nodeW(n);
    return { n, x, y, w, h: NODE_H, cx: x + w / 2, cy: y + NODE_H / 2, r: x + w, b: y + NODE_H };
  };

  const paths: ReactNode[] = [];

  spec.edges.forEach((e, i) => {
    const a = box(e.from);
    const b = box(e.to);
    const sameRow = a.n.row === b.n.row;
    const overlapCols =
      a.x < b.x + b.w && b.x < a.x + a.w;
    const route = e.route ?? (sameRow ? "h" : overlapCols ? "v" : "hv");

    let d = "";
    let lx = 0;
    let ly = 0;

    if (route === "h") {
      const forward = b.x > a.x;
      const x1 = forward ? a.r : a.x;
      const x2 = forward ? b.x : b.r;
      d = `M ${x1} ${a.cy} L ${x2} ${b.cy}`;
      lx = (x1 + x2) / 2;
      ly = a.cy - 11;
    } else if (route === "v") {
      const down = b.y > a.y;
      const y1 = down ? a.b : a.y;
      const y2 = down ? b.y : b.b;
      d = `M ${a.cx} ${y1} L ${b.cx} ${y2}`;
      lx = a.cx + 8;
      ly = (y1 + y2) / 2 + 4;
      d = `M ${a.cx} ${y1} L ${a.cx} ${(y1 + y2) / 2} L ${b.cx} ${(y1 + y2) / 2} L ${b.cx} ${y2}`;
    } else if (route === "hvh") {
      const forward = b.cx > a.cx;
      const x1 = forward ? a.r : a.x;
      const x2 = forward ? b.x : b.r;
      const xm = (x1 + x2) / 2;
      d = `M ${x1} ${a.cy} L ${xm} ${a.cy} L ${xm} ${b.cy} L ${x2} ${b.cy}`;
      lx = xm;
      ly = (a.cy + b.cy) / 2 - 9;
    } else if (route === "hv") {
      const forward = b.cx > a.cx;
      const x1 = forward ? a.r : a.x;
      const y2 = b.y > a.y ? b.y : b.b;
      d = `M ${x1} ${a.cy} L ${b.cx} ${a.cy} L ${b.cx} ${y2}`;
      lx = (x1 + b.cx) / 2;
      ly = a.cy - 11;
    } else {
      const y1 = b.cy > a.cy ? a.b : a.y;
      const x2 = b.cx > a.cx ? b.x : b.r;
      d = `M ${a.cx} ${y1} L ${a.cx} ${b.cy} L ${x2} ${b.cy}`;
      lx = (a.cx + x2) / 2;
      ly = b.cy - 11;
    }

    paths.push(
      <path
        key={`e${i}`}
        d={d}
        fill="none"
        stroke="rgba(167,139,250,0.55)"
        strokeWidth={1.5}
        strokeDasharray={e.dashed ? "5 5" : undefined}
        markerEnd="url(#arrow)"
      />,
    );

    if (e.label) {
      const w = e.label.length * 6 + 12;
      paths.push(
        <g key={`el${i}`}>
          <rect
            x={lx - w / 2}
            y={ly - 10}
            width={w}
            height={17}
            rx={4}
            fill="var(--color-ground)"
            stroke="rgba(255,255,255,0.08)"
          />
          <text
            x={lx}
            y={ly + 2}
            textAnchor="middle"
            fontSize={10.5}
            fill="var(--color-fg-3)"
            fontFamily="var(--font-mono)"
          >
            {e.label}
          </text>
        </g>,
      );
    }
  });

  return (
    <figure className="not-prose my-9">
      <div className="overflow-x-auto rounded-xl border border-line bg-surface/60 p-3 sm:p-5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ minWidth: Math.min(width, 620), height: "auto" }}
          role="img"
          aria-label={spec.description}
        >
          <title>{spec.title}</title>
          <desc>{spec.description}</desc>
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(167,139,250,0.75)" />
            </marker>
          </defs>

          {spec.groups?.map((g, i) => {
            const x = colX(g.cols[0]) - 12;
            const y = rowY(g.rows[0]) - 22;
            const w = colX(g.cols[1]) + NODE_W - x + 12;
            const h = rowY(g.rows[1]) + NODE_H - y + 12;
            return (
              <g key={`g${i}`}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={12}
                  fill="rgba(108,140,255,0.045)"
                  stroke="rgba(108,140,255,0.22)"
                  strokeDasharray="6 5"
                />
                <text
                  x={x + 12}
                  y={y + 15}
                  fontSize={10.5}
                  letterSpacing={0.9}
                  fill="var(--color-iris)"
                  fontFamily="var(--font-mono)"
                >
                  {g.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          {spec.lanes?.map((lane, i) => (
            <text
              key={`l${i}`}
              x={colX(i) + NODE_W / 2}
              y={PAD + 12}
              textAnchor="middle"
              fontSize={10.5}
              letterSpacing={1}
              fill="var(--color-fg-3)"
              fontFamily="var(--font-mono)"
            >
              {lane.toUpperCase()}
            </text>
          ))}

          {paths}

          {spec.nodes.map((n) => {
            const t = toneStyle[n.tone ?? "default"];
            const x = colX(n.col);
            const y = rowY(n.row);
            const w = nodeW(n);
            const labelLines = wrap(n.label, w - 18, 13, LABEL_CHAR_W);
            const subLines = n.sub ? wrap(n.sub, w - 16, 10.5, SUB_CHAR_W) : [];
            const totalH = labelLines.length * 15 + subLines.length * 13;
            let ty = y + NODE_H / 2 - totalH / 2 + 11;
            return (
              <g key={n.id}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={NODE_H}
                  rx={9}
                  fill={t.fill}
                  stroke={t.stroke}
                  strokeWidth={1.25}
                  strokeDasharray={t.dash}
                />
                {labelLines.map((line, i) => {
                  const yy = ty;
                  ty += 15;
                  return (
                    <text
                      key={`t${i}`}
                      x={x + w / 2}
                      y={yy}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight={600}
                      fill="var(--color-fg)"
                      fontFamily="var(--font-sans)"
                    >
                      {line}
                    </text>
                  );
                })}
                {subLines.map((line, i) => {
                  const yy = ty + 1;
                  ty += 13;
                  return (
                    <text
                      key={`s${i}`}
                      x={x + w / 2}
                      y={yy}
                      textAnchor="middle"
                      fontSize={10.5}
                      fill="var(--color-fg-3)"
                      fontFamily="var(--font-mono)"
                    >
                      {line}
                    </text>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="mt-3 text-sm text-fg-3">{spec.title}</figcaption>
    </figure>
  );
}
