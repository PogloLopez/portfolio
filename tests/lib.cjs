/**
 * What every test shares: the site under test and the content it was built
 * from.
 *
 * The tests drive a running server, the same one a reviewer opens:
 *
 *   npm run build && npx next start -p 4030
 *   npm test                          (or BASE=<url> npm test)
 *
 * BASE defaults to http://localhost:4030. It can be any deployment, a Vercel
 * preview included, as long as it is reachable without a login.
 */
const BASE = (process.env.BASE || "http://localhost:4030").replace(/\/$/, "");

const urls = {
  home: `${BASE}/`,
  project: (slug) => `${BASE}/projects/${slug}`,
};

// src/content/projects.ts, compiled the same way build.cjs compiles it.
async function loadProjects() {
  const { loadContent } = require("../src/site/build.cjs");
  return (await loadContent()).projects;
}

// The tests used to start their own static server; the site is now served by
// Next, so this only hands back its address.
const serve = async () => ({ server: { close() {} }, url: urls.home, base: BASE });

module.exports = { BASE, urls, loadProjects, serve };
