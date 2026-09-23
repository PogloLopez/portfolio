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

  /* On a phone the whole sequence is one tall column of five projects, so the
     section-wide switch above would keep all five loops running from the
     first project to the last. Each project block and each carousel card gets
     its own switch there instead, which is what keeps a phone animating only
     the one picture its owner is looking at.

     Static layout only: in the pinned sequence the panels are stacked in one
     sticky stage, where a panel's own box says nothing about whether it can
     be seen. */
  var blocks = [].slice.call(document.querySelectorAll(".panel, .mcard, .pp-hero__viz"));
  var perBlock = false;

  function syncPerBlock() {
    var on = !document.documentElement.classList.contains("seq-live");
    if (on === perBlock) return;
    perBlock = on;
    blocks.forEach(function (el) {
      if (on) {
        el.setAttribute("data-idle", "1");
        if (blockObserver) blockObserver.observe(el);
      } else {
        el.removeAttribute("data-idle");
        if (blockObserver) blockObserver.unobserve(el);
      }
    });
  }

  var idleTargets = [].slice.call(document.querySelectorAll("[data-idle]"));
  var blockObserver = null;

  if (blocks.length && window.IntersectionObserver) {
    blockObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.setAttribute("data-idle", entry.isIntersecting ? "0" : "1");
        });
      },
      { rootMargin: "120px 0px" },
    );
    syncPerBlock();
    document.addEventListener("seq:mode", syncPerBlock);
    window.matchMedia("(min-width: 780px)").addEventListener("change", syncPerBlock);
  }

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

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* -------------------------------------------------------------------------
     Arrival on scroll (static layout only).

     With the pinned sequence a project assembles itself as you scrub into it.
     A phone gets the plain stacked layout instead, and five blocks that are
     simply there, fully formed, before you reach them read as a long document
     rather than as work being shown to you. Each block's parts now rise into
     place as it comes up the screen: the same move as the sequence's, once
     per part, transform and opacity only.

     Hidden from JavaScript, never from the markup: with the script blocked,
     or reduced motion asked for, every part is visible from the first paint.
  ------------------------------------------------------------------------- */

  var REVEAL =
    ".panel [data-part], .pp-story__body > *, .pp-demo__live, .pp-more__inner > *, .recap .section-label, .mstrip";
  var revealObserver = null;

  function startReveals() {
    if (revealObserver || reduced.matches || !window.IntersectionObserver) return;
    if (document.documentElement.classList.contains("seq-live")) return;
    var parts = [].slice.call(document.querySelectorAll(REVEAL));
    if (!parts.length) return;
    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-reveal", "in");
          revealObserver.unobserve(entry.target);
        });
      },
      // Bottom margin: a block starts arriving just before its top edge clears
      // the fold, so it is settled by the time it is properly on screen.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );
    parts.forEach(function (el) {
      // Anything already on screen at load keeps its place: an arrival the
      // reader never sees is just a flash.
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9) return;
      el.setAttribute("data-reveal", "off");
      // A short stagger inside each block, so the parts land in reading order.
      var siblings = el.parentNode ? [].slice.call(el.parentNode.children) : [];
      var n = Math.min(siblings.indexOf(el), 5);
      if (n > 0) el.style.transitionDelay = n * 70 + "ms";
      revealObserver.observe(el);
    });
  }

  startReveals();
  // A window narrowed past the sequence's threshold drops to the same stacked
  // layout, and gets the same arrivals from there on.
  document.addEventListener("seq:mode", startReveals);

  /* -------------------------------------------------------------------------
     Anchor scrolling that clears the fixed bar, and respects reduced motion.
  ------------------------------------------------------------------------- */


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
    // Smooth only for a short hop. "Contact me" from the top of the landing
    // is a jump across the whole pinned sequence (12 screens): animated, it
    // takes seconds and flashes every project past on the way.
    var far = Math.abs(y - window.pageYOffset) > window.innerHeight * 3;
    window.scrollTo({ top: y, behavior: reduced.matches || far ? "auto" : "smooth" });
    // Keep the keyboard with the pointer: the target owns focus after the jump.
    if (target.tabIndex < 0) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  });
})();
