import { describe, expect, test } from "vitest";

import { analyzeSource, detectTemplate } from "./detect.ts";
import { copyRect, createImage } from "./image/rgba.ts";

const solid = (w: number, h: number) => {
  const img = createImage(w, h);
  img.data.fill(255);
  return img;
};

describe("detectTemplate", () => {
  test("picks the template from the aspect ratio", () => {
    expect(detectTemplate(80, 48)?.id).toBe("autotiler-13");
    expect(detectTemplate(40, 24)?.id).toBe("autotiler-13");
    expect(detectTemplate(32, 48)?.id).toBe("rpgmaker-a2");
    expect(detectTemplate(96, 144)?.id).toBe("rpgmaker-a2");
    expect(detectTemplate(81, 48)?.id).toBe("autotiler-13"); // close enough to explain the fix
    expect(detectTemplate(100, 20)).toBeNull();
  });
});

describe("analyzeSource", () => {
  test("detects the tile size", () => {
    expect(analyzeSource(solid(80, 48))).toMatchObject({ tileSize: 16, issues: [] });
    expect(analyzeSource(solid(64, 96))).toMatchObject({ tileSize: 32, issues: [] });
  });

  test("explains how to fix a wrong size", () => {
    const r = analyzeSource(solid(81, 48));
    expect(r.tileSize).toBeNull();
    expect(r.issues[0]).toMatchObject({ level: "error", code: "size-mismatch" });
    expect(r.issues[0].message).toContain("crop it to 80×48");
  });

  test("warns about odd tile sizes and empty slots", () => {
    const img = solid(75, 45);
    // clear the island's centre tile (15 px tiles)
    copyRect(createImage(15, 15), 0, 0, 15, 15, img, 15, 15);
    const r = analyzeSource(img);
    expect(r.tileSize).toBe(15);
    expect(r.issues.map((i) => i.code)).toEqual(["odd-tile-size", "empty-slot"]);
    expect(r.issues[1].message).toContain("centre");
  });

  test("manual tile size and template override detection", () => {
    const r = analyzeSource(solid(90, 50), "autotiler-13", 16);
    expect(r).toMatchObject({ tileSize: 16 });
    expect(r.issues.map((i) => i.code)).toEqual(["oversized"]);
    expect(analyzeSource(solid(80, 48), "autotiler-13", 17).issues[0].code).toBe("size-mismatch");
  });

  test("unknown sizes are an error", () => {
    expect(analyzeSource(solid(100, 20)).issues[0].code).toBe("unknown-size");
  });
});
