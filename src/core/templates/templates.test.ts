import { describe, expect, test } from "vitest";

import { readFixture } from "../../../tests/helpers.ts";
import { BLOB47 } from "../blob/mask.ts";
import { CORNERS, PIECE_KINDS, pieceKind } from "../blob/quarters.ts";
import { generate } from "../generate.ts";
import { diffImages } from "../image/rgba.ts";
import { godot12x4 } from "../layouts/index.ts";
import { autotiler13, repackTemplate, rpgmakerA2, TEMPLATES } from "./index.ts";

describe.each(TEMPLATES.map((t) => [t.id, t] as const))("%s", (_, template) => {
  test("every blob quarter is sampled from a quarter holding the right piece at the same corner", () => {
    for (const mask of BLOB47) {
      for (const corner of CORNERS) {
        const ref = template.quarterFor(mask, corner);
        expect(ref.corner).toBe(corner);
        expect(ref.tx).toBeLessThan(template.columns);
        expect(ref.ty).toBeLessThan(template.rows);
        expect(template.pieceAt(ref.tx, ref.ty, ref.corner)).toBe(pieceKind(mask, corner));
      }
    }
  });

  test("context-free piece sources (dual grid) hold the requested piece", () => {
    for (const kind of PIECE_KINDS) {
      for (const corner of CORNERS) {
        const ref = template.pieceSource(kind, corner);
        expect(ref.corner).toBe(corner);
        expect(template.pieceAt(ref.tx, ref.ty, corner)).toBe(kind);
      }
    }
  });

  test("slots cover the whole grid", () => {
    expect(template.slots).toHaveLength(template.columns * template.rows);
  });
});

describe("autotiler-13", () => {
  test("1-tile strips take their edges from the matching edge tiles (v1 used the corner tiles)", () => {
    // N-S strip middle (mask N|S): left/right edges of the island's middle row
    expect(autotiler13.quarterFor(17, "TL")).toEqual({ tx: 0, ty: 1, corner: "TL" });
    expect(autotiler13.quarterFor(17, "BR")).toEqual({ tx: 2, ty: 1, corner: "BR" });
    // E-W strip middle (mask E|W): top/bottom edges of the island's middle column
    expect(autotiler13.quarterFor(68, "TR")).toEqual({ tx: 1, ty: 0, corner: "TR" });
    expect(autotiler13.quarterFor(68, "BL")).toEqual({ tx: 1, ty: 2, corner: "BL" });
  });

  test("island tiles are copied whole when the cell matches them", () => {
    // mask E|S|SE is the island's top-left tile: all four quarters come from tile (0,0)
    expect(CORNERS.map((c) => autotiler13.quarterFor(4 | 16 | 8, c))).toEqual(
      CORNERS.map((corner) => ({ tx: 0, ty: 0, corner })),
    );
  });
});

describe("rpgmaker-a2", () => {
  test("the palette thumbnail is never read", () => {
    for (const corner of CORNERS) expect(rpgmakerA2.pieceAt(0, 0, corner)).toBeNull();
  });
});

describe("repackTemplate", () => {
  test("13-tile → A2 matches the research A2 fixture and generates the same tileset", () => {
    const t13 = readFixture("inputs/holes-16.png");
    const a2 = repackTemplate(t13, autotiler13, rpgmakerA2, 16);
    expect(diffImages(a2, readFixture("inputs/a2-holes-16.png")).count).toBe(0);
    const fromA2 = generate(a2, { template: rpgmakerA2, tileSize: 16, layout: godot12x4 }).image;
    const from13 = generate(t13, { template: autotiler13, tileSize: 16, layout: godot12x4 }).image;
    expect(diffImages(fromA2, from13).count).toBe(0);
  });

  test("A2 → 13-tile → A2 round-trips", () => {
    const a2 = readFixture("inputs/a2-demo-16.png");
    const back = repackTemplate(repackTemplate(a2, rpgmakerA2, autotiler13, 16), autotiler13, rpgmakerA2, 16);
    expect(diffImages(back, a2).count).toBe(0);
  });
});
