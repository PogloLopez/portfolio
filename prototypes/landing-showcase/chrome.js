/**
 * Page chrome for the prototype: the slim top bar, anchor scrolling that
 * clears it, and the idle switch that stops off-screen animation.
 *
 * Same house style as the rest: one passive scroll listener at most, no
 * libraries, and every repeated job handed to an IntersectionObserver rather
 * than to a scroll handler.
 */
(function () {
  "use strict";

  var topbar = document.querySelector(".topbar");

  /* -------------------------------------------------------------------------
     Top bar. Fixed and on screen from the first frame to the last (the CSS
     handles that); this only measures its real height into --topbar-h so
     the page can reserve the matching space instead of sitting underneath
     it. Re-measured on resize, since the bar wraps to a second line under
     560px.
  ------------------------------------------------------------------------- */

  function syncTopbarHeight() {
    if (!topbar) return;
    document.documentElement.style.setProperty("--topbar-h", topbar.offsetHeight + "px");
  }

  if (topbar) {
    syncTopbarHeight();
    window.addEventListener("resize", syncTopbarHeight);
    if (window.ResizeObserver) new ResizeObserver(syncTopbarHeight).observe(topbar);
  }

  /* -------------------------------------------------------------------------
     Idle switch.

     Every project picture animates on a loop, and the recap carousel holds
     eleven of them. Off-screen they are pure waste: the browser still runs
     each animation and repaints the card. Marking a section `data-idle`
     pauses everything inside it (see the CSS), which is what keeps the
     sequence smooth on a machine with a weak GPU and few cores.
  ------------------------------------------------------------------------- */

  var idleTargets = [].slice.call(document.querySelectorAll("[data-idle]"));

  if (idleTargets.length && window.IntersectionObserver) {
    var idleObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.setAttribute("data-idle", entry.isIntersecting ? "0" : "1");
        });
      },
      // A margin, so a section is awake slightly before it is scrolled into
      // view and its loops are already running when it arrives.
      { rootMargin: "200px 0px" },
    );
    idleTargets.forEach(function (el) {
      idleObserver.observe(el);
    });
  } else {
    // Without the observer nothing is ever marked idle: everything animates,
    // exactly as it did before.
    idleTargets.forEach(function (el) {
      el.setAttribute("data-idle", "0");
    });
  }

  /* -------------------------------------------------------------------------
     Anchor scrolling that clears the fixed bar, and respects reduced motion.
  ------------------------------------------------------------------------- */

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.addEventListener("click", function (e) {
    var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var id = link.getAttribute("href").slice(1);
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return; // the project CTAs point at pages this prototype has not got
    e.preventDefault();
    var bar = topbar ? topbar.offsetHeight : 0;
    var y = Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - bar - 8);
    window.scrollTo({ top: y, behavior: reduced.matches ? "auto" : "smooth" });
    // Keep the keyboard with the pointer: the target owns focus after the jump.
    if (target.tabIndex < 0) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  });
})();
