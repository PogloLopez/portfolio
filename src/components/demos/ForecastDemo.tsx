"use client";

import { useMemo, useState } from "react";
import { DemoFrame } from "./DemoFrame";
import { LineChart, type Series } from "./LineChart";
import { Segmented } from "./controls";
import { bandFill, seriesColor, status } from "./palette";

/**
 * The forecasting system itself: pick a demand pattern, see the forecast against
 * what actually happened, and see which model won the tournament for that
 * pattern and by how much.
 *
 * This is the architecture made clickable rather than described. The point a
 * reader should leave with is that one model does not fit a grocery catalogue:
 * a tree model is the champion on smooth demand and loses outright on
 * intermittent demand, which is exactly why the pipeline runs a tournament per
 * cluster instead of shipping a single model.
 *
 * Every series and every score here is generated in the browser from a seed.
 * WMAPE is computed from the same numbers the chart draws, so the leaderboard
 * can never disagree with the picture beside it.
 */

type PatternId = "fast" | "seasonal" | "intermittent";
type ModelId = "lgbm" | "croston" | "snaive" | "ets";

type Pattern = {
  id: PatternId;
  label: string;
  example: string;
  cluster: string;
  seriesInCluster: string;
  base: number;
  seasonality: number;
  noise: number;
  /** Fraction of weeks with no sale at all. */
  sparsity: number;
  seed: number;
  /**
   * Target WMAPE per model, in percent. These are set to the band the real
   * pipeline actually reaches (champions land between 18% and 30% WMAPE, so
   * 70% to 82% accuracy depending on the cluster) rather than to whatever a
   * synthetic series would produce on its own.
   */
  target: Record<ModelId, number>;
  why: string;
};

const MODELS: { id: ModelId; name: string; note: string }[] = [
  { id: "lgbm", name: "LightGBM", note: "gradient boosting, per cluster" },
  { id: "croston", name: "Croston / SBA", note: "built for intermittent demand" },
  { id: "snaive", name: "Seasonal naive", note: "the baseline everything must beat" },
  { id: "ets", name: "ETS", note: "exponential smoothing" },
];

const PATTERNS: Pattern[] = [
  {
    id: "fast",
    label: "Fast-moving",
    example: "Household cleaning, sells every day",
    cluster: "Cluster 3",
    seriesInCluster: "~2,400 series",
    base: 420,
    seasonality: 0.12,
    noise: 0.1,
    sparsity: 0,
    seed: 4021,
    target: { lgbm: 21, croston: 48, snaive: 31, ets: 26 },
    why: "Dense history and a stable rhythm is where gradient boosting is strongest. It picks up price, promotion and calendar effects that the smoothing models cannot see.",
  },
  {
    id: "seasonal",
    label: "Seasonal",
    example: "School supplies, one big peak a year",
    cluster: "Cluster 11",
    seriesInCluster: "~600 series",
    base: 260,
    seasonality: 0.85,
    noise: 0.13,
    sparsity: 0,
    seed: 9134,
    target: { lgbm: 24, croston: 55, snaive: 30, ets: 28 },
    why: "The seasonal baseline is genuinely competitive here, which is exactly why it gets scored every run. LightGBM edges it because the peak shifts a little each year and calendar features track the shift.",
  },
  {
    id: "intermittent",
    label: "Intermittent",
    example: "Small appliances, most weeks sell nothing",
    cluster: "Cluster 19",
    seriesInCluster: "~3,100 series",
    base: 9,
    seasonality: 0.05,
    noise: 0.55,
    sparsity: 0.62,
    seed: 5577,
    target: { lgbm: 78, croston: 30, snaive: 52, ets: 44 },
    why: "A tree model trained on a mostly-zero series learns to predict near zero: technically accurate, operationally useless. Croston forecasts the size of a sale and the gap between sales separately, which is what replenishment actually needs.",
  },
];

const HISTORY = 40;
const HORIZON = 12;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(p: Pattern) {
  const rand = mulberry32(p.seed);
  const total = HISTORY + HORIZON;
  const actual: number[] = [];

  for (let i = 0; i < total; i++) {
    const season = 1 + Math.sin((i / 52) * Math.PI * 2 - 1.1) * p.seasonality;
    const shock = 1 + (rand() - 0.5) * 2 * p.noise;
    const dead = p.sparsity > 0 && rand() < p.sparsity;
    actual.push(dead ? 0 : Math.max(0, Math.round(p.base * season * shock)));
  }

  const truthWindow = actual.slice(HISTORY);
  const meanActual = truthWindow.reduce((n, v) => n + v, 0) / truthWindow.length || 1;

  /*
   * Each model forecasts the horizon with an absolute error calibrated to its
   * target WMAPE. Drawing the error as `2 * rand() * target * meanActual` gives
   * a mean absolute error of `target * meanActual`, and WMAPE is mean absolute
   * error over mean actual, so the measured score lands on the target within a
   * point or two of sampling noise. The displayed figure is always the measured
   * one, never the target.
   */
  const forecasts = {} as Record<ModelId, number[]>;
  for (const m of MODELS) {
    const r = mulberry32(p.seed + m.id.length * 977);
    const scale = (p.target[m.id] / 100) * meanActual;
    const out: number[] = [];
    for (let i = HISTORY; i < total; i++) {
      // A tree model on a mostly-zero series collapses toward the mean, which
      // is the failure the intermittent cluster exists to show.
      if (m.id === "lgbm" && p.sparsity > 0.4) {
        out.push(Math.round(meanActual * (0.9 + r() * 0.35)));
        continue;
      }
      const err = (r() < 0.5 ? -1 : 1) * 2 * r() * scale;
      out.push(Math.max(0, Math.round(actual[i] + err)));
    }
    forecasts[m.id] = out;
  }

  const denom = truthWindow.reduce((n, v) => n + Math.abs(v), 0) || 1;
  const scores = MODELS.map((m) => ({
    ...m,
    wmape:
      (forecasts[m.id].reduce((n, v, i) => n + Math.abs(truthWindow[i] - v), 0) / denom) * 100,
  })).sort((a, b) => a.wmape - b.wmape);

  return { actual, forecasts, scores, champion: scores[0].id };
}

const LABELS = (() => {
  const out: string[] = [];
  for (let i = -HISTORY + 1; i <= HORIZON; i++) out.push(i <= 0 ? `w${i}` : `+${i}`);
  return out;
})();

const PIPELINE = [
  { stage: "ERP extract", detail: "sales · stock · master data" },
  { stage: "Bronze", detail: "raw, append-only" },
  { stage: "Silver", detail: "cleaned + calendar features" },
  { stage: "Gold", detail: "training frames per cluster" },
  { stage: "Tournament", detail: "score, promote, log to MLflow" },
  { stage: "Replenishment", detail: "reorder quantities" },
];

export function ForecastDemo() {
  const [patternId, setPatternId] = useState<PatternId>("fast");
  const [selected, setSelected] = useState<ModelId | null>(null);

  const pattern = PATTERNS.find((p) => p.id === patternId)!;
  const data = useMemo(() => build(pattern), [pattern]);

  const shown = selected ?? data.champion;
  const shownScore = data.scores.find((s) => s.id === shown)!;
  const worst = Math.max(...data.scores.map((s) => s.wmape));

  const series: Series[] = [
    { id: "actual", name: "What actually sold", color: seriesColor.primary, values: data.actual },
    {
      id: "forecast",
      name: `${shownScore.name} forecast`,
      color: seriesColor.compare,
      values: [
        ...Array(HISTORY - 1).fill(null),
        data.actual[HISTORY - 1],
        ...data.forecasts[shown],
      ] as (number | null)[],
      dashedFrom: 0,
    },
  ];

  const upper: (number | null)[] = Array(HISTORY).fill(null);
  const lower: (number | null)[] = Array(HISTORY).fill(null);
  data.forecasts[shown].forEach((v, i) => {
    // Sized so coverage lands in the 80s rather than at 100. A band wide
    // enough to never be wrong is a band that says nothing.
    const spread = v * (shownScore.wmape / 100) * 1.25 * (1 + i * 0.04);
    upper.push(Math.round(v + spread));
    lower.push(Math.round(Math.max(0, v - spread)));
  });

  const truth = data.actual.slice(HISTORY);
  const truthSum = truth.reduce((n, v) => n + v, 0) || 1;
  const bias =
    (data.forecasts[shown].reduce((n, v, i) => n + (v - truth[i]), 0) / truthSum) * 100;
  const coverage =
    (truth.filter((v, i) => {
      const hi = upper[HISTORY + i];
      const lo = lower[HISTORY + i];
      return hi != null && lo != null && v <= hi && v >= lo;
    }).length /
      truth.length) *
    100;

  return (
    <DemoFrame
      title="Forecast explorer"
      subtitle="mercaldas-forecast · demo build"
      note="The real pipeline runs this every week over thousands of product and store series across 12+ stores, where the promoted model reaches 70% to 82% accuracy depending on the cluster. The three series here are generated in the browser and every score is measured from the chart beside it, so the figures sit in that same band rather than flattering it."
    >
      <div className="mb-6">
        <p className="mb-3 text-sm font-medium text-fg-2">Pick a demand pattern</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Segmented
            ariaLabel="Demand pattern"
            value={patternId}
            onChange={(v: PatternId) => {
              setPatternId(v);
              setSelected(null);
            }}
            options={PATTERNS.map((p) => ({ value: p.id, label: p.label }))}
          />
          <span className="text-xs text-fg-3">
            {pattern.example} · {pattern.cluster}, {pattern.seriesInCluster}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="min-w-0">
          <LineChart
            xLabels={LABELS}
            series={series}
            band={{ upper, lower, color: bandFill, label: "Prediction interval" }}
            format={(n) => `${Math.round(n)}`}
            divider={{ at: HISTORY - 1, label: "forecast" }}
            height={260}
            caption={`Weekly units for a ${pattern.label.toLowerCase()} series: 40 weeks of history, then the ${shownScore.name} forecast against what actually sold. Synthetic values.`}
          />

          {/* How the selected model is actually judged. Error alone hides a
              model that is consistently high or low, and an interval nobody
              checks is decoration, so bias and coverage sit beside it. */}
          <dl className="mt-6 grid grid-cols-3 gap-6 border-t border-line pt-5">
            {[
              {
                k: "Accuracy",
                v: `${(100 - shownScore.wmape).toFixed(0)}%`,
                d: "100 minus WMAPE over the horizon",
              },
              {
                k: "Bias",
                v: `${bias > 0 ? "+" : ""}${bias.toFixed(1)}%`,
                d: bias > 0 ? "Forecasts high on average" : "Forecasts low on average",
              },
              {
                k: "Coverage",
                v: `${coverage.toFixed(0)}%`,
                d: "Weeks landing inside the interval",
              },
            ].map((m) => (
              <div key={m.k}>
                <dt className="font-mono text-[0.625rem] tracking-[0.12em] text-fg-3 uppercase">
                  {m.k}
                </dt>
                <dd>
                  <span className="mt-1.5 block text-xl font-semibold text-fg">{m.v}</span>
                  <span className="mt-1 block text-xs leading-snug text-fg-3">{m.d}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <p className="text-sm font-medium text-fg-2">
            Model tournament{" "}
            <span className="font-normal text-fg-3">click one to plot it</span>
          </p>

          <ul className="mt-4 space-y-2">
            {data.scores.map((m) => {
              const isChampion = m.id === data.champion;
              const isShown = m.id === shown;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(m.id)}
                    aria-pressed={isShown}
                    className={`w-full rounded-lg border px-3.5 py-3 text-left transition-colors ${
                      isShown
                        ? "border-iris bg-iris/14"
                        : "border-line-strong bg-surface-2/50 hover:border-iris/60 hover:bg-iris/6"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-fg">{m.name}</span>
                        {isChampion && (
                          <span
                            className="rounded-sm px-1.5 py-0.5 font-mono text-[0.5625rem] tracking-wider uppercase"
                            style={{
                              color: status.good,
                              backgroundColor: "rgba(25,158,112,0.16)",
                            }}
                          >
                            champion
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-sm font-semibold text-fg tabular-nums">
                        {m.wmape.toFixed(1)}%
                      </span>
                    </span>

                    <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(m.wmape / worst) * 100}%`,
                          backgroundColor: isChampion ? status.good : "rgba(255,255,255,0.3)",
                        }}
                      />
                    </span>

                    <span className="mt-2 flex items-baseline justify-between gap-3">
                      <span className="text-xs text-fg-3">{m.note}</span>
                      <span className="font-mono text-[0.625rem] text-fg-3">WMAPE</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 rounded-lg border-l-2 border-iris bg-surface-2/40 py-3 pr-3 pl-4">
            <p className="text-xs leading-relaxed text-fg-2">
              <span className="font-semibold text-fg">Why {data.scores[0].name} wins here. </span>
              {pattern.why}
            </p>
          </div>
        </div>
      </div>

      {/* The path every one of these series takes, so the architecture is
          visible rather than only described. */}
      <div className="mt-8 border-t border-line pt-6">
        <p className="mb-4 text-sm font-medium text-fg-2">How that forecast is produced</p>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {PIPELINE.map((s, i) => (
            <li
              key={s.stage}
              className="relative rounded-lg border border-line bg-surface-2/50 px-3 py-2.5"
            >
              <span className="block font-mono text-[0.5625rem] text-fg-3">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mt-1 block text-xs font-semibold text-fg">{s.stage}</span>
              <span className="mt-0.5 block font-mono text-[0.625rem] leading-snug text-fg-3">
                {s.detail}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-fg-3">
          Orchestrated weekly in Dagster. Every run scores all four models on held-out weeks and
          promotes the winner per cluster, so the choice stays measured rather than assumed.
        </p>
      </div>
    </DemoFrame>
  );
}
