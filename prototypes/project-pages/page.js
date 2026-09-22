/**
 * The "See more" panel.
 *
 * It is a native <dialog> opened with showModal(), so the browser already
 * does the hard parts: focus moves into it and cannot leave, Escape closes
 * it, the page behind is inert to assistive tech, and focus returns to the
 * button afterwards. This file only adds what the element lacks: an exit
 * animation (a dialog closes instantly otherwise), closing on a click outside
 * the panel, and holding the page's scroll position still while it is open.
 */
(function () {
  "use strict";

  var sheet = document.getElementById("tech");
  if (!sheet || typeof sheet.showModal !== "function") return;

  var openers = [].slice.call(document.querySelectorAll('[aria-controls="tech"]'));
  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var closing = false;

  function open() {
    if (sheet.open) return;
    root.classList.add("pp-locked");
    sheet.showModal();
    // Always start at the top of the panel, however far it was scrolled last time.
    var body = sheet.querySelector(".pp-sheet__body");
    if (body) body.scrollTop = 0;
  }

  // Plays the exit animation, then really closes. With reduced motion there is
  // no animation to wait for.
  function close() {
    if (!sheet.open || closing) return;
    if (reduced.matches) {
      finish();
      return;
    }
    closing = true;
    sheet.classList.add("is-closing");
    var done = false;
    function end() {
      if (done) return;
      done = true;
      finish();
    }
    sheet.addEventListener("animationend", end, { once: true });
    // A backstop, in case the animation never runs (a hidden tab, say).
    window.setTimeout(end, 400);
  }

  function finish() {
    closing = false;
    sheet.classList.remove("is-closing");
    sheet.close();
  }

  sheet.addEventListener("close", function () {
    root.classList.remove("pp-locked");
  });

  // Escape fires "cancel": take it over so the exit animation still plays.
  sheet.addEventListener("cancel", function (e) {
    e.preventDefault();
    close();
  });

  // A click that lands on the dialog element itself, not on anything inside
  // it, is a click on the dimmed area around the panel.
  sheet.addEventListener("click", function (e) {
    if (e.target === sheet) close();
  });

  sheet.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", close);
  });

  openers.forEach(function (btn) {
    btn.addEventListener("click", open);
  });
})();
