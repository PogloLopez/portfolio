import type { NextConfig } from "next";

/**
 * The pages are static HTML, built by src/site/build.cjs into public/site/.
 * These rewrites serve them at the site's real addresses. They run before the
 * filesystem check (beforeFiles), so / reaches the landing even though there
 * is no app/page.tsx.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The files behind the rewrites, so a page is not reachable at two
      // addresses. Redirects are applied before the rewrites below, and a
      // rewritten request does not go through them again.
      { source: "/site/index.html", destination: "/", permanent: true },
      { source: "/site/projects/:slug.html", destination: "/projects/:slug", permanent: true },
      // Browsers that ask for /favicon.ico anyway. The icon is a Next
      // metadata route, and an app/favicon.ico file would take precedence
      // over it.
      { source: "/favicon.ico", destination: "/icon.png", permanent: true },
    ];
  },

  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/site/index.html" },
        { source: "/projects/:slug", destination: "/site/projects/:slug.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
