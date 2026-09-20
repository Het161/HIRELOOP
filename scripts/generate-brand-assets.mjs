/* ============================================================ *
 * Brand asset pipeline — `node scripts/generate-brand-assets.mjs`
 *
 * Source of truth: public/logo.png (2048x2048, ~4MB, fully opaque:
 * the phosphor wordmark on a near-black scanline field).
 *
 * That file is too heavy to ship and its baked-in black background
 * shows as a rectangle on --surface. So we key the dark field out to
 * alpha and emit small, correctly sized derivatives:
 *
 *   public/brand/wordmark.png   transparent wordmark (nav, hero, PDF)
 *   public/brand/mark.png       square "h▊" for tabs and tight spots
 *   src/app/icon.png            favicon (App Router auto-detects)
 *   src/app/apple-icon.png      apple touch icon
 *   src/app/favicon.ico         multi-size .ico (16/32/48/64)
 *   src/app/opengraph-image.png link preview card
 *
 * Re-run this after replacing public/logo.png.
 * ============================================================ */

import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public/logo.png");
const BRAND = join(ROOT, "public/brand");
const APP = join(ROOT, "src/app");

mkdirSync(BRAND, { recursive: true });

/* ---- Geometry measured from the source artwork ------------------ */
const WORDMARK = { x0: 228, y0: 873, x1: 1840, y1: 1177 };
const GLYPH_H = { x0: 228, x1: 364 }; // the leading "h"
const CURSOR = { x0: 1706, x1: 1840 }; // the trailing block
const GLYPH_TOP = 845;
const GLYPH_HEIGHT = 360;

const src = sharp(SRC);
const { width, height } = await src.metadata();
const { data } = await src.raw().toBuffer({ resolveWithObject: true });

/**
 * Luminance -> alpha. The field sits at ~2/255 so it drops out, while
 * the glow around the glyphs is preserved as a soft alpha ramp.
 */
function keyDarkFieldToAlpha() {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, o = 0; i < data.length; i += 4, o += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const alpha = Math.round(Math.min(255, Math.max(0, (lum - 6) * 1.25)));
    // Renormalise chroma so soft edges keep the phosphor green.
    const scale = alpha > 0 ? Math.min(1, 255 / Math.max(r, g, b, 1)) : 1;
    out[o] = Math.min(255, Math.round(r * scale));
    out[o + 1] = Math.min(255, Math.round(g * scale));
    out[o + 2] = Math.min(255, Math.round(b * scale));
    out[o + 3] = alpha;
  }
  return out;
}

const keyed = await sharp(keyDarkFieldToAlpha(), {
  raw: { width, height, channels: 4 },
})
  .png()
  .toBuffer();

/* ---- 1. Wordmark ------------------------------------------------ */
const padX = 26;
const padY = 30;
const wordmarkCrop = {
  left: WORDMARK.x0 - padX,
  top: WORDMARK.y0 - padY,
  width: WORDMARK.x1 - WORDMARK.x0 + padX * 2,
  height: WORDMARK.y1 - WORDMARK.y0 + padY * 2,
};
// 960px covers the largest on-screen use (64px tall hero) at 2x. Palette
// encoding at q90 keeps the glow smooth for a third of the RGBA size.
await sharp(keyed)
  .extract(wordmarkCrop)
  .resize({ width: 960 })
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(join(BRAND, "wordmark.png"));

/* ---- 2. Square mark: "h" + cursor block ------------------------- */
const HALO = 22;
const piece = (g) =>
  sharp(keyed)
    .extract({
      left: g.x0 - HALO,
      top: GLYPH_TOP,
      width: g.x1 - g.x0 + HALO * 2,
      height: GLYPH_HEIGHT,
    })
    .toBuffer();

const hBuf = await piece(GLYPH_H);
const cursorBuf = await piece(CURSOR);
const hW = GLYPH_H.x1 - GLYPH_H.x0 + HALO * 2;
const cursorW = CURSOR.x1 - CURSOR.x0 + HALO * 2;
const GAP = 14;
const contentW = hW + GAP + cursorW;
const side = Math.round(Math.max(contentW, GLYPH_HEIGHT) * 1.18);

const mark = await sharp({
  create: {
    width: side,
    height: side,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    {
      input: hBuf,
      top: Math.round((side - GLYPH_HEIGHT) / 2),
      left: Math.round((side - contentW) / 2),
    },
    {
      input: cursorBuf,
      top: Math.round((side - GLYPH_HEIGHT) / 2),
      left: Math.round((side - contentW) / 2) + hW + GAP,
    },
  ])
  .png()
  .toBuffer();

// Displayed at 20-32px; 256 is ample even at 2x, and palette encoding
// takes it from 228KB to ~11KB — it loads in the navbar on every page.
await sharp(mark)
  .resize(256, 256)
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(join(BRAND, "mark.png"));

/* ---- 3. App icons ----------------------------------------------- */
const tile = async (size, inset) =>
  sharp({
    create: { width: size, height: size, channels: 4, background: "#0d0e0c" },
  })
    .composite([
      { input: await sharp(mark).resize(Math.round(size * inset)).toBuffer(), gravity: "centre" },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

writeFileSync(join(APP, "icon.png"), await tile(128, 0.74));
writeFileSync(join(APP, "apple-icon.png"), await tile(180, 0.66));

/* ---- 4. favicon.ico (PNG-encoded entries, 16/32/48/64) ---------- */
const icoSizes = [16, 32, 48, 64];
const icoPngs = await Promise.all(
  icoSizes.map((s) =>
    sharp(join(APP, "icon.png"))
      .resize(s, s, { kernel: "lanczos3" })
      .png({ compressionLevel: 9 })
      .toBuffer(),
  ),
);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = 6 + 16 * icoSizes.length;
const entries = icoSizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(icoPngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += icoPngs[i].length;
  return e;
});
writeFileSync(
  join(APP, "favicon.ico"),
  Buffer.concat([header, ...entries, ...icoPngs]),
);

/* ---- 5. Open Graph card ----------------------------------------- */
await sharp({
  create: { width: 1200, height: 630, channels: 4, background: "#0d0e0c" },
})
  .composite([
    {
      input: await sharp(keyed).extract(wordmarkCrop).resize({ width: 820 }).toBuffer(),
      gravity: "centre",
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(join(APP, "opengraph-image.png"));

console.log("brand assets written to public/brand and src/app");
