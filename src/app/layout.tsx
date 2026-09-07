import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SiteBackground } from "@/components/SiteBackground";
import { BackgroundParallax } from "@/components/BackgroundParallax";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.shortName} · ${site.role}`,
    template: `%s · ${site.shortName}`,
  },
  description: site.oneLiner,
  authors: [{ name: site.name, url: site.contact.github }],
  openGraph: {
    type: "website",
    siteName: `${site.shortName} · ${site.role}`,
    locale: "en",
    title: `${site.shortName} · ${site.role}`,
    description: site.oneLiner,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <SiteBackground />
        <BackgroundParallax />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100 focus:rounded-md focus:bg-surface-2 focus:px-4 focus:py-2 focus:text-sm focus:text-fg"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
