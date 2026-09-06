/**
 * Which case studies have a demo. Kept in a server-safe module so a page can
 * decide whether to render the section without importing the client bundle.
 * Adding a demo means adding its slug here and a lazy import in DemoSlot.
 */
export const DEMO_SLUGS = [
  "forecast",
  "market-prices",
  "rag",
  "operations-platform",
  "cortana",
] as const;

export const hasDemo = (slug: string) => (DEMO_SLUGS as readonly string[]).includes(slug);
