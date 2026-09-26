import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { decodePng, encodePng, type RgbaImage } from "../src/core/index.ts";

export const fixturesDir = fileURLToPath(new URL("./fixtures/", import.meta.url));

export function readFixture(path: string): RgbaImage {
  return decodePng(readFileSync(`${fixturesDir}${path}`));
}

export function writeFixture(path: string, img: RgbaImage): void {
  writeFileSync(`${fixturesDir}${path}`, encodePng(img));
}

/** Fixture inputs are named `<name>-<tileSize>.png`; `a2-` prefix = RPG Maker A2 template. */
export function parseInputName(file: string): {
  name: string;
  templateId: "autotiler-13" | "rpgmaker-a2";
  tileSize: number;
} {
  const name = file.replace(/\.png$/, "");
  return {
    name,
    templateId: name.startsWith("a2-") ? "rpgmaker-a2" : "autotiler-13",
    tileSize: Number(name.split("-").pop()),
  };
}
