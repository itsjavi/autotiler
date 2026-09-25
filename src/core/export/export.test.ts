import { unzipSync } from "fflate";
import { describe, expect, test } from "vitest";

import { readFixture } from "../../../tests/helpers.ts";
import { godot3Bitmask, godot4PeeringBits } from "../blob/godot.ts";
import { generate } from "../generate.ts";
import { decodePng } from "../image/png.ts";
import { autotilerV1, dual16, godot12x4 } from "../layouts/index.ts";
import { autotiler13 } from "../templates/index.ts";
import { sanitizeName, terrainColor } from "./common.ts";
import { exportGodot3, godot3Tres } from "./godot3.ts";
import { exportGodot4, godot4Tres, type Godot4Options } from "./godot4.ts";
import { exportPng, sidecarJson } from "./png.ts";
import { exportTiled, tiledTsx } from "./tiled.ts";
import { zipFiles } from "./zip.ts";

const source = readFixture("inputs/demo-16.png");
const blob = generate(source, { template: autotiler13, tileSize: 16, layout: godot12x4 });
const dual = generate(source, { template: autotiler13, tileSize: 16, layout: dual16 });
const opts: Godot4Options = {
  name: "grass",
  terrainName: "Grass",
  terrainColor: [90, 154, 60],
  collision: true,
  forceNearest: false,
};

describe("godot 4", () => {
  const tres = godot4Tres(blob, opts);

  test("snapshot", async () => {
    await expect(tres).toMatchFileSnapshot("./__snapshots__/grass.godot4.tres");
  });

  test("sources/0 is the last line of [resource], after layers and terrain sets", () => {
    const resource = tres.slice(tres.indexOf("[resource]")).trim().split("\n");
    expect(resource.at(-1)).toBe('sources/0 = SubResource("TileSetAtlasSource_terrain")');
    expect(resource.findIndex((l) => l.startsWith("terrain_set_0/"))).toBeLessThan(resource.length - 1);
    expect(resource.findIndex((l) => l.startsWith("physics_layer_0/"))).toBeLessThan(resource.length - 1);
  });

  test("every tile declares terrain_set, terrain and the peering bits of its mask, in order", () => {
    for (const cell of blob.cells) {
      const id = `${cell.x}:${cell.y}/0`;
      const lines = tres.split("\n").filter((l) => l.startsWith(`${id}/`) || l === `${id} = 0`);
      expect(lines[0]).toBe(`${id} = 0`);
      expect(lines[1]).toBe(`${id}/terrain_set = 0`);
      expect(lines[2]).toBe(`${id}/terrain = 0`);
      const bits = lines
        .filter((l) => l.includes("terrains_peering_bit/"))
        .map((l) => l.split("/").at(-1)?.split(" ")[0]);
      expect(bits).toEqual(godot4PeeringBits(cell.mask ?? 0));
    }
    expect(tres).not.toContain("#");
  });

  test("relative texture path, sizes always written, polygons centred", () => {
    expect(tres).toContain('[ext_resource type="Texture2D" path="grass.png" id="1_texture"]');
    expect(tres).toContain("texture_region_size = Vector2i(16, 16)");
    expect(tres).toContain("tile_size = Vector2i(16, 16)");
    expect(tres).toContain("PackedVector2Array(-8, -8, 8, -8, 8, 8, -8, 8)");
    expect(tres).toContain("terrain_set_0/terrain_0/color = Color(0.3529, 0.6039, 0.2353, 1)");
  });

  test("no collision and force-nearest variants", () => {
    const t = godot4Tres(blob, { ...opts, collision: false, forceNearest: true });
    expect(t).not.toContain("physics_layer_0");
    expect(t).toContain('[sub_resource type="CanvasTexture" id="CanvasTexture_nearest"]');
    expect(t).toContain('texture = SubResource("CanvasTexture_nearest")');
  });

  test("files and dual-grid rejection", () => {
    expect(exportGodot4(blob, opts).map((f) => f.path)).toEqual(["grass.png", "grass.tres"]);
    expect(() => godot4Tres(dual, opts)).toThrow("blob layout");
  });
});

describe("godot 3", () => {
  test("snapshot, all 47 collisions, v1-compatible tile id", async () => {
    const v1 = generate(source, { template: autotiler13, tileSize: 16, layout: autotilerV1 });
    const tres = godot3Tres(v1, { name: "grass", collision: true });
    await expect(tres).toMatchFileSnapshot("./__snapshots__/grass.godot3.tres");
    expect(tres.match(/ConvexPolygonShape2D/g)).toHaveLength(47);
    expect(tres).toContain("load_steps=49");
    expect(tres).toContain("1/autotile/icon_coordinate = Vector2( 3, 3 )");
    for (const c of v1.cells) expect(tres).toContain(`Vector2( ${c.x}, ${c.y} ), ${godot3Bitmask(c.mask ?? 0)}`);
    expect(exportGodot3(v1, { name: "grass", collision: true }).map((f) => f.path)).toEqual([
      "grass.png",
      "grass.png.import",
      "grass.tres",
    ]);
  });
});

describe("tiled", () => {
  test("mixed Wang set for blob layouts, never an all-zero wangid", async () => {
    const tsx = tiledTsx(blob, { name: "grass", terrainName: "Grass", terrainColor: [90, 154, 60] });
    await expect(tsx).toMatchFileSnapshot("./__snapshots__/grass.blob.tsx.xml");
    expect(tsx).toContain('type="mixed"');
    expect(tsx).toContain('tilecount="48" columns="12"');
    const ids = [...tsx.matchAll(/wangid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(47);
    expect(ids).toContain("2,2,2,2,2,2,2,2"); // the isolated tile survives
    expect(ids).not.toContain("0,0,0,0,0,0,0,0");
  });

  test("corner Wang set for the dual grid", async () => {
    const tsx = tiledTsx(dual, { name: "grass", terrainName: "Grass", terrainColor: [90, 154, 60] });
    await expect(tsx).toMatchFileSnapshot("./__snapshots__/grass.dual.tsx.xml");
    expect(tsx).toContain('type="corner"');
    expect(tsx).toContain('wangid="0,2,0,2,0,2,0,2"'); // the empty dual tile
    expect(exportTiled(dual, { name: "grass", terrainName: "", terrainColor: [0, 0, 0] })).toHaveLength(2);
  });
});

describe("png + json", () => {
  test("sidecar describes every tile", () => {
    const doc = JSON.parse(sidecarJson(blob));
    expect(doc).toMatchObject({
      format: "autotiler",
      kind: "blob47",
      layout: "godot-12x4",
      tileSize: 16,
      columns: 12,
      rows: 4,
    });
    expect(doc.tiles).toHaveLength(47);
    expect(JSON.parse(sidecarJson(dual)).tiles).toHaveLength(16);
  });

  test("the exported PNG decodes back to the generated pixels", () => {
    const [png] = exportPng(blob, { name: "grass", sidecar: false });
    if (typeof png.data === "string") throw new Error("PNG data should be binary");
    expect(decodePng(png.data).data).toEqual(blob.image.data);
  });
});

test("zip round trip", () => {
  const files = exportGodot4(blob, opts);
  const zip = unzipSync(zipFiles(files));
  expect(Object.keys(zip)).toEqual(["grass.png", "grass.tres"]);
  expect(new TextDecoder().decode(zip["grass.tres"])).toBe(files[1].data);
  expect(zipFiles(files)).toEqual(zipFiles(files)); // deterministic
});

test("helpers", () => {
  expect(sanitizeName("my grass/tiles?.png")).toBe("my grass_tiles_");
  expect(sanitizeName("forêt-01.png")).toBe("forêt-01");
  expect(sanitizeName("../..")).toBe("tileset");
  expect(terrainColor(blob, source)).toEqual([252, 199, 81]);
});
