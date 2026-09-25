// Regenerates the README images in docs/images: screenshots of the running app and enlarged blank templates.
// Usage: `pnpm dev` (or `pnpm build && pnpm preview`), then `node scripts/screenshots.ts [url]`.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { createImage, encodePng, renderGuide, TEMPLATES, type RgbaImage } from "../src/core/index.ts";

const url = process.argv[2] ?? "http://localhost:5173/";
const out = (name: string) => fileURLToPath(new URL(`../docs/images/${name}`, import.meta.url));

/** Nearest-neighbour enlargement, for crisp pixels on GitHub (which drops image-rendering styles). */
function enlarge(img: RgbaImage, k: number): RgbaImage {
  const big = createImage(img.width * k, img.height * k);
  for (let y = 0; y < big.height; y++) {
    for (let x = 0; x < big.width; x++) {
      const from = (Math.floor(y / k) * img.width + Math.floor(x / k)) * 4;
      big.data.set(img.data.subarray(from, from + 4), (y * big.width + x) * 4);
    }
  }
  return big;
}

for (const template of TEMPLATES) {
  writeFileSync(out(`template-${template.id}.png`), encodePng(enlarge(renderGuide(template, 16), 4)));
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 860 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
await page.goto(url);
await page.getByRole("button", { name: /Beveled block, 16 px Autotiler/ }).click();
const tileset = page.getByRole("img", { name: /Generated tileset/ });
await tileset.waitFor();
const box = await tileset.boundingBox();
if (!box) throw new Error("the tileset isn't visible");
await page.mouse.move(box.x + box.width * (4.5 / 12), box.y + box.height * (1.5 / 4)); // hover a tile: inspector
await page.screenshot({ path: out("app.png") });

await page.getByRole("tab", { name: "Test map" }).click();
await page.getByRole("img", { name: /Test map/ }).waitFor();
await page.getByRole("main").screenshot({ path: out("test-map.png") });
await browser.close();
