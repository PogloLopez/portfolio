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
    "I'm the data and automation engineer at Mercaldas, a retail grocery chain in Colombia, and the only person there who writes code.",
    "I built the weekly demand forecast for thousands of product and store combinations, a market price platform the commercial team now takes into supplier negotiations, and an assistant that answers business questions with verified numbers instead of invented ones.",
    "Next I want to apply the same engineering to energy access and distributed generation data, on a team where I'm not the person who knows the most in the room.",
  ],

  url: "https://pablo-lopez.vercel.app",

  contact: {
    email: "poglolopez@gmail.com",
    linkedin: "https://linkedin.com/in/pablo-a-lopez-s",
    linkedinLabel: "linkedin.com/in/pablo-a-lopez-s",
    github: "https://github.com/PogloLopez",
    githubLabel: "github.com/PogloLopez",
    location: "Manizales, Colombia · open to remote",
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
  { value: "1,000s", label: "Series forecast every week, in production" },
  { value: "Double digit", label: "Percent forecast error cut vs. the ERP" },
  { value: "5 systems", label: "Designed, built and operated solo" },
  { value: "Zero", label: "Business figures invented by a model" },
] as const;
