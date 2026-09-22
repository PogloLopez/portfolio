import type { NextConfig } from "next";

/**
 * The pages are static HTML, built by src/site/build.cjs into public/site/.
 * These rewrites serve them at the site's real addresses. They run before the
 * filesystem check (beforeFiles), so / reaches the landing even though there
 * is no app/page.tsx.
 */
const nextConfig: NextConfig = {
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
