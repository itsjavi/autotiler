// The examples the app ships are valid templates: the kind and tile size are detected, and nothing is flagged.
// (They're rendered by scripts/make-examples.ts, except v1's beveled block.)
import { readdirSync, readFileSync } from "node:fs";

import { expect, test } from "vitest";

import { analyzeSource, decodePng } from "../src/core/index.ts";

const dir = new URL("../public/examples/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".png"));

test.each(files)("%s is a clean template", (file) => {
  const analysis = analyzeSource(decodePng(readFileSync(new URL(file, dir))));
  expect(analysis.template?.id).toBe(file.includes("-a2-") ? "rpgmaker-a2" : "autotiler-13");
  expect(analysis.tileSize).toBe(Number(/(\d+)px\.png$/.exec(file)?.[1]));
  expect(analysis.issues.filter((i) => i.level !== "info")).toEqual([]);
});
