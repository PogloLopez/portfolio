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
  const { data, info } = await sharp(LOGO).greyscale().raw().toBuffer({ resolveWithObject: true });

  // Build RGBA directly: flat accent colour, alpha taken from the source's
  // luminance. Doing it as a composite blend does not work — a greyscale PNG
  // is fully opaque, so `dest-in` would key against nothing.
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const v = data[i];
    rgba[i * 4] = 124;
    rgba[i * 4 + 1] = 92;
    rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = v <= 28 ? 0 : v >= 90 ? 255 : Math.round(((v - 28) / 62) * 255);
  }

  const cut = await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 1 })
    .png()
    .toBuffer();

  await sharp(cut)
    .resize({
      width: 512,
      height: 512,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join("public", "mark.png"));

  // Tab icon: the same mark on the site's ground, so it reads at 16px.
  // Note: there must be no `src/app/favicon.ico`. Next gives favicon.ico
  // precedence over icon.png, so a stale one silently wins in the tab.
  // Built at its final size — sharp runs resize before composite, so shrinking
  // after the overlay would try to paste the mark onto a smaller base.
  await sharp({
    create: { width: 256, height: 256, channels: 4, background: "#05060e" },
  })
    .composite([
      {
        input: await sharp(cut)
          .resize({
            width: 184,
            height: 184,
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toBuffer(),
        gravity: "center",
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join("src", "app", "icon.png"));

  console.log("mark.png + icon.png written from the maieutik mark");
}

for (const f of fs.readdirSync(OUT)) {
  const { size } = fs.statSync(path.join(OUT, f));
  console.log(`${f.padEnd(18)} ${(size / 1024).toFixed(0)} KB`);
}
