/**
 * Live or static, decided the same way the landing decides it (sequence.js):
 * motion only with no reduced-motion preference, a fine pointer and a window
 * at least 780px wide. The landing's styles key every idle loop and the
 * carousel's drift off `html.seq-live`, so the project pages set the same
 * class and switch it live when any of those conditions change.
 *
 * Loaded in <head>, so the first paint already has the right mode.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var queries = [
    window.matchMedia("(prefers-reduced-motion: reduce)"),
    window.matchMedia("(pointer: coarse)"),
    window.matchMedia("(min-width: 780px)"),
  ];

  function live() {
    return !queries[0].matches && !queries[1].matches && queries[2].matches;
  }

  function apply() {
    var on = live();
    root.classList.toggle("seq-live", on);
    root.classList.toggle("seq-static", !on);
    // carousel.js listens for this to drop any tilt it left behind.
    document.dispatchEvent(new CustomEvent("seq:mode", { detail: { mode: on ? "live" : "static" } }));
  }

  apply();
  queries.forEach(function (q) {
    q.addEventListener("change", apply);
  });
})();
