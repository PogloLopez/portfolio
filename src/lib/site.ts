/**
 * Who the site is about, for the pages' <head> (src/site/head.cjs), the social
 * cards and the 404 page.
 */
export const site = {
  name: "Pablo Alejandro López Sánchez",
  shortName: "Pablo López",
  role: "Data & AI Engineer",

  /** The meta description and social card text for the landing. */
  oneLiner:
    "I build forecasting systems, data pipelines and AI agents that run in production.",

  /**
   * The canonical address, which is the custom domain and not the
   * `*.vercel.app` one. Canonical links and social card URLs point here: with
   * the Vercel address, a page served from pablo.maieutik-data.com would tell
   * crawlers and link previews to fetch its card from pablo-lopez.vercel.app.
   */
  url: "https://pablo.maieutik-data.com",
} as const;
