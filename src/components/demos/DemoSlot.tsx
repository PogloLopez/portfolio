"use client";

import dynamic from "next/dynamic";

/**
 * Loads a case study's demo lazily, so a visitor reading one project does not
 * download the other four. Keep this map in step with `registry.ts`, which is
 * the server-safe list a page uses to decide whether to render the section.
 */
const demos: Record<string, React.ComponentType> = {
  forecast: dynamic(() => import("./ForecastDemo").then((m) => m.ForecastDemo)),
  "market-prices": dynamic(() => import("./MarketPricesDemo").then((m) => m.MarketPricesDemo)),
  rag: dynamic(() => import("./RagDemo").then((m) => m.RagDemo)),
  "operations-platform": dynamic(() => import("./OperationsDemo").then((m) => m.OperationsDemo)),
  cortana: dynamic(() => import("./CortanaDemo").then((m) => m.CortanaDemo)),
};

export function DemoSlot({ slug }: { slug: string }) {
  const Demo = demos[slug];
  return Demo ? <Demo /> : null;
}
