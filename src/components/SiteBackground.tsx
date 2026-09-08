import { NeuralField } from "@/components/NeuralField";

/**
 * The page background: one fixed layer behind the whole document, so content
 * scrolls over it while it stays put.
 *
 * Deliberately NOT the hero artwork. The flow-field image at the top of the
 * home page is a header and belongs to that section; this is the room the rest
 * of the site sits in. It carries two slow auroras, a masked dot grid, and the
 * neural field that starts assembled and decomposes as the page scrolls.
 */
export function SiteBackground() {
  return (
    <div aria-hidden className="site-bg">
      <div className="site-bg__aurora site-bg__aurora--a" />
      <div className="site-bg__aurora site-bg__aurora--b" />
      <div className="site-bg__grid" />
      <NeuralField />
    </div>
  );
}
