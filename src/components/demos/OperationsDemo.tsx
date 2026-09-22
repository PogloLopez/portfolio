"use client";

import { useState } from "react";
import { DemoFrame } from "./DemoFrame";
import { Button, ControlRow, Field, Select } from "./controls";
import { status } from "./palette";

/**
 * The inter-store transfer planner, reduced to its actual job: show where cover
 * is short, where it is long, and propose the moves that even it out.
 *
 * Stores, stock levels and sales rates are invented, at the scale a store
 * really carries: a few hundred units of a product at most, and moves of a
 * few dozen.
 */

type ProductId = "detergent" | "rice" | "soda";

type StoreRow = { store: string; onHand: number; daily: number };

const CATALOGUE: Record<ProductId, { name: string; unit: string; rows: StoreRow[] }> = {
  detergent: {
    name: "Powder detergent 2kg",
    unit: "units",
    rows: [
      { store: "Centro", onHand: 196, daily: 4.2 },
      { store: "Palermo", onHand: 48, daily: 3.4 },
      { store: "La Enea", onHand: 138, daily: 3.1 },
      { store: "Versalles", onHand: 16, daily: 2.9 },
      { store: "Chipre", onHand: 112, daily: 3.6 },
      { store: "Fátima", onHand: 38, daily: 3.3 },
    ],
  },
  rice: {
    name: "White rice 500g",
    unit: "units",
    rows: [
      { store: "Centro", onHand: 286, daily: 9.4 },
      { store: "Palermo", onHand: 372, daily: 6.2 },
      { store: "La Enea", onHand: 64, daily: 4.8 },
      { store: "Versalles", onHand: 164, daily: 4.4 },
      { store: "Chipre", onHand: 46, daily: 4.2 },
      { store: "Fátima", onHand: 300, daily: 5 },
    ],
  },
  soda: {
    name: "Soda 1.5L",
    unit: "units",
    rows: [
      { store: "Centro", onHand: 340, daily: 5.2 },
      { store: "Palermo", onHand: 108, daily: 6.4 },
      { store: "La Enea", onHand: 210, daily: 3.1 },
      { store: "Versalles", onHand: 42, daily: 4.1 },
      { store: "Chipre", onHand: 27, daily: 2.8 },
      { store: "Fátima", onHand: 168, daily: 5.6 },
    ],
  },
};

const TARGET_DAYS = 30;
/** Below this a move costs more to handle than the stock it shifts is worth. */
const MIN_MOVE = 12;

type Move = { from: string; to: string; units: number };

/**
 * Greedy surplus-to-deficit matching against a target days-of-cover. Not the
 * real solver — the real one carries pack sizes, route costs and minimums —
 * but the same shape of answer.
 */
function planTransfers(rows: StoreRow[]): Move[] {
  const surplus = rows
    .map((r) => ({ ...r, delta: r.onHand - r.daily * TARGET_DAYS }))
    .filter((r) => r.delta > r.daily * 5)
    .sort((a, b) => b.delta - a.delta);

  const deficit = rows
    .map((r) => ({ ...r, delta: r.daily * TARGET_DAYS - r.onHand }))
    .filter((r) => r.delta > r.daily * 3)
    .sort((a, b) => b.delta - a.delta);

  const moves: Move[] = [];
  let si = 0;

  for (const d of deficit) {
    let need = Math.round(d.delta);
    // A remainder too small to be worth a truck stays where it is: neither
    // the rest of this need nor the rest of a surplus store is moved.
    while (need >= MIN_MOVE && si < surplus.length) {
      const s = surplus[si];
      const give = Math.min(need, Math.round(s.delta));
      if (give >= MIN_MOVE) {
        moves.push({ from: s.store, to: d.store, units: Math.round(give / 6) * 6 });
        s.delta -= give;
        need -= give;
      }
      if (s.delta < MIN_MOVE) si++;
    }
  }

  return moves;
}

/** "A", "A and B", "A, B and C" — the plain-English join. */
function listJoin(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** A store this far under target is short in a way worth naming. */
const CRITICAL_DAYS = 20;

export function OperationsDemo() {
  const [productId, setProductId] = useState<ProductId>("detergent");
  /**
   * The moves are the tool's output, so they are not on screen before anyone
   * asks for them. Showing them by default made the plan look like part of the
   * inventory table it is derived from, when producing it is the whole job.
   */
  const [generated, setGenerated] = useState(false);

  const product = CATALOGUE[productId];
  // Cheap enough (six rows) to recompute; the React compiler memoises it.
  const suggested = planTransfers(product.rows);

  const moves = generated ? suggested : [];
  const totalUnits = moves.reduce((n, m) => n + m.units, 0);

  const coverAfter: Record<string, number> = {};
  for (const r of product.rows) {
    let onHand = r.onHand;
    for (const m of moves) {
      if (m.from === r.store) onHand -= m.units;
      if (m.to === r.store) onHand += m.units;
    }
    coverAfter[r.store] = onHand / r.daily;
  }

  // Derived from the same numbers the table renders, so the note and the
  // "After" column can never disagree.
  const stillShort = product.rows.filter((r) => coverAfter[r.store] < CRITICAL_DAYS);
  const shortfall = stillShort.reduce(
    (n, r) => n + Math.round(r.daily * TARGET_DAYS - coverAfter[r.store] * r.daily),
    0,
  );

  const change = (id: ProductId) => {
    setProductId(id);
    setGenerated(false);
  };

  const coverTone = (days: number) =>
    days < 12 ? status.bad : days > 55 ? status.warn : status.good;

  return (
    <DemoFrame
      title="Inter-store transfer planner"
      subtitle="stock-rebalancing · demo build"
      note="The real tool runs against real inventory and sales, handles pack sizes and route constraints, and is operated by the purchasing team rather than by me. Stores, stock and sales rates here are invented, and nothing is submitted anywhere."
    >
      <ControlRow>
        <Field label="Product">
          <Select
            value={productId}
            onChange={change}
            options={Object.entries(CATALOGUE).map(([value, v]) => ({
              value: value as ProductId,
              label: v.name,
            }))}
          />
        </Field>
        <span className="font-mono text-xs text-fg-3">target cover · {TARGET_DAYS} days</span>
      </ControlRow>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-fg-3 uppercase">
            Current position
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[24rem] text-sm">
              <thead className="bg-surface-2">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-fg-3">Store</th>
                  <th className="px-3 py-2.5 text-right font-medium text-fg-3">On hand</th>
                  <th className="px-3 py-2.5 text-right font-medium text-fg-3">Cover</th>
                  <th className="px-3 py-2.5 text-right font-medium text-fg-3">After</th>
                </tr>
              </thead>
              <tbody>
                {product.rows.map((r) => {
                  const before = r.onHand / r.daily;
                  const after = coverAfter[r.store];
                  return (
                    <tr key={r.store} className="border-t border-line">
                      <td className="px-3 py-2.5 text-fg-2">{r.store}</td>
                      <td className="px-3 py-2.5 text-right text-fg-3 tabular-nums">
                        {r.onHand.toLocaleString("en-US")}
                      </td>
                      <td
                        className="px-3 py-2.5 text-right tabular-nums"
                        style={{ color: coverTone(before) }}
                      >
                        {Math.round(before)}d
                      </td>
                      <td
                        className="px-3 py-2.5 text-right font-medium tabular-nums"
                        style={{ color: generated ? coverTone(after) : undefined }}
                      >
                        {generated ? (
                          `${Math.round(after)}d`
                        ) : (
                          <span className="text-fg-3">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-fg-3">
            Cover is on-hand units divided by the store&rsquo;s daily rate. Red is under twelve
            days, amber over fifty-five. Those are the two states that cost money.
          </p>
        </div>

        <div>
          <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-fg-3 uppercase">
            Suggested transfers
          </p>

          {!generated ? (
            <p className="mt-3 rounded-lg border border-dashed border-line-strong bg-surface-2/30 p-4 text-sm leading-relaxed text-fg-3">
              No plan yet. The solver matches every surplus store against every short one
              against a {TARGET_DAYS}-day cover target, drops the moves too small to be worth a
              truck, and returns what is left. Generate it below and watch the After column
              move.
            </p>
          ) : moves.length === 0 ? (
            <p className="mt-3 rounded-lg border border-line bg-surface-2/40 p-4 text-sm text-fg-3">
              Nothing to move. Every store is inside the target band for this product.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {moves.map((m) => (
                <li
                  key={`${m.from}-${m.to}`}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface-2/40 px-3.5 py-3"
                >
                  <span className="min-w-0 flex-1 text-sm text-fg-2">
                    <span className="text-fg">{m.from}</span>
                    <span aria-hidden className="mx-2 text-fg-3">
                      →
                    </span>
                    <span className="text-fg">{m.to}</span>
                  </span>
                  <span className="text-sm font-semibold text-fg tabular-nums">
                    {m.units} <span className="font-mono text-[0.625rem] font-normal text-fg-3">units</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {generated && stillShort.length > 0 && (
            <p className="mt-4 rounded-lg border-l-2 border-[#C87A2F] bg-surface-2/40 py-3 pr-3 pl-3.5 text-xs leading-relaxed text-fg-3">
              Not solvable from stock on hand: after every worthwhile move, the network is still{" "}
              <span className="text-fg-2">{shortfall.toLocaleString("en-US")} units</span> short,
              and {listJoin(stillShort.map((r) => r.store))} stay
              {stillShort.length === 1 ? "s" : ""} well under target. The tool says so rather than
              proposing moves that only spread the shortage around. This is a purchasing
              decision, not a transfer one.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!generated ? (
              <Button onClick={() => setGenerated(true)}>Generate transfer plan</Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setGenerated(false)}
              >
                Clear plan
              </Button>
            )}
          </div>

          {generated && moves.length > 0 && (
            <div className="mt-4 rounded-lg border border-line bg-surface-2/40 p-4">
              <p className="text-sm font-semibold text-fg">
                {moves.length} transfer{moves.length === 1 ? "" : "s"} ·{" "}
                {totalUnits.toLocaleString("en-US")} units
              </p>
              <p className="mt-2 text-xs leading-relaxed text-fg-3">
                In the real tool this is the point where the plan leaves the browser: it becomes a
                document the warehouse works from, without anyone asking the data engineer for a
                report first. That is the whole change this project made.
              </p>
            </div>
          )}
        </div>
      </div>
    </DemoFrame>
  );
}
