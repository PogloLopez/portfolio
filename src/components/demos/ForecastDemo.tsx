"use client";

import { useMemo, useState } from "react";
import { DemoFrame } from "./DemoFrame";
import { LineChart, type Series } from "./LineChart";
import { Button } from "./controls";
import { seriesColor, status } from "./palette";

/**
 * The horizon-degradation story from the forecast case study, made playable.
 *
 * It has to explain itself with no prose beside it, so the framing lives inside
 * the demo: a one-line scenario, one obvious button, and two panels labelled
 * "what the team saw" against "what was actually true". The contrast between
 * those two is the whole point, so they are named for the reader rather than
 * for the tools involved.
 *
 * Synthetic throughout: no Mercaldas data, no real run history.
 */

const HEALTHY_HORIZON = 12;
const MAX_WEEK = 8;

type Job = {
  name: string;
  plain: string;
  state: (week: number, fixed: boolean) => { label: string; tone: "ok" | "idle" | "blocked" };
};

const JOBS: Job[] = [
  {
    name: "Daily data load",
    plain: "Pulls yesterday's sales from the ERP",
    state: (week) =>
      week === 0
        ? { label: "Ran today", tone: "ok" }
        : { label: `Last ran ${week}w ago`, tone: "idle" },
  },
  {
    name: "Feature build",
    plain: "Prepares the inputs the model needs",
    state: () => ({ label: "Success", tone: "ok" }),
  },
  {
    name: "Weekly forecast",
    plain: "Produces the numbers stores reorder from",
    state: (week, fixed) =>
      fixed && week > 0
        ? { label: "Stopped on purpose", tone: "blocked" }
        : { label: "Success", tone: "ok" },
  },
];

const toneStyles = {
  ok: { color: status.good, dot: status.good },
  idle: { color: "var(--color-fg-3)", dot: "rgba(255,255,255,0.3)" },
  blocked: { color: status.bad, dot: status.bad },
} as const;

const horizonFor = (week: number) => Math.max(2, HEALTHY_HORIZON - week);

export function ForecastDemo() {
  const [week, setWeek] = useState(0);
  const [fixed, setFixed] = useState(false);

  const shown = fixed ? 0 : week;
  const horizon = horizonFor(shown);
  const pct = Math.round((horizon / HEALTHY_HORIZON) * 100);

  const { labels, series } = useMemo(() => {
    const labels: string[] = [];
    const measured: (number | null)[] = [];
    const expected: (number | null)[] = [];
    for (let i = 0; i <= MAX_WEEK; i++) {
      labels.push(i === 0 ? "now" : `+${i}w`);
      measured.push(i <= shown ? horizonFor(i) : null);
      expected.push(HEALTHY_HORIZON);
    }
    const s: Series[] = [
      { id: "measured", name: "Actually usable", color: seriesColor.primary, values: measured },
      {
        id: "expected",
        name: "What it should be",
        color: seriesColor.compare,
        values: expected,
        dashedFrom: 0,
      },
    ];
    return { labels, series: s };
  }, [shown]);

  const verdict = fixed
    ? {
        tone: status.good,
        head: "Fixed. Now it fails loudly.",
        body: "The forecast job refuses to run on stale data. Someone finds out the same day instead of two months later. This is the change that shipped.",
      }
    : shown === 0
      ? {
          tone: status.good,
          head: "Everything is healthy.",
          body: "Fresh data this morning, a full 12 week forecast going out to the stores. Press the button and let the weeks pass.",
        }
      : shown < 4
        ? {
            tone: status.warn,
            head: `${shown} week${shown > 1 ? "s" : ""} in. Still no alarm.`,
            body: "The data feed stopped, but the forecast job never depended on it strictly enough to notice. It keeps running on older and older data, and keeps reporting success.",
          }
        : {
            tone: status.bad,
            head: `${shown} weeks in. Still no alarm.`,
            body: `The dashboard is entirely green while the stores reorder from a forecast that can only see ${horizon} weeks ahead instead of ${HEALTHY_HORIZON}. Nothing in the monitoring would ever have caught this.`,
          };

  return (
    <DemoFrame
      title="What a silent failure looks like"
      subtitle="mercaldas-forecast · demo build"
      note="A reconstruction of a real failure I found in my own pipeline, and the fix for it. Run history and figures are invented."
    >
      {/* The scenario, stated before anything else. */}
      <div className="mb-6 rounded-lg border border-line bg-surface-2/50 p-4 sm:p-5">
        <p className="text-[0.9375rem] leading-relaxed text-fg-2">
          <span className="font-semibold text-fg">The setup.</span> Stores reorder their stock from
          a forecast that runs every week. One day the job that loads fresh sales data stops
          running, and nothing errors out.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setWeek((w) => Math.min(MAX_WEEK, w + 1))}
            disabled={fixed || week >= MAX_WEEK}
          >
            {week === 0 ? "Let a week pass" : "Let another week pass"}
          </Button>
          {(week > 0 || fixed) && (
            <Button
              variant="ghost"
              onClick={() => {
                setFixed(true);
                setWeek(0);
              }}
              disabled={fixed}
            >
              Show me the fix
            </Button>
          )}
          {(week > 0 || fixed) && (
            <Button
              variant="danger"
              onClick={() => {
                setFixed(false);
                setWeek(0);
              }}
            >
              Start over
            </Button>
          )}
          <span className="font-mono text-xs text-fg-3">
            {fixed ? "after the fix" : `week ${week} of ${MAX_WEEK}`}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Panel A: what the team saw. */}
        <div className="rounded-lg border border-line bg-surface-2/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-fg">What the team saw</p>
          <p className="mt-1 text-xs text-fg-3">The monitoring dashboard, every morning</p>

          <ul className="mt-5 space-y-4">
            {JOBS.map((j) => {
              const s = j.state(week, fixed);
              const t = toneStyles[s.tone];
              return (
                <li key={j.name} className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: t.dot }}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm text-fg-2">{j.name}</span>
                      <span className="block text-xs text-fg-3">{j.plain}</span>
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-xs font-medium" style={{ color: t.color }}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>

          <p
            className="mt-5 border-t border-line pt-4 text-sm font-semibold"
            style={{ color: fixed && week > 0 ? status.bad : status.good }}
          >
            {fixed && shown > 0 ? "1 job stopped" : "0 failures"}
          </p>
        </div>

        {/* Panel B: what was actually true. */}
        <div className="rounded-lg border border-line bg-surface-2/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-fg">What was actually true</p>
          <p className="mt-1 text-xs text-fg-3">Forecast quality, measured separately</p>

          <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-4xl font-semibold text-fg">{horizon}</span>
            <span className="text-base text-fg-3">of {HEALTHY_HORIZON} weeks still usable</span>
          </p>

          <div
            className="mt-4 h-2.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "rgba(100,128,240,0.16)" }}
            role="meter"
            aria-valuenow={horizon}
            aria-valuemin={0}
            aria-valuemax={HEALTHY_HORIZON}
            aria-label="Weeks of usable forecast"
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: verdict.tone }}
            />
          </div>

          <p className="mt-5 text-sm font-semibold" style={{ color: verdict.tone }}>
            {verdict.head}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-fg-3">{verdict.body}</p>
        </div>
      </div>

      <div className="mt-7">
        <LineChart
          xLabels={labels}
          series={series}
          format={(n) => `${n} wk`}
          height={190}
          caption="Weeks of usable forecast measured independently, against the twelve the pipeline is supposed to deliver. Synthetic values."
        />
      </div>
    </DemoFrame>
  );
}
