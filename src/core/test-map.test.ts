import { describe, expect, test } from "vitest";

import { readFixture } from "../../tests/helpers.ts";
import { BLOB47 } from "./blob/mask.ts";
import { generate } from "./generate.ts";
import { diffImages } from "./image/rgba.ts";
import { dual16, godot12x4 } from "./layouts/index.ts";
import { autotiler13 } from "./templates/index.ts";
import {
  allBlobCombinations,
  allDualCombinations,
  blobMaskAt,
  dualCornersAt,
  randomMap,
  renderTestMap,
} from "./test-map.ts";

describe("test map", () => {
  test("the combinations pattern contains all 47 blob configurations", () => {
    const map = allBlobCombinations();
    const seen = new Set<number>();
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) if (map.cells[y * map.width + x]) seen.add(blobMaskAt(map, x, y));
    }
    expect([...seen].toSorted((a, b) => a - b)).toEqual([...BLOB47]);
  });

  test("the dual pattern contains all 16 corner combinations", () => {
    const map = allDualCombinations();
    const seen = new Set<number>();
    for (let y = 0; y <= map.height; y++) for (let x = 0; x <= map.width; x++) seen.add(dualCornersAt(map, x, y));
    expect(seen.size).toBe(16);
  });

  test("random maps are deterministic per seed", () => {
    expect(randomMap(20, 10, 7).cells).toEqual(randomMap(20, 10, 7).cells);
    expect(randomMap(20, 10, 7).cells).not.toEqual(randomMap(20, 10, 8).cells);
  });

  test("a dual-16 rendering is pixel-identical to the blob-47 rendering for context-free art", () => {
    const source = readFixture("inputs/holes-16.png");
    const map = randomMap(24, 16, 3);
    const blob = renderTestMap(generate(source, { template: autotiler13, tileSize: 16, layout: godot12x4 }), map);
    const dual = renderTestMap(generate(source, { template: autotiler13, tileSize: 16, layout: dual16 }), map);
    expect(diffImages(blob, dual).count).toBe(0);
  });
});
