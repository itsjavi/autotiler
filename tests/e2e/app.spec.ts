// Smoke tests of the web build: the UI wires the core correctly and exports the exact golden pixels.
import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import { unzipSync } from "fflate";

import { decodePng, diffImages } from "../../src/core/index.ts";

const golden = decodePng(readFileSync(new URL("../fixtures/expected/demo-16.godot-12x4.png", import.meta.url)));

async function openExample(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Beveled block, 16 px Autotiler/ }).click();
  await expect(page.getByRole("img", { name: /Generated tileset, 47 tiles/ })).toBeVisible();
  await expect(page.getByText("80×48 px · 5×3 tiles of 16 px")).toBeVisible();
}

async function download(page: Page, button: RegExp): Promise<Buffer> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: button }).click();
  const file = await pending;
  const path = await file.path();
  return readFileSync(path);
}

test("an example exports the golden PNG", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const png = await download(page, /^Download$/);
  const diff = diffImages(decodePng(new Uint8Array(png)), golden);
  expect(diff.sameSize).toBe(true);
  expect(diff.count).toBe(0);
});

test("Godot 4 export downloads a zip with the PNG and a terrain TileSet", async ({ page }) => {
  await openExample(page);
  const zip = unzipSync(new Uint8Array(await download(page, /^Download$/)));
  expect(Object.keys(zip).toSorted()).toEqual(["autotiler13-16px-autotile.png", "autotiler13-16px-autotile.tres"]);
  const tres = new TextDecoder().decode(zip["autotiler13-16px-autotile.tres"]);
  expect(tres).toContain('path="autotiler13-16px-autotile.png"');
  expect(tres).toContain("terrain_set_0/mode = 0");
  expect(tres.match(/\/terrain = 0$/gm)).toHaveLength(47);
  expect(diffImages(decodePng(zip["autotiler13-16px-autotile.png"]), golden).count).toBe(0);
});

test("the dual grid only offers formats that support it, and the test map paints", async ({ page }) => {
  await openExample(page);
  await page.getByRole("combobox", { name: "Layout" }).click();
  await page.getByRole("option", { name: /Dual grid/ }).click();
  await expect(page.getByRole("button", { name: "Godot 4" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "PNG", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Test map" }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  const map = page.getByRole("img", { name: /Test map/ });
  const box = await map.boundingBox();
  if (!box) throw new Error("no test map");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 8 });
  await page.mouse.up();
  // the map is persisted (debounced), so poll the saved state
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem("autotiler:v2");
        const cells: unknown = raw ? JSON.parse(raw).map?.cells : "";
        return typeof cells === "string" ? cells.split("").filter((c) => c === "1").length : 0;
      }),
    )
    .toBeGreaterThan(3);
});
