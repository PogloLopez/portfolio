/**
 * The new wording for the five project pages, in one place for review.
 *
 * Drafted from the current write-ups (src/content/projects/*.mdx) and
 * projects.ts under the landing's rules: the employer is never named, the
 * story says plainly what was broken and what the system does now, and a
 * figure is one a business reader would weigh. The long write-ups are
 * replaced by two short paragraphs; everything technical lives in the
 * "See more" panel, one terse line per item.
 *
 * Titles, kickers, hooks and the two headline stats come from the landing
 * (landing-showcase/gen-index.cjs), so a card and its page always agree.
 */
module.exports = {
  forecast: {
    story: [
      "A retail chain with 14 stores reorders stock every week, for over 100,000 product and store combinations. That decision used to come from a black box inside the ERP: it produced a number, never a reason, and nobody could make it better.",
      // Accuracy figures are the author's: about 30% with the ERP's forecast,
      // 70-82% now. (A "19% less error" claim in projects.ts and forecast.mdx
      // was dropped on review.)
      "The replacement forecasts every combination weekly and feeds reordering directly. It sends each product to the method that suits how it actually sells: machine-learning models for the steady sellers, a simpler rule for the long tail that barely moves. Accuracy went from about 30% with the ERP's forecast to 70–82% today, depending on how steadily a product sells.",
    ],
    tools: [
      ["Python", "The whole pipeline"],
      ["LightGBM", "Demand models, one per product category"],
      ["statsforecast", "Baseline models to beat"],
      ["Polars", "Fast data processing"],
      ["Delta Lake", "Versioned data lake on local disk"],
      ["Dagster", "Pipeline orchestration and scheduling"],
      ["MLflow", "Experiment tracking and model promotion"],
      ["SQL Server", "Source sales and stock data"],
    ],
    numbers: [
      { value: "30% → 70–82%", label: "Accuracy, the ERP's forecast against today's, by demand pattern" },
      { value: "100k+", label: "Product and store combinations, forecast weekly" },
      { value: "370+", label: "Automated tests, green before every deploy" },
      { value: "8", label: "Models, one per product category" },
    ],
    meta: {
      role: "Architecture and data engineering; modelling with the team's data scientist",
      running: "In production since 2026",
      repo: "Private repository",
    },
  },

  "market-prices": {
    story: [
      "Colombia's statistics office publishes wholesale food prices every week, in files made for people to read: layouts shift between releases, units change from sheet to sheet, and there is no API. Meanwhile the buying team negotiated with suppliers with no outside reference for what the market was doing.",
      "The platform reads every release reliably, keeps years of history for hundreds of products, forecasts each price 52 weeks ahead, and has an AI model write a short reading of each one. It started as an internal tool and is now a secure web app the buyers take into supplier negotiations.",
    ],
    tools: [
      ["Python", "Ingestion, models and the web app"],
      ["Polars", "Fast, memory-light data processing"],
      ["Delta Lake", "Price history with safe weekly updates"],
      ["XGBoost · LightGBM", "Price forecasting"],
      ["FastAPI", "The web app's backend"],
      ["HTMX", "Interactive pages without a heavy front end"],
      ["Anthropic API", "Writes each price reading, once"],
    ],
    numbers: [
      { value: "52 wk", label: "Forecast horizon for every product" },
      { value: "100s", label: "Products, with years of history each" },
      { value: "100s", label: "Automated tests running in CI" },
      { value: "Once", label: "Each AI reading is written once, then reused" },
    ],
    meta: {
      role: "Sole engineer, from design to operation",
      running: "In production since 2026",
      repo: "Private repository",
    },
  },

  rag: {
    story: [
      "Every question about sales, inventory or purchasing used to wait for the one person who could write the database query. Putting an AI model in front of the data is the obvious fix, and the obvious risk: a model that invents a plausible number looks exactly like one that got it right.",
      "So the rule came first: the model never produces a figure. Common questions run prepared, reviewed queries; anything new gets a query written by the model, which is checked and test-run before it touches real data. Answers arrive in Telegram, and every number in them comes from a query that actually ran.",
    ],
    tools: [
      ["Python", "The assistant's core, with no outside dependencies"],
      ["Groq", "Fast, low-cost model hosting"],
      ["Open-weight LLMs", "Write queries for questions nobody prepared"],
      ["Vector search", "Matches a question to a prepared query"],
      ["SQL Server", "The business data"],
      ["Telegram", "Where people ask"],
    ],
    numbers: [
      { value: "Zero", label: "Figures the model makes up" },
      { value: "120", label: "Automated tests, from query checks to spend limits" },
      { value: "2", label: "Answer paths: prepared queries and checked new ones" },
      { value: "1", label: "Way to reach the paid model, enforced by a test" },
    ],
    meta: {
      role: "Sole engineer",
      running: "In active development",
      repo: "Private repository",
    },
  },

  "operations-platform": {
    story: [
      "Purchasing analysts worked out every inter-store stock transfer by hand, a plan that took around four hours. Recurring sales and inventory reports were also assembled manually, from a set of scripts with no shared interface.",
      "The engine now proposes which products should move from stores with surplus to stores running short, and the analysts review and run the plan themselves in a web app, in two to five minutes. Two reports build and send themselves on a schedule, and all of it moved onto one platform without the stores' operations ever stopping.",
    ],
    tools: [
      ["Python", "The transfer and report logic"],
      ["FastAPI", "One API for all the operational tools"],
      ["pandas", "Stock-cover and transfer calculations"],
      ["SQL Server", "Stores, stock and sales data"],
      ["Dagster", "Scheduled reports"],
      ["Docker", "Packaged deployment"],
      ["Gmail API", "Report delivery, no stored passwords"],
      ["Plain JavaScript", "The analysts' web app, no framework"],
    ],
    numbers: [
      { value: "4h → 5min", label: "Time to produce a transfer plan" },
      { value: "3", label: "Scheduled report runs a week, hands-off" },
      { value: "1", label: "API where separate scripts used to be" },
      { value: "0", label: "Outages while it was migrated" },
    ],
    meta: {
      role: "Sole engineer",
      running: "In production since 2025",
      repo: "Private repository",
    },
  },

  cortana: {
    story: [
      "My own assistant for memory, notes, personal finances and calendar, which I talk to over Telegram. Assistants that advertise memory keep it somewhere you cannot read or take with you. I wanted the opposite: delete the app tomorrow and everything it knows still opens in a text editor.",
      "So its memory is a folder of plain-text notes kept in Git, and the application is a replaceable layer on top. Anything it cannot undo, like changing a financial record or sending a message, waits for my approval first. Backups run on their own and have been restored for real, and it all costs under $20 a month.",
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
      { value: "Tested", label: "Backups restored from scratch, not just taken" },
    ],
    meta: {
      role: "Sole engineer, architect and only user",
      running: "In daily use since 2026",
      repo: "cortana + cortana-app",
    },
  },
};
