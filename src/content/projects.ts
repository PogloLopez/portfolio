/**
 * Layer 1 of every case study: the summary a hiring manager reads without
 * scrolling. Layer 2 (the technical deep dive) lives in `projects/<slug>.mdx`.
 *
 * Confidentiality, applied to all four Mercaldas projects: the company is
 * named, but business figures appear only as ranges, orders of magnitude or
 * relative percentages. Exact revenue, margin, cost and volume figures are out.
 * Technical counts can be exact where the project's own repo already states
 * them. `cortana` is personal and carries no such restriction.
 *
 * Titles are written to be understood in about three seconds. A recruiter
 * scanning the grid should know what each system is before reading anything
 * else, so the clever line goes in `hook`, never in `title`.
 */

export type Achievement = {
  /** Short enough to sit on one line at display size. */
  value: string;
  label: string;
};

/** The miniature that makes a home-page card visual rather than a text block. */
export type CardVisual =
  | { kind: "line"; points: number[]; caption: string }
  | { kind: "bars"; points: number[]; caption: string }
  | { kind: "chat"; caption: string }
  | { kind: "gate"; caption: string };

export type Project = {
  slug: string;
  /** Accent token, a1 through a5. Drives the card, the page and the demo. */
  accent: "a1" | "a2" | "a3" | "a4" | "a5";
  repo: string;
  title: string;
  kicker: string;
  /** The five-second answer to "what is this". */
  oneLiner: string;
  /** The single sharp line the home-page card leads with. */
  hook: string;
  org: string;
  confidential: boolean;
  problem: string;
  /** The two figures the card shows big. */
  cardStats: Achievement[];
  visual: CardVisual;
  achievements: Achievement[];
  stack: string[];
  role: string;
  duration: string;
  technical: Achievement[];
};

export const projects: Project[] = [
  {
    slug: "forecast",
    accent: "a1",
    repo: "mercaldas-forecast",
    title: "ML demand forecasting in production",
    kicker: "MLOps · Time series",
    oneLiner:
      "A weekly forecasting system covering over 100,000 product and store combinations across 14 stores, feeding replenishment directly.",
    hook: "Over 100,000 product and store combinations, forecast weekly by a routing policy that picks a model per series.",
    org: "Mercaldas",
    confidential: true,
    problem:
      "Mercaldas forecast demand with the black box bundled into its ERP. Nobody could see why a forecast missed and there was no lever to make it better, yet replenishment for every store ran on it. Replacing it was the easy part. Getting a single model to behave across a catalogue where most series barely move was not.",
    cardStats: [
      { value: "100k+", label: "Series, weekly" },
      { value: "70-82%", label: "Accuracy by cluster" },
    ],
    visual: {
      kind: "line",
      points: [62, 58, 64, 71, 66, 74, 81, 77, 85, 92, 88, 96],
      caption: "Forecast against actuals",
    },
    achievements: [
      {
        value: "19% less error",
        label: "WMAPE 0.489 to 0.394 against the previous pipeline, scored on the same folds",
      },
      {
        value: "100,000+",
        label: "Product and store combinations forecast every week across 14 stores",
      },
      {
        value: "70-82%",
        label: "Accuracy band by demand cluster, best on smooth series and weakest on intermittent",
      },
      { value: "Feeds reordering", label: "Output drives replenishment directly, not a report" },
      {
        value: "Caught in production",
        label: "A silent horizon failure found and root-caused by an audit I built",
      },
    ],
    stack: [
      "Python",
      "LightGBM",
      "statsforecast",
      "Dagster",
      "Polars",
      "Delta Lake",
      "MLflow",
      "SQL Server",
    ],
    role: "Data engineering and productionisation; modelling with the team's data scientist",
    duration: "In production since 2025",
    technical: [
      { value: "370+", label: "Automated tests, green before every deploy" },
      { value: "8 models", label: "LightGBM Tweedie, one per taxonomic category" },
      { value: "Routing policy", label: "Syntetos-Boylan class decides model or moving average" },
    ],
  },

  {
    slug: "market-prices",
    accent: "a2",
    repo: "mercaldas-precios-mercado",
    title: "Market price intelligence platform",
    kicker: "Data platform · Generative AI",
    oneLiner:
      "Ingests Colombia's weekly wholesale price bulletins, forecasts 52 weeks per product, and has a model write the reading of each series.",
    hook: "A hostile public data source, turned into a tool the commercial team takes into supplier negotiations.",
    org: "Mercaldas",
    confidential: true,
    problem:
      "The national statistics office publishes wholesale prices as weekly bulletins built for humans, not machines. Buyers had no outside benchmark, so internal prices were negotiated blind.",
    cardStats: [
      { value: "52 wk", label: "Forecast horizon" },
      { value: "100s", label: "Products covered" },
    ],
    visual: {
      kind: "line",
      points: [58, 54, 61, 92, 74, 63, 66, 59, 71, 68, 64, 67],
      caption: "Market price with forecast tail",
    },
    achievements: [
      { value: "Hundreds", label: "Products covered, with years of price history each" },
      { value: "52 weeks", label: "Forecast horizon, model chosen by multi-horizon MAPE" },
      {
        value: "Internal tool to product",
        label: "Now authenticated and internet-facing, used in supplier negotiation",
      },
      { value: "Written once", label: "Each AI reading is generated into the Gold layer, not per page view" },
    ],
    stack: [
      "Python",
      "Polars",
      "Delta Lake",
      "XGBoost",
      "LightGBM",
      "FastAPI",
      "HTMX",
      "Anthropic API",
    ],
    role: "Sole engineer, design to operation",
    duration: "In production since 2025",
    technical: [
      { value: "Hundreds", label: "Automated tests running in CI" },
      { value: "Delta Lake", label: "Chosen over flat Parquet for incremental upserts" },
      { value: "HTMX", label: "Reactive UI without the weight of a single-page app" },
    ],
  },

  {
    slug: "rag",
    accent: "a3",
    repo: "mercaldas-rag",
    title: "AI assistant for business data",
    kicker: "Applied AI · Guardrails",
    oneLiner:
      "A Telegram assistant that answers business questions in plain language, where every figure comes from a real query.",
    hook: "Built the spend guardrails first, then broke them on purpose. The fix moved the control into code.",
    org: "Mercaldas",
    confidential: true,
    problem:
      "Every ad-hoc question about sales, inventory or margin went through the one person who could write the query. Pointing a model at the warehouse is the obvious fix and the obvious trap: an invented number looks exactly like an answer.",
    cardStats: [
      { value: "2 paths", label: "Certified + dynamic" },
      { value: "0", label: "Figures from the model" },
    ],
    visual: { kind: "chat", caption: "Question, routed path, verified answer" },
    achievements: [
      {
        value: "No invented figures",
        label: "Every number comes from an executed query, enforced by design and not by prompt",
      },
      {
        value: "Two answer paths",
        label: "Closed SQL recipes for known questions, validated model-written SQL for the rest",
      },
      {
        value: "Validated before it runs",
        label: "Generated SQL passes lexical checks and a dry run before touching real data",
      },
      {
        value: "One paid entry point",
        label: "Spend control lives in code, with a test that fails if a second door appears",
      },
    ],
    stack: ["Python", "Groq", "Open-weight LLMs", "SQL Server", "Telegram"],
    role: "Sole engineer",
    duration: "In active development",
    technical: [
      { value: "Standard library", label: "Core carries no external dependencies by design" },
      { value: "120", label: "Automated tests, from SQL validation to the guardrails" },
      { value: "Pre-committed", label: "Model switching thresholds set before measuring" },
    ],
  },

  {
    slug: "operations-platform",
    accent: "a4",
    repo: "mercaldas-data",
    title: "Internal operations platform",
    kicker: "Backend · Internal tooling",
    oneLiner:
      "A central API that absorbed the recurring work operations used to do by hand: inter-store transfers, buying factors, scheduled reports.",
    hook: "Transfer planning went from a request queued behind me to a tool operations runs on their own.",
    org: "Mercaldas",
    confidential: true,
    problem:
      "Recurring operational work lived in individual scripts with no shared API and no interface. Planning a stock transfer meant asking the data person and waiting. Every task was a standing interruption.",
    cardStats: [
      { value: "4h to 5min", label: "Per transfer plan" },
      { value: "Self-serve", label: "Run by operations" },
    ],
    visual: {
      kind: "bars",
      points: [85, 22, 68, 14, 41, 30],
      caption: "Days of cover by store",
    },
    achievements: [
      {
        value: "Self-service",
        label: "Operations plans transfers in a web tool instead of queuing behind one engineer",
      },
      { value: "4 hours to 2-5 min", label: "Time to produce a transfer plan" },
      { value: "3 runs a week", label: "Two scheduled report jobs, generated and delivered unattended" },
      { value: "One API", label: "Scripts consolidated without stopping the operation" },
    ],
    stack: ["Python", "FastAPI", "pandas", "SQL Server", "Dagster", "Docker", "Gmail API"],
    role: "Sole engineer",
    duration: "In production since 2025",
    technical: [
      { value: "No medallion", label: "A deliberate divergence: this problem is operational" },
      { value: "Plain JS UI", label: "No frontend framework, minimal build for a team of one" },
      { value: "OAuth2", label: "Delivery over the Gmail API rather than SMTP" },
    ],
  },

  {
    slug: "cortana",
    accent: "a5",
    repo: "cortana + cortana-app",
    title: "Personal AI operating system",
    kicker: "Multi-agent · Local-first",
    oneLiner:
      "My own assistant: a Git-versioned Markdown vault as long-term memory, and a multi-agent runtime that asks before doing anything it cannot undo.",
    hook: "The memory is plain text in Git, so it outlives the runtime that reads it.",
    org: "Personal project",
    confidential: false,
    visual: { kind: "gate", caption: "Proposed change, held for approval" },
    problem:
      "I wanted an assistant for my memory, knowledge, finances and calendar without renting my long-term memory from a vendor. Closed products keep it in a format you cannot read, diff or take with you.",
    cardStats: [
      { value: "4 gates", label: "Required in CI" },
      { value: "< $20/mo", label: "Cloud spend ceiling" },
    ],
    achievements: [
      {
        value: "Memory is plain text",
        label: "A Markdown vault in Git is the source of truth: readable, diffable, portable",
      },
      {
        value: "Approval gate",
        label: "Nothing irreversible runs without me approving it first",
      },
      { value: "Under $20/month", label: "A hard spend ceiling every stack decision answers to" },
      {
        value: "Restore-tested backups",
        label: "Recovery rehearsed and verified, plus a guard against destructive operations",
      },
    ],
    stack: [
      "Python",
      "FastAPI",
      "Next.js",
      "Postgres",
      "Git as persistence",
      "Anthropic API",
      "Telegram",
      "Docker",
    ],
    role: "Sole engineer, architect and only user",
    duration: "In daily use since 2026",
    technical: [
      { value: "4 CI gates", label: "Lint, format, type check and tests, all required" },
      { value: "Hundreds", label: "Tests, and they have caught real regressions" },
      { value: "Pull before write", label: "The runtime reconciles with the vault, never overwrites" },
    ],
  },
];

export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
