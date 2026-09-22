/**
 * Every word the site says about the five projects, in the order the landing
 * shows them. The landing's panels and cards, each project page and the social
 * cards are all generated from this list (see src/site/), so a card and the
 * page it opens can never disagree.
 *
 * The rules the wording is written under:
 * - The employer is never named. Four of the five run at a retail chain in
 *   Colombia; their repositories carry its name, so those pages show no repo.
 * - Business figures appear as ranges, orders of magnitude or relative
 *   percentages, never exact revenue, margin, cost or volume.
 * - A hook says what the system is, not a clever line about it.
 */

export type Stat = {
  /** Short enough to sit on one line at display size. */
  value: string;
  label: string;
  /** The page's headline figure: its card on the project page is twice as wide. */
  wide?: boolean;
};

/**
 * The picture on the landing panel, the recap card and the page opening.
 * `line` and `market` are charts of `points`; `split` is the index where the
 * actuals end and the forecast begins (default: two thirds of the way).
 */
export type Visual =
  | { kind: "line" | "market"; caption: string; points: number[]; split?: number }
  | { kind: "chat" | "flow" | "assistant"; caption: string };

export type Project = {
  slug: string;
  /** Accent token, a1 through a5. Drives the card, the page and the demo. */
  accent: "a1" | "a2" | "a3" | "a4" | "a5";
  title: string;
  kicker: string;
  hook: string;
  /** The two figures the landing panel and card show big. */
  cardStats: Stat[];
  visual: Visual;
  /** The project page: two paragraphs at most. */
  story: string[];
  /** "Built with": one line each, [tool, what it does here]. */
  tools: [string, string][];
  numbers: Stat[];
  role: string;
  running: string;
  /** Only for a public repository. */
  repo?: string;
};

export const projects: Project[] = [
  {
    slug: "forecast",
    accent: "a1",
    title: "ML demand forecasting in production",
    kicker: "MLOps · Time series",
    hook: "Over 100,000 SKU+Store combinations, forecast weekly by a routing policy that picks a model per cluster.",
    cardStats: [
      { value: "100k+", label: "Series, weekly" },
      { value: "70-82%", label: "Accuracy by cluster" },
    ],
    visual: { kind: "line", caption: "Forecast", points: [62, 58, 64, 71, 66, 74, 81, 77, 85, 92, 88, 96] },
    story: [
      "A retail chain with 14 supermarkets reorders stock every week, for over 100,000 SKU+Store combinations. That decision used to come from a black box inside the ERP: it produced a number, never a reason, and nobody could make it better.",
      "The replacement forecasts every combination weekly and feeds reordering directly. It sends each product to the method that suits how it actually sells: machine-learning models for the steady sellers, a simpler rule for the long tail that barely moves. Accuracy went from about 30% with the ERP's forecast to 70–82% today, depending on the cluster.",
    ],
    tools: [
      ["Python", "The whole pipeline"],
      ["LightGBM", "Demand models, one per cluster"],
      ["statsforecast", "Baseline models to beat"],
      ["Polars", "Fast data processing"],
      ["Delta Lake", "Versioned on-prem data lake"],
      ["Dagster", "Pipeline orchestration and scheduling"],
      ["MLflow", "Experiment tracking and model promotion"],
      ["SQL Server", "Source sales and stock data"],
    ],
    numbers: [
      { value: "30% → 70–82%", label: "Accuracy, the ERP's forecast against today's, by cluster", wide: true },
      { value: "100k+", label: "SKU+Store combinations, forecast weekly" },
      { value: "370+", label: "Automated tests, green before every deploy" },
      { value: "8", label: "Models, one per cluster" },
    ],
    role: "Architecture and data engineering; modelling with the team's data scientist",
    running: "In production since 2026",
  },
  {
    slug: "market-prices",
    accent: "a2",
    title: "Market price intelligence platform",
    kicker: "Data platform · Generative AI",
    hook: "Weekly public data, parsed into a 52-week forecast the buying team takes into supplier negotiations.",
    cardStats: [
      { value: "52 wk", label: "Forecast horizon" },
      { value: "100s", label: "Products covered" },
    ],
    visual: { kind: "market", caption: "Market vs. internal price, forecast ahead", points: [60, 90, 55, 78, 48, 68, 40, 72, 58, 95], split: 6 },
    story: [
      "Colombia's statistics office publishes wholesale food prices every week, in files made for people to read: layouts shift between releases, units change from sheet to sheet, and there is no API. Meanwhile the buying team negotiated with suppliers with no outside reference for what the market was doing.",
      "The platform reads every release reliably, keeps years of history for hundreds of products, forecasts each price 52 weeks ahead, and has an AI model generate automated insights. It started as an internal tool and is now a secure web app the buyers take into supplier negotiations.",
    ],
    tools: [
      ["Python", "Ingestion, models and the web app"],
      ["Polars", "Fast, memory-light data processing"],
      ["Delta Lake", "Price history with safe weekly updates"],
      ["XGBoost · LightGBM", "Price forecasting"],
      ["FastAPI", "The web app's backend"],
      ["HTMX", "Interactive pages without a heavy front end"],
      ["Anthropic API", "Generates the automated insights"],
    ],
    numbers: [
      { value: "52 wk", label: "Forecast horizon for every product" },
      { value: "100s", label: "Products, with years of history each" },
      { value: "100s", label: "Automated tests running in CI" },
      { value: "Reused", label: "AI-generated insights, whenever the input data is the same" },
    ],
    role: "End-to-end engineer, from design to operation",
    running: "In production since 2026",
  },
  {
    slug: "rag",
    accent: "a3",
    title: "AI assistant for business data",
    kicker: "Applied AI · Guardrails",
    hook: "A Telegram assistant for questions about sales, inventory and purchasing. Every figure it gives comes from a query it actually ran.",
    cardStats: [
      { value: "Zero", label: "Numbers the model makes up" },
      { value: "Golden queries", label: "Embedded/Vector DB" },
    ],
    visual: { kind: "chat", caption: "Question, routed path, verified answer" },
    story: [
      "Every question about sales, inventory or purchasing used to wait for the one person who could write the SQL query. Putting an AI model in front of the data is the obvious fix, and the obvious risk: a model that invents a plausible number looks exactly like one that got it right.",
      "So the rule came first: the model never produces a figure. Every answer comes from the company's data warehouse, where the business data is already modelled and documented. Common questions run prepared, reviewed queries. Anything new goes through NL2SQL: the model writes the SQL, which is parsed into a syntax tree and validated, then dry-run against the warehouse, so a malformed or unsafe query is rejected before it touches real data. Answers arrive in Telegram, and every number in them comes from a query that actually ran.",
    ],
    tools: [
      ["Python", "The assistant's core, with no outside dependencies"],
      ["Model-agnostic LLM layer", "Any provider, picked by measured accuracy and latency"],
      ["Groq", "Fast, low-cost model hosting"],
      ["Open-weight LLMs", "NL2SQL for questions nobody prepared"],
      ["Embeddings", "Match a question to the right prepared query"],
      ["Vector search", "Finds the closest query by meaning, not keywords"],
      ["SQL AST validation", "Every generated query parsed and checked before it runs"],
      ["Dry run", "Proves the query executes before it touches real data"],
      ["SQL Server", "The data warehouse"],
      ["Telegram", "Where people ask"],
    ],
    numbers: [
      { value: "Zero", label: "Figures the model makes up" },
      { value: "2", label: "Answer paths: prepared queries and NL2SQL" },
      { value: "1", label: "Way to reach the paid model, enforced by multiple tests" },
      { value: "Robust", label: "Test suite, from SQL validation to spend limits" },
    ],
    role: "Sole engineer",
    running: "In pilot testing",
  },
  {
    slug: "operations-platform",
    accent: "a4",
    title: "Stock rebalancing engine",
    kicker: "Full stack · Internal product",
    hook: "Analysts used to work out every inter-store transfer by hand. The engine proposes what moves where, and they run it themselves.",
    cardStats: [
      { value: "4h → 5min", label: "Per transfer plan" },
      { value: "Self-serve", label: "Run by the analysts" },
    ],
    visual: { kind: "flow", caption: "Stock moving from a surplus store to the short ones" },
    story: [
      "Purchasing analysts worked out every inter-store stock transfer by hand: which store had too much of a product, which had too little, and how much to move. A single plan took around four hours to elaborate.",
      "The engine now proposes which products should move from stores with surplus to stores running short, checked against real inventory and sales. The analysts review the plan and run it themselves in a web app, in two to five minutes.",
    ],
    tools: [
      ["Python", "The transfer logic"],
      ["FastAPI", "The engine's API"],
      ["pandas", "Stock-cover and transfer calculations"],
      ["SQL Server", "Real inventory and sales data"],
      ["Dagster", "Scheduled runs"],
      ["Docker", "Packaged deployment"],
      ["JavaScript web app", "Where the analysts review and run each plan"],
    ],
    numbers: [
      { value: "4h → 5min", label: "Time to produce a transfer plan", wide: true },
    ],
    role: "Sole engineer",
    running: "In production since 2025",
  },
  {
    slug: "cortana",
    accent: "a5",
    title: "Personal AI operating system",
    kicker: "Multi-agent · Local-first",
    hook: "The memory is markdown in Git, so it outlives the runtime that reads it.",
    cardStats: [
      { value: "Asks first", label: "Before anything it can't undo" },
      { value: "Markdown", label: "Git is the source of truth" },
    ],
    visual: { kind: "assistant", caption: "Ask it something, in your own words" },
    story: [
      "My own assistant for memory, notes, personal finances and calendar, which I talk to over Telegram and a web interface. Assistants that advertise memory keep it somewhere you cannot read or take with you. I wanted the opposite: delete the app tomorrow and everything it knows still opens in a text editor.",
      "So its memory is a folder of markdown notes kept in Git, and the application is a replaceable layer on top. Anything it cannot undo, like changing a financial record or sending a message, waits for my approval first. Backups run on their own, and it all costs under $20 a month.",
    ],
    tools: [
      ["Python", "The assistant's logic"],
      ["FastAPI", "Backend"],
      ["Next.js", "Web front end"],
      ["Postgres", "Transactions and state"],
      ["Git", "Long-term memory, with full history"],
      ["Anthropic API", "Language understanding"],
      ["Telegram", "Chat interface"],
      ["Docker", "Packaged deployment"],
    ],
    numbers: [
      { value: "4", label: "Checks every change must pass before it merges" },
      { value: "100s", label: "Automated tests that have caught real regressions" },
      { value: "< $20", label: "Monthly cloud spend, by design" },
    ],
    role: "Sole engineer, architect and only user",
    running: "In daily use since 2026",
    repo: "cortana + cortana-app",
  },
];

export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
