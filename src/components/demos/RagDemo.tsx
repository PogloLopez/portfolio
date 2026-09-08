"use client";

import { useEffect, useRef, useState } from "react";
import { DemoFrame } from "./DemoFrame";
import { accent, status } from "./palette";

/**
 * The data assistant, reduced to the part that matters: which path answered,
 * what SQL ran, and the fact that every figure in the reply came out of that
 * query rather than out of the model.
 *
 * The three questions and their answers are fixed. The SQL shown is
 * representative and runs against nothing.
 */

type Path = "certified" | "dynamic";

type Exchange = {
  id: string;
  question: string;
  path: Path;
  /** Steps the dynamic path runs before the query is allowed near real data. */
  checks?: string[];
  sql: string;
  answer: string;
  figures: number;
  modelCalls: number;
};

const EXCHANGES: Exchange[] = [
  {
    id: "cleaning",
    question: "How did household cleaning do last month?",
    path: "certified",
    sql: `-- recipe: category_month_performance (reviewed, versioned)
SELECT  c.category_name,
        SUM(f.net_sales)        AS net_sales,
        SUM(f.units)            AS units,
        SUM(f.net_sales) / NULLIF(SUM(fp.net_sales), 0) - 1 AS yoy
FROM    fact_sales        f
JOIN    dim_category      c  ON c.category_key = f.category_key
LEFT JOIN fact_sales      fp ON fp.category_key = f.category_key
                            AND fp.period_key  = :prior_year_period
WHERE   c.category_name = :category
  AND   f.period_key    = :period
GROUP BY c.category_name;`,
    answer:
      "Household cleaning closed last month at 412.8M in net sales across 96,140 units, up 7.4% against the same month last year. Units grew faster than value (+9.1%), so the average selling price came down about 1.6%.",
    figures: 5,
    modelCalls: 0,
  },
  {
    id: "cover",
    question: "Which stores are carrying more than 60 days of beverage stock?",
    path: "dynamic",
    checks: [
      "Lexical validation: read-only, no DDL, no cross-schema reference",
      "Dry run against the query planner: 1 table scan, 4.2k rows estimated",
      "Row cap applied: LIMIT 50",
    ],
    sql: `-- written by the model, validated and dry-run before execution
SELECT  s.store_name,
        SUM(i.on_hand_units)                                   AS on_hand,
        SUM(i.on_hand_units) / NULLIF(AVG(d.daily_units), 0)   AS days_cover
FROM    fact_inventory  i
JOIN    dim_store       s ON s.store_key    = i.store_key
JOIN    dim_category    c ON c.category_key = i.category_key
JOIN    agg_daily_sales d ON d.store_key    = i.store_key
                         AND d.category_key = i.category_key
WHERE   c.category_name = 'Bebidas'
  AND   i.snapshot_date = CURRENT_DATE
GROUP BY s.store_name
HAVING  SUM(i.on_hand_units) / NULLIF(AVG(d.daily_units), 0) > 60
ORDER BY days_cover DESC
LIMIT 50;`,
    answer:
      "Four stores are over 60 days of cover in beverages: Centro at 94 days, Palermo at 81, La Enea at 73 and Versalles at 64. Together they hold 38,600 units against a chain-wide norm of about 34 days.",
    figures: 8,
    modelCalls: 1,
  },
  {
    id: "margin",
    question: "What was the margin on rice in July?",
    path: "certified",
    sql: `-- recipe: product_margin_period (reviewed, versioned)
SELECT  p.product_name,
        SUM(f.net_sales)                              AS net_sales,
        SUM(f.net_sales - f.cogs)                     AS gross_margin,
        (SUM(f.net_sales - f.cogs) / NULLIF(SUM(f.net_sales), 0)) AS margin_pct
FROM    fact_sales   f
JOIN    dim_product  p ON p.product_key = f.product_key
WHERE   p.product_group = :group
  AND   f.period_key    = :period
GROUP BY p.product_name
ORDER BY net_sales DESC;`,
    answer:
      "Rice returned a 14.2% gross margin in July on 289.4M of net sales. That is 1.1 points below June and roughly in line with July of last year, so the dip is seasonal rather than a pricing change.",
    figures: 3,
    modelCalls: 0,
  },
];

type Stage = "asking" | "routing" | "checking" | "querying" | "done";

const pathMeta = {
  certified: {
    label: "Certified path",
    note: "closed SQL recipe · deterministic composer",
    color: status.good,
  },
  dynamic: {
    label: "Dynamic path",
    note: "model-written SQL · validated before execution",
    color: "#A78BFA",
  },
} as const;

export function RagDemo() {
  const [current, setCurrent] = useState<Exchange | null>(null);
  const [stage, setStage] = useState<Stage>("done");
  const [asked, setAsked] = useState<string[]>([]);
  const [showSql, setShowSql] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const ask = (ex: Exchange) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setCurrent(ex);
    setShowSql(false);
    setAsked((a) => (a.includes(ex.id) ? a : [...a, ex.id]));

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setStage("done");
      return;
    }

    setStage("asking");
    const steps: [Stage, number][] =
      ex.path === "dynamic"
        ? [
            ["routing", 500],
            ["checking", 1250],
            ["querying", 2350],
            ["done", 3100],
          ]
        : [
            ["routing", 450],
            ["querying", 1050],
            ["done", 1750],
          ];
    for (const [s, delay] of steps) {
      timers.current.push(setTimeout(() => setStage(s), delay));
    }
  };

  const meta = current ? pathMeta[current.path] : null;
  const reached = (s: Stage) => {
    const order: Stage[] = ["asking", "routing", "checking", "querying", "done"];
    return current ? order.indexOf(stage) >= order.indexOf(s) : false;
  };

  const totals = EXCHANGES.filter((e) => asked.includes(e.id));
  const modelCalls = totals.reduce((n, e) => n + e.modelCalls, 0);
  const figures = totals.reduce((n, e) => n + e.figures, 0);

  return (
    <DemoFrame
      title="Ask the data assistant"
      subtitle="mercaldas-rag · demo build"
      note="The real assistant runs over Telegram against a documented data warehouse. Here the three questions, the SQL and the answers are fixed and nothing is executed, but the routing, the validation steps and the counter below reproduce how the real one behaves."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_17rem]">
        <div className="min-w-0">
          <p
            className="font-mono text-[0.6875rem] tracking-[0.14em] uppercase"
            style={accent.fg}
          >
            Pick a question
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {EXCHANGES.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => ask(ex)}
                  style={accent.chip(current?.id === ex.id ? 18 : 6, current?.id === ex.id ? 100 : 40)}
                  className="rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-all hover:-translate-y-px hover:brightness-125"
                >
                  {ex.question}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 min-h-44 rounded-lg border border-line bg-surface-2/40 p-4 sm:p-5">
            {!current && (
              <p className="text-sm leading-relaxed text-fg-3">
                Choose one of the three questions above. The assistant will show which of its two
                paths handled it, what SQL ran, and how many figures in the reply came from that
                query.
              </p>
            )}

            {current && (
              <div className="space-y-4">
                <p style={accent.bg(15)}
                  className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-fg">
                  {current.question}
                </p>

                {reached("routing") && meta && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[0.6875rem] uppercase"
                      style={{ borderColor: `${meta.color}66`, color: meta.color }}
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </span>
                    <span className="font-mono text-[0.6875rem] text-fg-3">{meta.note}</span>
                  </div>
                )}

                {current.checks && reached("checking") && (
                  <ul className="space-y-1.5 border-l border-line pl-4">
                    {current.checks.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-xs text-fg-3">
                        <span aria-hidden style={{ color: status.good }}>
                          ✓
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                )}

                {reached("querying") && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowSql((v) => !v)}
                      className="inline-flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.1em] text-fg-3 uppercase transition-all hover:brightness-150"
                    >
                      <svg
                        aria-hidden
                        viewBox="0 0 12 12"
                        className={`h-3 w-3 transition-transform ${showSql ? "rotate-90" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                        strokeLinecap="round"
                      >
                        <path d="M4.5 2.5 8 6l-3.5 3.5" />
                      </svg>
                      {showSql ? "Hide the query" : "Show the query that ran"}
                    </button>
                    {showSql && (
                      <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-line bg-ground p-3.5 font-mono text-[0.6875rem] leading-relaxed text-fg-2">
                        {current.sql}
                      </pre>
                    )}
                  </div>
                )}

                {stage === "done" ? (
                  <div>
                    <p className="w-fit max-w-[92%] rounded-2xl rounded-bl-sm bg-surface px-4 py-3 text-sm leading-relaxed text-fg-2">
                      {current.answer}
                    </p>
                    <p className="mt-2.5 font-mono text-[0.6875rem] text-fg-3">
                      {current.figures} figures · all from the query above · {current.modelCalls}{" "}
                      model call{current.modelCalls === 1 ? "" : "s"}
                    </p>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-fg-3">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet" />
                    {stage === "asking" && "Reading the question…"}
                    {stage === "routing" && "Routing…"}
                    {stage === "checking" && "Validating the generated SQL…"}
                    {stage === "querying" && "Running the query…"}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-lg border border-line bg-surface-2/30 px-4 py-3">
            <input
              type="text"
              disabled
              placeholder="Free-text questions are disabled in this demo"
              className="min-w-0 flex-1 bg-transparent text-sm text-fg-2 placeholder:text-fg-3 disabled:cursor-not-allowed"
              aria-label="Message (disabled in this demo)"
            />
            <span className="font-mono text-[0.625rem] text-fg-3">demo</span>
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-surface-2/40 p-4 sm:p-5">
          <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-fg-3 uppercase">
            This session
          </p>

          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-xs text-fg-3">Figures shown</dt>
              <dd className="mt-1 text-2xl font-semibold text-fg">{figures}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-3">Figures written by the model</dt>
              <dd className="mt-1 text-2xl font-semibold" style={{ color: status.good }}>
                0
              </dd>
            </div>
            <div>
              <dt className="text-xs text-fg-3">Paid model calls</dt>
              <dd className="mt-1 text-2xl font-semibold text-fg">{modelCalls}</dd>
            </div>
          </dl>

          <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-fg-3">
            The certified path spends nothing: the recipe and the composer are code. Only the
            dynamic path calls a model, and it does so through the one entry point a test keeps
            unique.
          </p>
        </aside>
      </div>
    </DemoFrame>
  );
}
