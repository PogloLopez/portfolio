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
      <head>
        {/* The site's typeface, loaded the way the pages themselves load it.
            The lint rule below is about the pages router; this is the app
            router's root layout, so the link is on every page it renders. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
        />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#05060e",
          color: "#c7ced9",
          font: "16px/1.6 Inter, system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
