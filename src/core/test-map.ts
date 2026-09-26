// A small terrain map to try a tileset: paint cells, render them with the generated tiles exactly as Godot's
// terrain painting (blob) or a dual-grid renderer would.
import { BLOB47, maskOf, type Mask } from "./blob/mask.ts";
import type { Tileset } from "./generate.ts";
import { copyRect, copyRectClipped, createImage, type RgbaImage } from "./image/rgba.ts";

export interface TestMap {
  readonly width: number;
  readonly height: number;
  /** row-major, 1 = terrain */
  readonly cells: Uint8Array;
}

export function createTestMap(width: number, height: number): TestMap {
  return { width, height, cells: new Uint8Array(width * height) };
}

export function isTerrain(map: TestMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height && map.cells[y * map.width + x] === 1;
}

export function setCell(map: TestMap, x: number, y: number, terrain: boolean): TestMap {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height || isTerrain(map, x, y) === terrain) return map;
  const cells = map.cells.slice();
  cells[y * map.width + x] = terrain ? 1 : 0;
  return { ...map, cells };
}

export function blobMaskAt(map: TestMap, x: number, y: number): Mask {
  return maskOf((dx, dy) => isTerrain(map, x + dx, y + dy));
}

/** Filled corners (TL=1 TR=2 BL=4 BR=8) of the display tile whose centre is the world grid point (X, Y). */
export function dualCornersAt(map: TestMap, X: number, Y: number): number {
  return (
    (isTerrain(map, X - 1, Y - 1) ? 1 : 0) |
    (isTerrain(map, X, Y - 1) ? 2 : 0) |
    (isTerrain(map, X - 1, Y) ? 4 : 0) |
    (isTerrain(map, X, Y) ? 8 : 0)
  );
}

/** Renders the map with the tileset; empty cells stay transparent. */
export function renderTestMap(tileset: Tileset, map: TestMap): RgbaImage {
  const ts = tileset.tileSize;
  const out = createImage(map.width * ts, map.height * ts);
  if (tileset.layout.kind === "blob") {
    const byMask = new Map(tileset.layout.cells.map((c) => [c.mask, c]));
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (!isTerrain(map, x, y)) continue;
        const cell = byMask.get(blobMaskAt(map, x, y));
        if (cell) copyRect(tileset.image, cell.x * ts, cell.y * ts, ts, ts, out, x * ts, y * ts);
      }
    }
  } else {
    const byCorners = new Map(tileset.layout.cells.map((c) => [c.corners, c]));
    const half = ts / 2;
    for (let Y = 0; Y <= map.height; Y++) {
      for (let X = 0; X <= map.width; X++) {
        const corners = dualCornersAt(map, X, Y);
        const cell = corners ? byCorners.get(corners) : undefined;
        if (cell) copyRectClipped(tileset.image, cell.x * ts, cell.y * ts, ts, ts, out, X * ts - half, Y * ts - half);
      }
    }
  }
  return out;
}

/** A map containing every blob configuration once: each of the 47 masks stamped as a 3×3 neighbourhood. */
export function allBlobCombinations(columns = 8): TestMap {
  const rows = Math.ceil(BLOB47.length / columns);
  let map = createTestMap(columns * 4 + 1, rows * 4 + 1);
  const stamp = (cx: number, cy: number, mask: Mask) => {
    map = setCell(map, cx, cy, true);
    for (const [bit, dx, dy] of [
      [1, 0, -1],
      [2, 1, -1],
      [4, 1, 0],
      [8, 1, 1],
      [16, 0, 1],
      [32, -1, 1],
      [64, -1, 0],
      [128, -1, -1],
    ] as const) {
      if (mask & bit) map = setCell(map, cx + dx, cy + dy, true);
    }
  };
  BLOB47.forEach((mask, i) => stamp((i % columns) * 4 + 2, Math.floor(i / columns) * 4 + 2, mask));
  return map;
}

/** A map containing every dual-grid corner combination: 2×2 stamps. */
export function allDualCombinations(): TestMap {
  let map = createTestMap(4 * 3 + 1, 4 * 3 + 1);
  for (let corners = 0; corners < 16; corners++) {
    const x = (corners % 4) * 3 + 1;
    const y = Math.floor(corners / 4) * 3 + 1;
    if (corners & 1) map = setCell(map, x, y, true);
    if (corners & 2) map = setCell(map, x + 1, y, true);
    if (corners & 4) map = setCell(map, x, y + 1, true);
    if (corners & 8) map = setCell(map, x + 1, y + 1, true);
  }
  return map;
}

/** Blobby random terrain (seeded noise smoothed by a few cellular-automaton passes). */
export function randomMap(width: number, height: number, seed = 1, density = 0.5): TestMap {
  let state = seed >>> 0 || 1;
  const rand = () => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let cells = new Uint8Array(width * height).map(() => (rand() < density ? 1 : 0));
  for (let pass = 0; pass < 3; pass++) {
    const next = new Uint8Array(cells.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < width && yy < height) n += cells[yy * width + xx];
          }
        }
        next[y * width + x] = n >= 5 ? 1 : 0;
      }
    }
    cells = next;
  }
  return { width, height, cells };
}
