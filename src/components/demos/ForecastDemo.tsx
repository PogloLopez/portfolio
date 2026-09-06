"use client";

import { useMemo, useState } from "react";
import { DemoFrame } from "./DemoFrame";
import { LineChart, type Series } from "./LineChart";
import { Button, ControlRow } from "./controls";
import { seriesColor, status } from "./palette";

/**
 * The horizon-degradation story from the forecast case study, made playable.
 *
 * The point is not the forecast chart — it is that the run status stays clean
 * the whole way down. A visitor advances the clock, watches every asset report
 * success, and watches the independently measured usable horizon shrink
 * underneath. Enforcing the dependency is the fix, and it makes the weekly job
 * fail loudly instead.
 *
 * Synthetic throughout: no Mercaldas data, no real run history.
 */

const HEALTHY_HORIZON = 12;
const MAX_WEEK = 9;

type Asset = {
  name: string;
  schedule: string;
  state: (week: number, enforced: boolean) => { label: string; tone: "ok" | "idle" | "blocked" };
};

const ASSETS: Asset[] = [
  {
    name: "ingest_erp_daily",
    schedule: "daily",
    state: (week) =>
      week === 0
        ? { label: "Materialised 6h ago", tone: "ok" }
        : { label: `Last materialised ${week}w ago`, tone: "idle" },
  },
  {
    name: "build_features",
    schedule: "weekly",
    state: () => ({ label: "Succeeded", tone: "ok" }),
  },
  {
    name: "forecast_weekly",
    schedule: "weekly",
    state: (week, enforced) =>
      enforced && week > 0
        ? { label: "Blocked, upstream stale", tone: "blocked" }
        : { label: "Succeeded", tone: "ok" },
  },
];

const toneStyles = {
  ok: { color: status.good, dot: status.good, text: "text-fg-2" },
  idle: { color: "var(--color-fg-3)", dot: "rgba(255,255,255,0.28)", text: "text-fg-3" },
  blocked: { color: status.bad, dot: status.bad, text: "text-fg-2" },
} as const;

function horizonFor(week: number) {
  return Math.max(2, HEALTHY_HORIZON - week);
}

export function ForecastDemo() {
  const [week, setWeek] = useState(0);
  const [enforced, setEnforced] = useState(false);

  const effectiveWeek = enforced ? 0 : week;
  const horizon = horizonFor(effectiveWeek);

  const { labels, series } = useMemo(() => {
    const labels: string[] = [];
    const measured: (number | null)[] = [];
    const target: (number | null)[] = [];
    for (let i = 0; i <= MAX_WEEK; i++) {
      labels.push(i === 0 ? "w0" : `w+${i}`);
      measured.push(i <= effectiveWeek ? horizonFor(i) : null);
      target.push(HEALTHY_HORIZON);
    }
    const s: Series[] = [
      {
        id: "measured",
        name: "Usable horizon (audit)",
        color: seriesColor.primary,
        values: measured,
      },
      {
        id: "target",
        name: "Expected horizon",
        color: seriesColor.compare,
        values: target,
        dashedFrom: 0,
      },
    ];
    return { labels, series: s };
  }, [effectiveWeek]);

  const verdict = enforced
    ? {
        tone: status.good,
        title: "The dependency is enforced",
        body: "The weekly forecast now refuses to run on stale upstream data. The failure is loud, it happens on the first missed ingest, and the horizon never silently degrades again. This is the fix that shipped.",
      }
    : effectiveWeek === 0
      ? {
          tone: status.good,
          title: "Everything is healthy",
          body: "Ingest ran this morning, the forecast ran on schedule, and the audit measures the full horizon. Advance the clock to see what happens when the daily ingest quietly stops.",
        }
      : effectiveWeek < 4
        ? {
            tone: status.warn,
            title: "Zero failures. Horizon already falling.",
            body: `The daily ingest has not run for ${effectiveWeek} week${effectiveWeek > 1 ? "s" : ""}. Nothing failed. The weekly job declared a dependency on the ingested data but does not require it to have materialised, so it happily forecasts from what is already in the lake.`,
          }
        : {
            tone: status.bad,
            title: "Still zero failures.",
            body: `${effectiveWeek} weeks of stale input. Every asset in the run reports success and the dashboard is green, while the forecast reaching replenishment is down to ${horizon} weeks of real horizon. This is the state the audit was built to catch, and did.`,
          };

  return (
    <DemoFrame
      title="Pipeline health, the horizon audit"
      subtitle="mercaldas-forecast · demo build"
      note="The real pipeline forecasts thousands of product×store series weekly on Dagster. This reproduces one thing from it: the shape of the silent failure an audit caught in production. Run history, asset names and figures here are invented."
    >
      <ControlRow>
        <Button onClick={() => setWeek((w) => Math.min(MAX_WEEK, w + 1))} disabled={enforced || week >= MAX_WEEK}>
          Advance one week
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setEnforced(false);
            setWeek(0);
          }}
        >
          Reset
        </Button>
        <Button variant="ghost" onClick={() => setEnforced(true)} disabled={enforced}>
          Enforce the dependency
        </Button>
        <span className="font-mono text-xs text-fg-3">
          {enforced ? "fix applied" : `week ${week} of ${MAX_WEEK}`}
        </span>
      </ControlRow>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface-2/40 p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-fg-3 uppercase">
              Dagster run status
            </p>
            <p className="font-mono text-xs" style={{ color: enforced && week > 0 ? status.bad : status.good }}>
              {enforced && effectiveWeek > 0 ? "1 blocked" : "0 failures"}
            </p>
          </div>

          <ul className="mt-4 space-y-3">
            {ASSETS.map((a) => {
              const s = a.state(enforced ? week : week, enforced);
              const t = toneStyles[s.tone];
              return (
                <li key={a.name} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: t.dot }}
                    />
                    <span className="truncate font-mono text-xs text-fg-2">{a.name}</span>
                    <span className="shrink-0 font-mono text-[0.625rem] text-fg-3">
                      {a.schedule}
                    </span>
                  </span>
                  <span className={`shrink-0 text-xs ${t.text}`} style={{ color: t.color }}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-fg-3">
            Nothing here is red. That is the whole problem: a job that never runs cannot fail, and
            a job that does not truly depend on it cannot notice.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface-2/40 p-4 sm:p-5">
          <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-fg-3 uppercase">
            Independent horizon audit
          </p>

          <p className="mt-4 text-4xl font-semibold text-fg">
            {horizon}
            <span className="ml-2 text-base font-normal text-fg-3">
              of {HEALTHY_HORIZON} weeks usable
            </span>
          </p>

          <div
            className="mt-4 h-2 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "rgba(100,128,240,0.16)" }}
            role="meter"
            aria-valuenow={horizon}
            aria-valuemin={0}
            aria-valuemax={HEALTHY_HORIZON}
            aria-label="Usable forecast horizon"
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(horizon / HEALTHY_HORIZON) * 100}%`,
                backgroundColor: verdict.tone,
              }}
            />
          </div>

          <p className="mt-5 text-sm font-semibold" style={{ color: verdict.tone }}>
            {verdict.title}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-fg-3">{verdict.body}</p>
        </div>
      </div>

      <div className="mt-7">
        <LineChart
          xLabels={labels}
          series={series}
          format={(n) => `${n} wk`}
          height={200}
          caption="Weeks of usable forecast horizon measured by the audit, against the horizon the pipeline is expected to deliver. Synthetic values."
        />
      </div>
    </DemoFrame>
  );
}
