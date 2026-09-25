import { describe, expect, test } from "vitest";

import { BLOB47 } from "../blob/mask.ts";
import { DEFAULT_LAYOUT_ID, dual16, getLayout, LAYOUTS } from "./index.ts";

describe.each(LAYOUTS.filter((l) => l.kind === "blob").map((l) => [l.id, l] as const))("%s", (_, layout) => {
  test("holds each of the 47 canonical masks exactly once, inside the grid", () => {
    const masks = layout.cells.map((c) => c.mask).toSorted((a, b) => a - b);
    expect(masks).toEqual([...BLOB47]);
    const positions = new Set(layout.cells.map((c) => `${c.x},${c.y}`));
    expect(positions.size).toBe(47);
    for (const c of layout.cells) {
      expect(c.x).toBeLessThan(layout.columns);
      expect(c.y).toBeLessThan(layout.rows);
    }
  });
});

test("dual-16 holds each corner combination once", () => {
  expect(dual16.cells.map((c) => c.corners).toSorted((a, b) => a - b)).toEqual([...Array(16).keys()]);
});

test("GameMaker layout keeps tile index 0 empty", () => {
  const gm = getLayout("gamemaker-47");
  expect(gm.cells.some((c) => c.x === 0 && c.y === 0)).toBe(false);
});

test("the default layout is the Godot docs 12×4 template", () => {
  expect(getLayout(DEFAULT_LAYOUT_ID).id).toBe("godot-12x4");
});
