"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DemoFrame } from "./DemoFrame";
import { LineChart, type Series } from "./LineChart";
import { Button, ControlRow, Field, Select, Toggle } from "./controls";
import { bandFill, seriesColor } from "./palette";

/**
 * A miniature of the price intelligence platform: pick a product, optionally
 * compare against an internal price, and have the model write the reading of
 * the series.
 *
 * Every number is generated below from a seeded function. No production data,
 * no real DANE series, no real internal prices — the shapes are plausible and
 * the values are invented.
 *
 * The written reading is a template filled from the series that was actually
 * generated, never a fixed paragraph. That is deliberate: a canned narrative
 * drifts out of step with the chart beside it the moment the data changes, and
 * a demo whose prose contradicts its own numbers is worse than no demo.
 */

type ProductId = "potato" | "rice" | "onion";

type Facts = {
  last: number;
  changeQuarter: number;
  changeSemester: number;
  rangePosition: number;
  biggestWeeklyMove: number;
  intervalWidthEnd: number;
  forecastEnd: number;
};

type Product = {
  id: ProductId;
  name: string;
  unit: string;
  base: number;
  volatility: number;
  seasonality: number;
  drift: number;
  seed: number;
  reading: (f: Facts) => string[];
};

const pct = (n: number, digits = 1) => `${Math.abs(n).toFixed(digits)}%`;
const dir = (n: number) => (n >= 0 ? "up" : "down");

const PRODUCTS: Product[] = [
  {
    id: "potato",
    name: "Papa parda pastusa",
    unit: "COP / kg",
    base: 2180,
    volatility: 0.085,
    seasonality: 0.16,
    drift: 0.0012,
    seed: 20260906,
    reading: (f) => [
      `The series is ${dir(f.changeSemester)} ${pct(f.changeSemester)} over six months and ${dir(
        f.changeQuarter,
      )} ${pct(f.changeQuarter)} over the last quarter, and it currently sits in the ${
        f.rangePosition > 66 ? "upper" : f.rangePosition > 33 ? "middle" : "lower"
      } third of its twelve-month range.`,
      `The seasonal shape is intact — this product moves with the gap between harvests, and the swing between its low and high weeks is the dominant signal in the series. Week-to-week noise stays moderate: the largest single move in the period is ${pct(
        f.biggestWeeklyMove,
      )}.`,
      `The forecast ends the horizon near ${f.forecastEnd.toLocaleString(
        "en-US",
      )} COP/kg, but the interval at that point spans about ${pct(
        f.intervalWidthEnd,
        0,
      )} of the level. Past roughly week twenty this is a direction, not a number.`,
    ],
  },
  {
    id: "rice",
    name: "Arroz de molino",
    unit: "COP / kg",
    base: 3620,
    volatility: 0.022,
    seasonality: 0.03,
    drift: 0.0018,
    seed: 771402,
    reading: (f) => [
      `One of the calmest series in the catalogue. The largest weekly move in the whole period is ${pct(
        f.biggestWeeklyMove,
      )}, and the six-month change is ${dir(f.changeSemester)} ${pct(f.changeSemester)} — a trend rather than a shock.`,
      `The internal price tracks the market closely and sits slightly under it for most of the period, which is the expected shape for a product bought on standing agreements rather than negotiated week by week. Turn the comparison on to see it.`,
      `Because the variance is low the interval stays tight — around ${pct(
        f.intervalWidthEnd,
        0,
      )} of the level at the end of the horizon. This is a series where a 52-week projection is worth planning against.`,
    ],
  },
  {
    id: "onion",
    name: "Cebolla junca",
    unit: "COP / kg",
    base: 2760,
    volatility: 0.15,
    seasonality: 0.24,
    drift: -0.0004,
    seed: 33915,
    reading: (f) => [
      `The most volatile series shown here. The largest single weekly move is ${pct(
        f.biggestWeeklyMove,
      )}, and moves of that order recur — the amplitude, not the direction, is what matters for this product.`,
      `Over six months the level is ${dir(f.changeSemester)} ${pct(
        f.changeSemester,
      )}, which for this series is inside the noise rather than a trend. Anyone reading a direction into it is reading the last spike.`,
      `The interval reaches roughly ${pct(
        f.intervalWidthEnd,
        0,
      )} of the level by the end of the horizon, and that width is the honest output. A tight point forecast here would be more precise than the data supports.`,
    ],
  },
];

const HISTORY = 52;
const HORIZON = 26;

/** Deterministic PRNG so the same product always renders the same series. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSeries(p: Product) {
  const rand = mulberry32(p.seed);
  const market: number[] = [];
  let level = p.base;

  for (let i = 0; i < HISTORY; i++) {
    const season = Math.sin((i / 52) * Math.PI * 2 - 0.8) * p.seasonality;
    const shock = (rand() - 0.5) * 2 * p.volatility;
    level = level * (1 + p.drift) + p.base * (shock * 0.35);
    market.push(Math.round(p.base * (1 + season) * 0.55 + level * 0.45));
  }

  const last = market[HISTORY - 1];
  const slope = (market[HISTORY - 1] - market[HISTORY - 9]) / 8;
  const forecast: number[] = [];
  for (let i = 1; i <= HORIZON; i++) {
    const damp = Math.exp(-i / 14);
    const season = Math.sin(((HISTORY + i) / 52) * Math.PI * 2 - 0.8) * p.seasonality;
    forecast.push(Math.round(last + slope * i * damp + p.base * season * 0.35));
  }

  // Interval widens with the square root of the horizon, scaled by the series'
  // own volatility — the shape a real interval has, not a fixed percentage.
  const upper: (number | null)[] = Array(HISTORY - 1).fill(null);
  const lower: (number | null)[] = Array(HISTORY - 1).fill(null);
  upper.push(last);
  lower.push(last);
  forecast.forEach((v, i) => {
    const spread = p.base * p.volatility * Math.sqrt(i + 1) * 0.42;
    upper.push(Math.round(v + spread));
    lower.push(Math.round(Math.max(v * 0.35, v - spread)));
  });

  const internalRand = mulberry32(p.seed + 7);
  const internal = market.map((v) => Math.round(v * (0.93 + internalRand() * 0.06)));

  const min = Math.min(...market);
  const max = Math.max(...market);
  let biggest = 0;
  for (let i = 1; i < HISTORY; i++) {
    const move = Math.abs(market[i] / market[i - 1] - 1) * 100;
    if (move > biggest) biggest = move;
  }

  const facts: Facts = {
    last,
    changeQuarter: (last / market[HISTORY - 14] - 1) * 100,
    changeSemester: (last / market[HISTORY - 27] - 1) * 100,
    rangePosition: ((last - min) / (max - min)) * 100,
    biggestWeeklyMove: biggest,
    forecastEnd: forecast[HORIZON - 1],
    intervalWidthEnd:
      (((upper.at(-1) as number) - (lower.at(-1) as number)) / forecast[HORIZON - 1]) * 100,
  };

  return {
    market: [...market, ...Array(HORIZON).fill(null)] as (number | null)[],
    projected: [
      ...Array(HISTORY - 1).fill(null),
      market[HISTORY - 1],
      ...forecast,
    ] as (number | null)[],
    internal: [...internal, ...Array(HORIZON).fill(null)] as (number | null)[],
    upper,
    lower,
    facts,
  };
}

const cop = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const WEEK_LABELS = (() => {
  const out: string[] = [];
  for (let i = -HISTORY + 1; i <= HORIZON; i++) out.push(i <= 0 ? `w${i}` : `+${i}`);
  return out;
})();

export function MarketPricesDemo() {
  const [productId, setProductId] = useState<ProductId>("potato");
  const [compare, setCompare] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [generating, setGenerating] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const product = PRODUCTS.find((p) => p.id === productId)!;
  const data = useMemo(() => buildSeries(product), [product]);
  const paragraphs = useMemo(() => product.reading(data.facts), [product, data.facts]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /**
   * Switching product invalidates the reading, exactly as a payload-hash cache
   * key would. Done here rather than in an effect so the reset is part of the
   * event that caused it.
   */
  const changeProduct = (id: ProductId) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setProductId(id);
    setRevealed(0);
    setGenerating(false);
  };

  const generate = () => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setRevealed(paragraphs.length);
      return;
    }

    timers.current.forEach(clearTimeout);
    timers.current = [];
    setGenerating(true);
    setRevealed(0);
    paragraphs.forEach((_, i) => {
      timers.current.push(
        setTimeout(
          () => {
            setRevealed(i + 1);
            if (i === paragraphs.length - 1) setGenerating(false);
          },
          550 + i * 900,
        ),
      );
    });
  };

  const series: Series[] = [
    {
      id: "market",
      name: "Market price (DANE)",
      color: seriesColor.primary,
      values: data.market,
    },
    {
      id: "forecast",
      name: "Forecast",
      color: seriesColor.primary,
      values: data.projected,
      dashedFrom: 0,
    },
  ];

  if (compare) {
    series.push({
      id: "internal",
      name: "Internal price",
      color: seriesColor.compare,
      values: data.internal,
    });
  }

  const f = data.facts;

  return (
    <DemoFrame
      title="Market price intelligence"
      subtitle="mercaldas-precios-mercado · demo build"
      note="The real platform covers hundreds of products with several years of history and caches each written reading by payload hash. This miniature carries three invented series; nothing here comes from DANE or from Mercaldas."
    >
      <ControlRow>
        <Field label="Product">
          <Select
            value={productId}
            onChange={changeProduct}
            options={PRODUCTS.map((p) => ({ value: p.id, label: p.name }))}
          />
        </Field>
        <Toggle checked={compare} onChange={setCompare} label="Compare internal price" />
      </ControlRow>

      <ul className="mb-7 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <li>
          <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-fg-3 uppercase">
            Latest
          </p>
          <p className="mt-1.5 text-xl font-semibold text-fg">{cop(f.last)}</p>
          <p className="mt-0.5 text-xs text-fg-3">{product.unit}</p>
        </li>
        <li>
          <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-fg-3 uppercase">
            26 weeks
          </p>
          <p className="mt-1.5 text-xl font-semibold text-fg">
            {f.changeSemester >= 0 ? "+" : "−"}
            {Math.abs(f.changeSemester).toFixed(1)}%
          </p>
          <p className="mt-0.5 text-xs text-fg-3">vs. six months ago</p>
        </li>
        <li>
          <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-fg-3 uppercase">
            Forecast +26
          </p>
          <p className="mt-1.5 text-xl font-semibold text-fg">{cop(f.forecastEnd)}</p>
          <p className="mt-0.5 text-xs text-fg-3">end of horizon</p>
        </li>
        <li>
          <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-fg-3 uppercase">
            Volatility
          </p>
          <p className="mt-1.5 text-xl font-semibold text-fg">
            {f.biggestWeeklyMove.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-xs text-fg-3">largest weekly move</p>
        </li>
      </ul>

      <LineChart
        xLabels={WEEK_LABELS}
        series={series}
        band={{
          upper: data.upper,
          lower: data.lower,
          color: bandFill,
          label: "Forecast interval",
        }}
        format={cop}
        divider={{ at: HISTORY - 1, label: "forecast" }}
        caption={`Weekly ${product.name} price in ${product.unit}: 52 weeks of history followed by a 26-week forecast with its interval.${
          compare ? " The internal price is overlaid for the history period." : ""
        } All values are synthetic.`}
      />

      <div className="mt-8 rounded-lg border border-line bg-surface-2/50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-fg-3 uppercase">
            Written reading
          </p>
          <Button onClick={generate} disabled={generating}>
            {generating ? "Writing…" : revealed ? "Regenerate" : "Generate reading"}
          </Button>
        </div>

        <div className="mt-4 min-h-28" aria-live="polite">
          {revealed === 0 && !generating && (
            <p className="text-sm leading-relaxed text-fg-3">
              In the real platform a model reads the series and writes this paragraph once; the
              result is cached against a hash of the data it was given, so the same series is
              never paid for twice. Here the wording is fixed and the figures inside it are
              computed from the series above — which is why the prose and the chart never
              disagree.
            </p>
          )}
          {generating && revealed === 0 && (
            <p className="flex items-center gap-2 text-sm text-fg-3">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet" />
              Reading 52 weeks of series data…
            </p>
          )}
          <div className="space-y-3">
            {paragraphs.slice(0, revealed).map((para) => (
              <p key={para.slice(0, 24)} className="text-sm leading-relaxed text-fg-2">
                {para}
              </p>
            ))}
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
