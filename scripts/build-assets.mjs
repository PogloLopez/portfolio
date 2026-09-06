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

/**
 * Lifts a flat-coloured mark off a flat background into real transparency.
 *
 * The brand files ship as the mark painted onto an opaque plate (the one named
 * "no_bg" is a white plate with a fully opaque alpha channel, which is why it
 * still shows a box on a dark page). Trimming only crops the border; the plate
 * behind the glyph survives.
 *
 * A blended edge pixel is `P = a*C + (1-a)*B` for mark colour C over background
 * B, so alpha recovers exactly: `a = (B - P) / (B - C)`, measured on whichever
 * channel separates C from B the most. Output is flat C with that alpha, which
 * keeps anti-aliased edges smooth instead of stair-stepped.
 */
async function keyOut(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const ch = info.channels;

  // Background is whatever fills the corners.
  const bg = [data[0], data[1], data[2]];

  // Mark colour: the pixel furthest from the background, which for a flat
  // glyph is the glyph itself.
  let best = -1;
  let mark = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const o = i * ch;
    const d =
      Math.abs(data[o] - bg[0]) + Math.abs(data[o + 1] - bg[1]) + Math.abs(data[o + 2] - bg[2]);
    if (d > best) {
      best = d;
      mark = [data[o], data[o + 1], data[o + 2]];
    }
  }

  // Measure alpha on the channel with the widest separation.
  let k = 0;
  for (let c = 1; c < 3; c++) {
    if (Math.abs(bg[c] - mark[c]) > Math.abs(bg[k] - mark[k])) k = c;
  }
  const span = bg[k] - mark[k];

  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const a = Math.round(((bg[k] - data[i * ch + k]) / span) * 255);
    out[i * 4] = mark[0];
    out[i * 4 + 1] = mark[1];
    out[i * 4 + 2] = mark[2];
    out[i * 4 + 3] = Math.max(0, Math.min(255, a));
  }

  console.log(
    `mark keyed: glyph rgb(${mark.join(",")}) off background rgb(${bg.join(",")})`,
  );

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .png()
    .toBuffer();
}

if (fs.existsSync(LOGO)) {
  const cut = await keyOut(LOGO);

  for (const [size, target] of [
    [512, path.join("public", "mark.png")],
    [256, path.join("src", "app", "icon.png")],
  ]) {
    await sharp(cut)
      .resize({
        width: size,
        height: size,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toFile(target);
  }

  // Note: there must be no `src/app/favicon.ico`. Next gives favicon.ico
  // precedence over icon.png, so a stale one silently wins in the tab.

  console.log("mark.png + icon.png written from the maieutik mark");
}

for (const f of fs.readdirSync(OUT)) {
  const { size } = fs.statSync(path.join(OUT, f));
  console.log(`${f.padEnd(18)} ${(size / 1024).toFixed(0)} KB`);
}
