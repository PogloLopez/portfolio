/**
 * The page background: one fixed layer behind the whole document, so content
 * scrolls over it while it stays put.
 *
 * Deliberately NOT the hero artwork. The flow-field image at the top of the
 * home page is a header and belongs to that section; this is the room the rest
 * of the site sits in. It carries two slow auroras and a masked dot grid.
 *
 * The neural field is NOT here. It used to be, spanning the whole document, and
 * that is unfixable: measured across breakpoints the rightmost hero glyph moves
 * between 54% and 91% of the viewport, and the stat strip runs the full width at
 * every size, so no fixed mask can keep the field off every piece of text. It
 * lives inside the hero now, over the artwork, where nothing is ever written.
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
