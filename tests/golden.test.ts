// Golden images: every fixture input × layout must reproduce tests/fixtures/expected/<input>.<layout>.png exactly.
// The expected images come from the research baseline (v1's drawing code run verbatim in Chromium, then fixed for
// v1's transparency, colour and strip bugs). On failure, <expected>.actual.png and .diff.png are written next to it.
// To accept an intentional change: pnpm golden:update
import { existsSync, readdirSync } from "node:fs";

import { describe, expect, test } from "vitest";

import { diffImages, generate, getLayout, getTemplate, isLayoutId } from "../src/core/index.ts";
import { fixturesDir, parseInputName, readFixture, writeFixture } from "./helpers.ts";

const cases = readdirSync(`${fixturesDir}expected`)
  .filter((f) => f.endsWith(".png") && !f.endsWith(".actual.png") && !f.endsWith(".diff.png"))
  .map((f) => {
    const [input, layoutId] = f.replace(/\.png$/, "").split(".");
    if (!isLayoutId(layoutId)) throw new Error(`unknown layout in fixture name ${f}`);
    return { file: f, input, layoutId };
  });

describe("golden images", () => {
  test("covers all research fixtures", () => {
    expect(cases.length).toBeGreaterThanOrEqual(20);
  });

  test.each(cases)("$input → $layoutId", ({ file, input, layoutId }) => {
    expect(existsSync(`${fixturesDir}inputs/${input}.png`)).toBe(true);
    const { templateId, tileSize } = parseInputName(`${input}.png`);
    const actual = generate(readFixture(`inputs/${input}.png`), {
      template: getTemplate(templateId),
      tileSize,
      layout: getLayout(layoutId),
    }).image;
    const expected = readFixture(`expected/${file}`);
    const diff = diffImages(actual, expected);
    if (!diff.sameSize || diff.count > 0) {
      writeFixture(`expected/${file.replace(/\.png$/, ".actual.png")}`, actual);
      if (diff.sameSize) writeFixture(`expected/${file.replace(/\.png$/, ".diff.png")}`, diff.image);
    }
    expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
    expect(diff.count).toBe(0);
  });
});
