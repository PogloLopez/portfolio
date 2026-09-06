/**
 * Layer 1 of every case study — the summary a hiring manager reads without
 * scrolling. Layer 2 (the technical deep dive) lives in `projects/<slug>.mdx`.
 *
 * Confidentiality rule, applied to all four Mercaldas projects: the company is
 * named, but business figures appear only as ranges, orders of magnitude or
 * relative percentages. Exact revenue, margin, cost and volume figures are out.
 * Purely technical counts (tests, releases, series) are exact where the repo's
 * own README already states them. `cortana` is a personal project and carries
 * no such restriction.
 */

export type Achievement = {
  /** Short enough to sit on one line at display size. */
  value: string;
  label: string;
};

export type Project = {
  slug: string;
  /** Repository name, shown as the technical identifier. */
  repo: string;
  title: string;
  kicker: string;
  /** The five-second answer to "what is this". */
  oneLiner: string;
  /** What the home-page card leads with. */
  hook: string;
  org: string;
  confidential: boolean;
  problem: string;
  achievements: Achievement[];
  stack: string[];
  role: string;
  duration: string;
  /** Technical metrics, kept separate from the business outcomes above. */
  technical: Achievement[];
};

export const projects: Project[] = [
  {
    slug: "forecast",
    repo: "mercaldas-forecast",
    title: "Weekly demand forecasting at scale",
    kicker: "MLOps · Time series · Production",
    oneLiner:
      "A weekly forecasting system covering thousands of product×store series that feeds replenishment directly, built to replace the black box inside the ERP.",
    hook:
      "Replaced the ERP's black-box forecast and caught a silent production failure with an audit I designed myself.",
    org: "Mercaldas",
    confidential: true,
    problem:
      "Mercaldas forecast its demand with the black-box module bundled into its ERP. When a forecast was wrong nobody could see why, and there was no lever to make it better — the vendor owned the model and the explanation. Replenishment for every store ran on top of it anyway.",
    achievements: [
      {
        value: "Double-digit %",
        label:
          "WMAPE reduction against the previous baseline across several product categories, with the largest gains in fast-moving lines",
      },
      {
        value: "Thousands",
        label: "Product×store series forecast every week, across more than a dozen stores",
      },
      {
        value: "Feeds replenishment",
        label: "Output goes straight into the merchandise reordering system, not into a report",
      },
      {
        value: "Caught in production",
        label:
          "A silent horizon degradation found and root-caused by an audit I designed, before the business noticed it",
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
    role: "Sole engineer — design, build and operation",
    duration: "In production since 2025 · continuous improvement",
    technical: [
      { value: "350+", label: "Automated tests, green before every deploy" },
      { value: "Medallion", label: "Bronze / Silver / Gold layers on a local-filesystem data lake" },
      { value: "Champion / challenger", label: "Multi-model tournament with measurable switching criteria" },
    ],
  },

  {
    slug: "market-prices",
    repo: "mercaldas-precios-mercado",
    title: "Market price intelligence with generative AI",
    kicker: "Data platform · Forecasting · LLM in the loop",
    oneLiner:
      "A platform that ingests Colombia's weekly wholesale price bulletins, forecasts 52 weeks ahead per product, and has a language model write the reading of each series.",
    hook:
      "Turned a hostile public data source into a tool the commercial team now takes into supplier negotiations.",
    org: "Mercaldas",
    confidential: true,
    problem:
      "The national statistics office (DANE) publishes wholesale agricultural prices as weekly bulletins: public, authoritative, and formatted for humans rather than machines. Buyers at Mercaldas had no benchmark for what the market was doing, so internal prices were negotiated without an outside reference.",
    achievements: [
      {
        value: "Hundreds",
        label: "Products covered, with several years of price history behind each series",
      },
      {
        value: "52 weeks",
        label: "Forecast horizon per product, with model selection by multi-horizon MAPE",
      },
      {
        value: "Internal tool → product",
        label:
          "Exposed to the internet with authentication this year, so the commercial team uses it directly in supplier negotiations",
      },
      {
        value: "Cached by payload hash",
        label: "LLM insights are never paid for twice for data that was already interpreted",
      },
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
    role: "Sole engineer — design, build and operation",
    duration: "In production since 2025 · active releases",
    technical: [
      { value: "Hundreds", label: "Automated tests running in CI" },
      { value: "Delta Lake", label: "Chosen over flat Parquet specifically for incremental upserts" },
      { value: "HTMX", label: "Reactive UI without carrying the weight of a single-page app" },
    ],
  },

  {
    slug: "rag",
    repo: "mercaldas-rag",
    title: "A data assistant that never invents a number",
    kicker: "Applied AI · Guardrails · SQL generation",
    oneLiner:
      "A Telegram assistant that lets management ask about the business in plain language, where every figure on screen comes from a real query — never from the model.",
    hook:
      "Adversarial audits proved my own spend guardrail was bypassable, so I moved the control out of shell patterns and into code.",
    org: "Mercaldas",
    confidential: true,
    problem:
      "Every ad-hoc business question — sales, inventory, margin — went through the one person who could write the query. That is a bottleneck for management and a poor use of the analyst. The obvious fix, pointing a language model at the warehouse, fails in the way that matters most: a model that invents a plausible number is worse than no answer at all.",
    achievements: [
      {
        value: "Zero invented figures",
        label:
          "Every number the user sees comes from an executed, verifiable query — a non-negotiable design constraint, not a prompt instruction",
      },
      {
        value: "Two answer paths",
        label:
          "A certified path of closed SQL recipes for high-confidence questions, and a dynamic path where generated SQL is validated and dry-run first",
      },
      {
        value: "Path mix as health signal",
        label:
          "The share of questions falling into each path is measured as a diagnostic, deliberately not as a metric to optimise",
      },
      {
        value: "Guardrail rebuilt",
        label:
          "Adversarial audit found most invocations bypassed the spend control; redesigned around a single paid-provider entry point enforced by a test",
      },
    ],
    stack: ["Python", "Groq", "Open-weight LLMs", "SQL Server", "Telegram"],
    role: "Sole engineer",
    duration: "In active construction since 2026",
    technical: [
      { value: "Standard library", label: "Core carries no external dependencies — a deliberately minimal failure surface" },
      { value: "Dozens", label: "Automated tests, from SQL validation to the spend guardrails themselves" },
      { value: "Pre-committed thresholds", label: "Model switching criteria defined before measuring, not tuned after" },
    ],
  },

  {
    slug: "operations-platform",
    repo: "mercaldas-data",
    title: "From loose scripts to a central operations platform",
    kicker: "Backend · Orchestration · Internal tooling",
    oneLiner:
      "A central API that absorbed the recurring work operations and planning used to do by hand — inter-store transfers, promotional buying factors, scheduled reports.",
    hook:
      "Inter-store transfer planning went from a request queued behind me to a web tool operations runs on their own.",
    org: "Mercaldas",
    confidential: true,
    problem:
      "Recurring operational work lived in individual scripts with no shared API and no interface. Planning a transfer of inventory between stores meant asking the data person and waiting; sales and inventory reports were assembled by hand on a schedule. Every one of those tasks was a standing interruption.",
    achievements: [
      {
        value: "Self-service",
        label:
          "Operations plans inter-store transfers directly in a web tool instead of queuing a request behind one engineer",
      },
      {
        value: "Several per week",
        label: "Recurring reports generated and delivered with no human in the loop, previously assembled by hand",
      },
      {
        value: "One API",
        label: "Business logic consolidated from separate scripts without stopping the operation during migration",
      },
    ],
    stack: ["Python", "FastAPI", "pandas", "SQL Server", "Dagster", "Docker", "Gmail API"],
    role: "Sole engineer",
    duration: "In production since 2025",
    technical: [
      { value: "No medallion", label: "A deliberate divergence: the problem here is operational, not analytical" },
      { value: "Plain JavaScript UI", label: "No frontend framework — minimising build complexity for a one-person team" },
      { value: "OAuth2 delivery", label: "Reports go out over the Gmail API rather than traditional SMTP" },
    ],
  },

  {
    slug: "cortana",
    repo: "cortana + cortana-app",
    title: "Cortana — a personal AI operating system",
    kicker: "Multi-agent · Human-in-the-loop · Local-first",
    oneLiner:
      "My own AI assistant: a plain-text knowledge vault as long-term memory, and a multi-agent runtime that asks for approval before doing anything it cannot undo.",
    hook:
      "A Git-versioned Markdown vault as the memory, and an agent runtime that has to ask me before it does anything irreversible.",
    org: "Personal project",
    confidential: false,
    problem:
      "I wanted an assistant that manages my memory, knowledge, finances and calendar without renting my long-term memory from a vendor. Closed 'AI with memory' products keep the memory in a proprietary format you cannot read, audit, diff or take with you. The interesting constraint was building one where the memory outlives the runtime.",
    achievements: [
      {
        value: "Memory is plain text",
        label:
          "A Markdown vault versioned in Git is the source of truth — readable, diffable and portable to any other tool",
      },
      {
        value: "Human-in-the-loop gate",
        label:
          "No irreversible action — sending a message, editing a financial record, cancelling an event — executes without explicit approval",
      },
      {
        value: "Under $20/month",
        label:
          "A hard cloud-spend ceiling every stack decision is evaluated against, including which tasks are worth a paid model at all",
      },
      {
        value: "Restore-tested backups",
        label:
          "Not 'backups exist' but 'restoring was rehearsed and verified', plus a guard that refuses destructive database operations outside a test environment",
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
    role: "Sole engineer — architect, builder and the only user",
    duration: "In development and daily use since 2026",
    technical: [
      { value: "4 CI gates", label: "Lint, format, type check and the test suite, all required before merge" },
      { value: "Hundreds", label: "Automated tests — the suite has caught real regressions before they shipped" },
      { value: "Pull before write", label: "The runtime never overwrites the vault; it reconciles with it" },
    ],
  },
];

export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
