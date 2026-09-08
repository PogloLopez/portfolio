/**
 * The page background: one fixed layer behind the whole document, so content
 * scrolls over it while it stays put.
 *
 * Deliberately NOT the hero artwork. The flow-field image at the top of the
 * home page is a header and belongs to that section; this is the room the rest
 * of the site sits in. It carries two slow auroras and a masked dot grid.
 *
 * The neural field is a sibling of this layer rather than a child of it, and
 * sits one step in front. This layer is at z-index -10, and so is the hero's
 * own artwork, which means anything inside here is painted over by the hero's
 * gradient and simply invisible for the first screen of the home page. See
 * components/NeuralField.tsx.
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
