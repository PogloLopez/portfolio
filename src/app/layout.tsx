import type { Metadata } from "next";
import { site } from "@/lib/site";

/**
 * The pages are static HTML built by src/site/build.cjs into public/site/, and
 * next.config.ts rewrites / and /projects/<slug> onto them, so this layout
 * only wraps what Next still renders itself: the 404 page. (The social cards
 * are opengraph-image routes and need no layout.)
 */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: `Not found · ${site.shortName}`,
  robots: { index: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#05060e",
          color: "#c7ced9",
          font: "16px/1.6 system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
