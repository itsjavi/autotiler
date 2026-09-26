// End-to-end check against a real Godot 4 (headless): export TileSets, let Godot import them, paint a mask with
// TileMapLayer.set_cells_terrain_connect and compare every chosen tile with the tile whose neighbour mask matches.
// Skipped unless a Godot 4 binary is found (GODOT_BIN, /Applications/Godot.app, or `godot`/`godot4` on PATH).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { exportGodot4, generate, getLayout, getTemplate, type LayoutId, maskOf } from "../../src/core/index.ts";
import { readFixture } from "../helpers.ts";

function findGodot4(): string | null {
  const candidates = [
    process.env.GODOT_BIN,
    "/Applications/Godot.app/Contents/MacOS/Godot",
    ...(process.env.PATH ?? "").split(delimiter).flatMap((d) => [join(d, "godot"), join(d, "godot4")]),
  ].filter((c): c is string => !!c && existsSync(c));
  for (const bin of candidates) {
    try {
      if (execFileSync(bin, ["--headless", "--version"], { encoding: "utf8" }).trim().startsWith("4.")) return bin;
    } catch {
      // not a runnable Godot 4
    }
  }
  return null;
}

// islands, strips, rings, holes, T-junctions, diagonal-only contacts and a checkerboard (141 terrain cells)
const MASK = [
  "....................",
  ".##.###########.....",
  ".##.#.........#.#.#.",
  "....#.#####.#.#.....",
  ".#..#.#...#.#.#.#.#.",
  "....#.#.#.#.#.#.#...",
  ".##.#.#...#...#.#.#.",
  ".#..#.#####.###.....",
  "....#.......#.##.##.",
  ".#.##########.#..##.",
  "..#.#.......#.......",
  ".#..#.#.#.#.#.###.#.",
  "....###.#.###.#.#.#.",
  "..........#...###.#.",
  "..#####...........#.",
  "..#####..#.#.#......",
  "..##.##...#.#.......",
  "..#####..#.#.#......",
  "..#####.............",
  "....................",
];

const CASES: Array<{
  id: string;
  input: string;
  tileSize: number;
  layout: LayoutId;
  collision: boolean;
  forceNearest: boolean;
}> = [
  { id: "godot12x4_16", input: "demo-16", tileSize: 16, layout: "godot-12x4", collision: true, forceNearest: false },
  { id: "v1_8", input: "demo-8", tileSize: 8, layout: "autotiler-v1", collision: true, forceNearest: false },
  { id: "gamemaker_32", input: "demo-32", tileSize: 32, layout: "gamemaker-47", collision: true, forceNearest: false },
  {
    id: "nearest_nocollision",
    input: "holes-16",
    tileSize: 16,
    layout: "godot-12x4",
    collision: false,
    forceNearest: true,
  },
];

const terrain = (x: number, y: number) => MASK[y]?.[x] === "#";

interface GodotResult {
  info: { tiles: number; tile_size: number[]; physics_layers: number; terrain_mode: number };
  chosen: Record<string, [number, number]>;
  extra_cells: unknown[];
}

const godot = findGodot4();

describe.skipIf(!godot)("Godot 4 terrain painting", () => {
  let project = "";
  let home = "";
  const run = (args: string[]) =>
    execFileSync(godot!, ["--headless", "--path", project, ...args], {
      encoding: "utf8",
      env: { ...process.env, HOME: home }, // keep Godot's editor settings/caches out of the user's home
      stdio: ["ignore", "pipe", "pipe"],
    });

  beforeAll(() => {
    project = mkdtempSync(join(tmpdir(), "autotiler-godot-"));
    home = join(project, ".home");
    mkdirSync(home);
    cpSync(new URL("./project/", import.meta.url), project, { recursive: true });
    writeFileSync(join(project, "mask.txt"), `${MASK.join("\n")}\n`);
    for (const c of CASES) {
      const tileset = generate(readFixture(`inputs/${c.input}.png`), {
        template: getTemplate("autotiler-13"),
        tileSize: c.tileSize,
        layout: getLayout(c.layout),
      });
      const dir = join(project, "terrain", c.id);
      mkdirSync(dir, { recursive: true });
      const files = exportGodot4(tileset, {
        name: c.id,
        terrainName: c.id,
        terrainColor: [90, 154, 60],
        collision: c.collision,
        forceNearest: c.forceNearest,
      });
      for (const f of files) writeFileSync(join(dir, f.path), f.data);
    }
    mkdirSync(join(project, "out"));
    run(["--import"]);
  }, 180_000);

  afterAll(() => {
    if (project) rmSync(project, { recursive: true, force: true });
  });

  test.each(CASES)(
    "$id: every painted cell gets the tile of its neighbour mask",
    (c) => {
      const log = run([
        "--script",
        "res://validate.gd",
        "--",
        `res://terrain/${c.id}/${c.id}.tres`,
        "res://mask.txt",
        `res://out/${c.id}.json`,
      ]);
      expect(log).not.toMatch(/ERROR|SCRIPT ERROR/);
      const result: GodotResult = JSON.parse(readFileSync(join(project, "out", `${c.id}.json`), "utf8"));
      expect(result.info).toMatchObject({
        tiles: 47,
        tile_size: [c.tileSize, c.tileSize],
        terrain_mode: 0,
        physics_layers: c.collision ? 1 : 0,
      });

      const layout = getLayout(c.layout);
      if (layout.kind !== "blob") throw new Error("blob layouts only");
      const at = new Map(layout.cells.map((cell) => [cell.mask, `${cell.x},${cell.y}`]));
      const mismatches = Object.entries(result.chosen).filter(([key, got]) => {
        const [x, y] = key.split(",").map(Number);
        return at.get(maskOf((dx, dy) => terrain(x + dx, y + dy))) !== got.join(",");
      });
      expect(Object.keys(result.chosen)).toHaveLength(141);
      expect(mismatches).toEqual([]);
      expect(result.extra_cells).toEqual([]);
    },
    60_000,
  );
});
