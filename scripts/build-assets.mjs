/**
 * Derives the site's image assets from the same source art as the GitHub /
 * LinkedIn header, so the portfolio, the profile and the banner stay one look.
 *
 * Source: PogloLopez/builders/header/background/header.svg — a single embedded
 * PNG. It is extracted once into assets/source/ and committed, so this script
 * does not depend on the other repo being present.
 *
 * Run: npm run assets
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = path.join("assets", "source", "flow-field.png");
const OUT = path.join("public", "hero");

if (!fs.existsSync(SRC)) {
  console.error(`missing source art: ${SRC}`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const base = sharp(SRC);
const { width, height } = await base.metadata();
console.log(`source ${width}x${height}`);

// Wide hero plate. Two widths so small screens do not pull 2400px of art.
for (const w of [1600, 2400]) {
  await sharp(SRC)
    .resize({ width: w })
    .webp({ quality: 74, effort: 6 })
    .toFile(path.join(OUT, `flow-${w}.webp`));
}

// The burst itself, squared, for the icon and for narrow-viewport crops.
// Centre taken from the source art, not guessed at render time.
const burst = { cx: 1942, cy: 700, r: 430 };
const square = sharp(SRC).extract({
  left: burst.cx - burst.r,
  top: burst.cy - burst.r,
  width: burst.r * 2,
  height: burst.r * 2,
});

await square
  .clone()
  .resize({ width: 900 })
  .webp({ quality: 80, effort: 6 })
  .toFile(path.join(OUT, "burst.webp"));

/* -------------------------------------------------------------------------
   The brand mark.

   Source: maieutik-data's logo — a flat violet mark baked onto a near-black
   square with no alpha channel. Luminance separates mark from background
   cleanly, so it becomes the alpha, and the result is a transparent PNG that
   can be recoloured with a CSS filter or sit on any surface.
   ------------------------------------------------------------------------- */
const LOGO = path.join("assets", "source", "mark.png");

if (fs.existsSync(LOGO)) {
  // Source already has a real alpha channel, so the mark only needs trimming
  // to its ink and resizing. Nothing is keyed or recoloured: the violet is the
  // brand's own.
  const trimmed = await sharp(LOGO).ensureAlpha().trim({ threshold: 1 }).png().toBuffer();

  await sharp(trimmed)
    .resize({
      width: 512,
      height: 512,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join("public", "mark.png"));

  // Tab icon: transparent, so the browser shows it on its own tab colour the
  // way a product mark should. Built at final size because sharp runs resize
  // before composite.
  await sharp(trimmed)
    .resize({
      width: 256,
      height: 256,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join("src", "app", "icon.png"));

  // Note: there must be no `src/app/favicon.ico`. Next gives favicon.ico
  // precedence over icon.png, so a stale one silently wins in the tab.

  console.log("mark.png + icon.png written from the maieutik mark");
}

for (const f of fs.readdirSync(OUT)) {
  const { size } = fs.statSync(path.join(OUT, f));
  console.log(`${f.padEnd(18)} ${(size / 1024).toFixed(0)} KB`);
}
