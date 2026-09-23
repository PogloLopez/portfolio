/**
 * Which kinds of motion this visit gets. Two independent switches, both set
 * on <html> before the first paint (this file is loaded in <head>):
 *
 *   .seq-live   the landing's pinned sequence, the carousel's drift and the
 *               cursor tilt. They need a mouse and room: motion allowed, a
 *               fine pointer, and a window at least 780px wide.
 *   .viz-live   the project pictures' own loops (the chart drawing itself,
 *               the conversation arriving, the bars breathing). They are the
 *               work's only moving proof, so a phone gets them too: motion
 *               allowed is the whole test.
 *
 * Off-screen loops are paused by the idle switch in chrome.js, which is what
 * keeps a phone's battery out of this.
 *
 * sequence.js sets .seq-live itself on the landing (it owns the sequence);
 * this file is the project pages' copy of that decision, and the only place
 * .viz-live is set on either page.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  var coarse = window.matchMedia("(pointer: coarse)");
  var wide = window.matchMedia("(min-width: 780px)");
  var queries = [calm, coarse, wide];

  // On the landing the tag carries data-sequence: sequence.js is there and it
  // owns .seq-live, so this file only sets .viz-live. Everywhere else it sets
  // both. (Read from the tag, not from the document: this runs in <head>,
  // where the page's own markup does not exist yet.)
  var owned = document.currentScript && document.currentScript.hasAttribute("data-sequence");

  function apply() {
    var motion = !calm.matches;
    var live = motion && !coarse.matches && wide.matches;
    root.classList.toggle("viz-live", motion);
    if (owned) return;
    root.classList.toggle("seq-live", live);
    root.classList.toggle("seq-static", !live);
    // carousel.js listens for this to drop any tilt it left behind.
    document.dispatchEvent(new CustomEvent("seq:mode", { detail: { mode: live ? "live" : "static" } }));
  }

  apply();
  queries.forEach(function (q) {
    q.addEventListener("change", apply);
  });
})();
