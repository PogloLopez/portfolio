export const site = {
  name: "Pablo Alejandro López Sánchez",
  shortName: "Pablo López",
  role: "Data & AI Engineer",
  tagline: "Operational complexity, solved with data & AI.",

  /** The five-second version, for the hero. */
  oneLiner:
    "I build forecasting systems, data pipelines and AI agents that run in production.",

  /** The longer version, for /about and for meta descriptions. */
  intro: [
    "I'm a data and automation engineer at Mercaldas, a retail grocery chain in Colombia, where I build the systems behind forecasting, pricing and internal operations.",
    "I build the data platform behind the weekly demand forecast for over 100,000 product and store combinations, a market price platform the commercial team takes into supplier negotiations, and an assistant that answers business questions with verified numbers instead of invented ones.",
    "Outside work I build my own infrastructure, and I'm interested in how these same methods apply to energy data: load forecasting, distributed generation, and the reliability problems that come with both.",
  ],

  /**
   * The canonical address, which is the custom domain and not the
   * `*.vercel.app` one. This feeds `metadataBase`, so it decides where every
   * canonical link and social card URL points: with the Vercel address here,
   * a page served from pablo.maieutik-data.com still told crawlers and link
   * previews to fetch its card from pablo-lopez.vercel.app.
   */
  url: "https://pablo.maieutik-data.com",

  contact: {
    email: "poglolopez@gmail.com",
    linkedin: "https://linkedin.com/in/pablo-a-lopez-s",
    linkedinLabel: "linkedin.com/in/pablo-a-lopez-s",
    github: "https://github.com/PogloLopez",
    githubLabel: "github.com/PogloLopez",
    location: "Manizales, Colombia",
  },

  cv: {
    en: "https://github.com/PogloLopez/PogloLopez/raw/main/assets/cv/Pablo-Lopez-CV-EN.pdf",
    es: "https://github.com/PogloLopez/PogloLopez/raw/main/assets/cv/Pablo-Lopez-CV-ES.pdf",
  },
} as const;

/**
 * The headline figures on the home page. Four, deliberately, and every business
 * number from Mercaldas is an order of magnitude or a percentage, never an
 * exact figure.
 */
export const headlineStats = [
  {
    value: "100,000+",
    label: "Product and store combinations forecast every week, across 14 stores",
  },
  {
    value: "70-82%",
    label: "Forecast accuracy across the whole company's catalogue, by demand cluster",
  },
  {
    value: "52 weeks",
    label: "Price forecast horizon, read by the commercial team before they negotiate",
  },
  {
    value: "Zero",
    label:
      "Numbers invented by the AI assistant: every figure it answers with is read from the database",
  },
] as const;
