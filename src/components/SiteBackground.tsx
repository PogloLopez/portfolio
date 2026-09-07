/**
 * The page background: one fixed layer behind the whole document, so content
 * scrolls over it while it stays put.
 *
 * Deliberately minimal, and deliberately NOT the hero artwork. The flow-field
 * image at the top of the home page is a header: it belongs to that one
 * section. This is the room the rest of the site sits in, so it is nothing but
 * a dot grid, two slow auroras, and a parallax factor small enough that you
 * notice depth rather than motion.
 */
export function SiteBackground() {
  return (
    <div aria-hidden className="site-bg">
      <div className="site-bg__aurora site-bg__aurora--a" />
      <div className="site-bg__aurora site-bg__aurora--b" />
      <div className="site-bg__grid" />
    </div>
  );
}
