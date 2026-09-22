/**
 * The part of <head> every page shares: title, description, canonical
 * address, the social card and the icon, plus Vercel Web Analytics.
 *
 * The social card images are the app's own opengraph-image routes
 * (src/app/opengraph-image.tsx and src/app/projects/[slug]/opengraph-image.tsx).
 * Their URLs are absolute, on the canonical domain, because link previews
 * fetch them from outside.
 */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Web Analytics' script is served by Vercel at /_vercel/insights/script.js on
// a deployment and nowhere else, so it is only requested off localhost. The
// stub queues any call made before it loads, as @vercel/analytics does.
const ANALYTICS = `    <script>
      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
      if (!/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(location.hostname)) {
        var va = document.createElement("script");
        va.defer = true;
        va.src = "/_vercel/insights/script.js";
        document.head.appendChild(va);
      }
    </script>`;

function head({ site, title, description, path, image }) {
  const url = new URL(path, site.url).href;
  const img = new URL(image, site.url).href;
  return [
    `    <title>${esc(title)}</title>`,
    `    <meta name="description" content="${esc(description)}" />`,
    `    <link rel="canonical" href="${esc(url)}" />`,
    `    <link rel="icon" href="/icon.png" type="image/png" />`,
    `    <meta name="author" content="${esc(site.name)}" />`,
    `    <meta property="og:type" content="website" />`,
    `    <meta property="og:site_name" content="${esc(`${site.shortName} · ${site.role}`)}" />`,
    `    <meta property="og:locale" content="en" />`,
    `    <meta property="og:title" content="${esc(title)}" />`,
    `    <meta property="og:description" content="${esc(description)}" />`,
    `    <meta property="og:url" content="${esc(url)}" />`,
    `    <meta property="og:image" content="${esc(img)}" />`,
    `    <meta property="og:image:width" content="1200" />`,
    `    <meta property="og:image:height" content="630" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${esc(title)}" />`,
    `    <meta name="twitter:description" content="${esc(description)}" />`,
    `    <meta name="twitter:image" content="${esc(img)}" />`,
    ANALYTICS,
  ].join("\n");
}

module.exports = { head };
