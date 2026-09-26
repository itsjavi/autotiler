import { describe, expect, test } from "vitest";

import { autotilerV1 } from "../layouts/blob.ts";
import { dualQuadrant } from "./dual.ts";
import { godot3Bitmask, godot4PeeringBits } from "./godot.ts";
import { BLOB47, canonical, E, isCanonical, maskOf, N, NE, NW, S, SE, SW, W } from "./mask.ts";
import { CORNERS, pieceKind, quarterRect } from "./quarters.ts";

describe("masks", () => {
  test("256 masks collapse into the 47 blob configurations", () => {
    expect(BLOB47).toHaveLength(47);
    for (let m = 0; m < 256; m++) expect(BLOB47).toContain(canonical(m));
    for (const m of BLOB47) expect(isCanonical(m)).toBe(true);
  });

  test("a corner only counts when both adjacent sides do", () => {
    expect(canonical(NE)).toBe(0);
    expect(canonical(N | NE)).toBe(N);
    expect(canonical(N | E | NE)).toBe(N | E | NE);
    expect(canonical(0xff)).toBe(0xff);
  });

  test("maskOf reads neighbours clockwise from north", () => {
    const filled = new Set(["0,-1", "1,0", "1,-1", "-1,1"]);
    expect(maskOf((dx, dy) => filled.has(`${dx},${dy}`))).toBe(N | NE | E);
  });
});

describe("quarter pieces", () => {
  test("piece kinds", () => {
    expect(pieceKind(0, "TL")).toBe("O");
    expect(pieceKind(E, "TR")).toBe("H");
    expect(pieceKind(S, "BR")).toBe("V");
    expect(pieceKind(S | E, "BR")).toBe("I");
    expect(pieceKind(S | E | SE, "BR")).toBe("F");
    expect(pieceKind(S | E | SE, "TL")).toBe("O");
  });

  test("the 47 configurations use all 20 pieces", () => {
    const seen = new Set(BLOB47.flatMap((m) => CORNERS.map((c) => `${pieceKind(m, c)}@${c}`)));
    expect(seen.size).toBe(20);
  });

  test("odd tile sizes split unevenly but consistently", () => {
    expect(quarterRect(16, "BR")).toEqual({ x: 8, y: 8, w: 8, h: 8 });
    expect(quarterRect(15, "TL")).toEqual({ x: 0, y: 0, w: 7, h: 7 });
    expect(quarterRect(15, "BR")).toEqual({ x: 7, y: 7, w: 8, h: 8 });
  });
});

describe("engine bits", () => {
  // bitmask_flags of Autotiler v1.2.0 (resources/templates/tileset.tres), verified against the tiles' art
  // prettier-ignore
  const V1: Record<string, number> = {
    "0,0": 432, "0,1": 438, "0,2": 54, "0,3": 48, "1,0": 504, "1,1": 511, "1,2": 63, "1,3": 56,
    "2,0": 216, "2,1": 219, "2,2": 27, "2,3": 24, "3,0": 144, "3,1": 146, "3,2": 18, "3,3": 16,
    "4,0": 176, "4,1": 182, "4,2": 434, "4,3": 50, "4,4": 178, "5,0": 248, "5,1": 255, "5,2": 507,
    "5,3": 59, "5,4": 251, "6,0": 440, "6,1": 447, "6,2": 510, "6,3": 62, "6,4": 446, "7,0": 152,
    "7,1": 155, "7,2": 218, "7,3": 26, "7,4": 154, "8,0": 184, "8,1": 191, "8,2": 506, "8,3": 58,
    "8,4": 186, "9,0": 443, "9,1": 254, "9,2": 442, "9,3": 190, "10,2": 250, "10,3": 187,
  };

  test("Godot 3 bitmasks match v1's template for its 11×5 layout", () => {
    const derived = Object.fromEntries(autotilerV1.cells.map((c) => [`${c.x},${c.y}`, godot3Bitmask(c.mask)]));
    expect(derived).toEqual(V1);
  });

  test("Godot 4 peering bits follow CellNeighbor order", () => {
    expect(godot4PeeringBits(0)).toEqual([]);
    expect(godot4PeeringBits(N | E | S | W | NE | SE | SW | NW)).toEqual([
      "right_side",
      "bottom_right_corner",
      "bottom_side",
      "bottom_left_corner",
      "left_side",
      "top_left_corner",
      "top_side",
      "top_right_corner",
    ]);
    expect(godot4PeeringBits(S | E)).toEqual(["right_side", "bottom_side"]);
  });
});

describe("dual grid", () => {
  test("a dual quadrant is the opposite quarter of the world cell at that corner", () => {
    // only the TL world cell filled: display-TL shows that cell's BR quarter as an outer corner
    expect(dualQuadrant(1, "TL")).toEqual({ filled: true, quarter: "BR", kind: "O" });
    expect(dualQuadrant(1, "TR").filled).toBe(false);
    // all filled: every quadrant is fill
    for (const q of CORNERS) expect(dualQuadrant(15, q).kind).toBe("F");
    // TL+TR+BL: display-TL is the TL cell's BR quarter with both sides filled but not the diagonal → inner corner
    expect(dualQuadrant(7, "TL")).toEqual({ filled: true, quarter: "BR", kind: "I" });
  });

  test("dual quadrants agree with blob pieces of the same world configuration", () => {
    // world cells a(TL) b(TR) c(BL) d(BR): the BR quarter of `a` must be the blob piece of a's neighbourhood
    for (let corners = 0; corners < 16; corners++) {
      const q = dualQuadrant(corners, "TL");
      if (!q.filled) continue;
      const mask = canonical((corners & 2 ? E : 0) | (corners & 4 ? S : 0) | (corners & 8 ? SE : 0));
      expect(q.kind).toBe(pieceKind(mask, "BR"));
    }
  });
});
