// Renders the example templates in public/examples. Nothing is hand-drawn: every template quarter is computed from
// its piece kind alone — the distance to the terrain's edge, the edge's direction and a texture that repeats every
// tile — so any combination of pieces the generator assembles joins without seams. Shapes scale with the tile
// size; outlines stay 1 px.
// Usage: node scripts/make-examples.ts [preview-dir]   (the optional dir gets enlarged previews with test maps)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  autotiler13,
  CORNERS,
  createImage,
  encodePng,
  generate,
  getLayout,
  quarterRect,
  randomMap,
  renderTestMap,
  repackTemplate,
  rpgmakerA2,
  type Corner,
  type PieceKind,
  type RgbaImage,
} from "../src/core/index.ts";

type Rgba = readonly [number, number, number, number];
type Side = "top" | "bottom" | "left" | "right";
type Point = readonly [number, number];

const hex = (s: string): Rgba => [
  Number.parseInt(s.slice(1, 3), 16),
  Number.parseInt(s.slice(3, 5), 16),
  Number.parseInt(s.slice(5, 7), 16),
  255,
];
const ramp = (...colors: string[]): Rgba[] => colors.map(hex);

// ---- tile-periodic randomness -------------------------------------------------------------------------------

const wrap = (i: number, n: number) => ((i % n) + n) % n;

/** Shortest signed offset between two coordinates on a tile-sized loop. */
const torus = (d: number, ts: number) => d - ts * Math.round(d / ts);

function hash(a: number, b: number, seed: number): number {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1) ^ Math.imul(seed + 1, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A per-pixel random value that repeats every tile. */
const grain = (x: number, y: number, ts: number, seed: number) => hash(wrap(x, ts), wrap(y, ts), seed);

/**
 * Smooth value noise that repeats every tile, with `n` × `m` lattice cells per tile. Keep n, m ≥ 4: with 2, a single
 * low value shows up as a stripe that repeats on every tile.
 */
function noise(x: number, y: number, ts: number, n: number, seed: number, m = n): number {
  const gx = ((x + 0.5) / ts) * n;
  const gy = ((y + 0.5) / ts) * m;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const at = (i: number, j: number) => hash(wrap(i, n), wrap(j, m), seed);
  const a = at(x0, y0);
  const b = at(x0 + 1, y0);
  const c = at(x0, y0 + 1);
  const d = at(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** `count` points spread over a tile, at least `gap` px apart (also across tile borders); memoized. */
const scatterCache = new Map<string, Point[]>();
function scatter(ts: number, count: number, gap: number, seed: number): Point[] {
  const key = `${ts}:${count}:${gap}:${seed}`;
  const cached = scatterCache.get(key);
  if (cached) return cached;
  const pts: Point[] = [];
  for (let i = 0; pts.length < count && i < count * 400; i++) {
    const x = hash(i, 1, seed) * ts;
    const y = hash(i, 2, seed) * ts;
    if (pts.every(([px, py]) => torus(x - px, ts) ** 2 + torus(y - py, ts) ** 2 >= gap * gap)) pts.push([x, y]);
  }
  scatterCache.set(key, pts);
  return pts;
}

/** Distances to the nearest and second-nearest point (tile-periodic) and the offset from the nearest one. */
function voronoi(x: number, y: number, pts: readonly Point[], ts: number) {
  let d1 = Infinity;
  let d2 = Infinity;
  let ox = 0;
  let oy = 0;
  for (const [px, py] of pts) {
    const dx = torus(x + 0.5 - px, ts);
    const dy = torus(y + 0.5 - py, ts);
    const d = Math.hypot(dx, dy);
    if (d < d1) {
      d2 = d1;
      d1 = d;
      ox = dx;
      oy = dy;
    } else if (d < d2) d2 = d;
  }
  /** 1 when the pixel is on its cell's top-left side (towards the light), -1 on the far side */
  const facing = -(ox + oy) / (Math.SQRT2 * (d1 + 0.001));
  return { gap: d2 - d1, facing };
}

// ---- piece geometry -------------------------------------------------------------------------------------------

/** What a material sees at one pixel. */
interface Px {
  readonly x: number;
  readonly y: number;
  readonly ts: number;
  /** tile size relative to 16 px */
  readonly k: number;
  /** distance (px) from the terrain's outline, positive inside; Infinity away from every edge */
  readonly d: number;
  /** unit normal pointing into the terrain (0, 0 away from edges) */
  readonly nx: number;
  readonly ny: number;
  /** how much the edge faces the light (top left): 1 lit, -1 in shadow */
  readonly light: number;
  /** outermost visible pixel (a 4-neighbour is outside the terrain) */
  readonly outline: boolean;
  /** outside the plain edge, visible because of an edge bump */
  readonly bump: boolean;
}

interface Material {
  readonly id: string;
  /** px between the cell edge and the terrain (room for bumps) */
  readonly inset: number;
  /** rounding of outer corners at 16 px (scaled with the tile) */
  readonly radius: number;
  /** +1 bump / -1 dent at position `t` along a straight edge (called only away from the tile corners) */
  readonly edge?: (side: Side, t: number, ts: number) => number;
  /** null = transparent */
  readonly color: (p: Px) => Rgba | null;
}

interface Geo {
  readonly d: number;
  readonly bare: number;
  readonly nx: number;
  readonly ny: number;
}

const INSIDE: Geo = { d: Infinity, bare: Infinity, nx: 0, ny: 0 };

/**
 * Signed distance of pixel (x, y) (tile coordinates, may lie outside the quarter) to the outline of piece `kind`
 * at `corner`. Computed as if the corner were top-left (u, v = distance from the corner's two tile sides), then
 * mirrored back.
 */
function geometry(m: Material, kind: PieceKind, corner: Corner, x: number, y: number, ts: number): Geo {
  if (kind === "F") return INSIDE;
  const left = corner === "TL" || corner === "BL";
  const top = corner === "TL" || corner === "TR";
  const u = left ? x + 0.5 : ts - (x + 0.5);
  const v = top ? y + 0.5 : ts - (y + 0.5);
  const sx = left ? 1 : -1;
  const sy = top ? 1 : -1;
  const radius = Math.round((m.radius * ts) / 16);
  const zone = m.inset + radius; // corner zone: no bumps, the outline may curve
  const offset = (side: Side, t: number) => {
    const tt = wrap(t, ts);
    return m.edge && tt >= zone && tt < ts - zone ? m.edge(side, tt, ts) : 0;
  };
  const horizontal = (): Geo => {
    const bare = v - m.inset;
    return { d: bare + offset(top ? "top" : "bottom", x), bare, nx: 0, ny: sy };
  };
  const vertical = (): Geo => {
    const bare = u - m.inset;
    return { d: bare + offset(left ? "left" : "right", y), bare, nx: sx, ny: 0 };
  };
  if (kind === "H") return horizontal();
  if (kind === "V") return vertical();
  if (kind === "I") {
    // the missing cell is the diagonal one: distance to its corner
    const du = Math.max(0, u);
    const dv = Math.max(0, v);
    const r = Math.hypot(du, dv);
    const d = r - m.inset;
    return { d, bare: d, nx: r > 0 ? (sx * du) / r : 0, ny: r > 0 ? (sy * dv) / r : 0 };
  }
  // outer corner, rounded
  if (u < zone && v < zone) {
    const a = zone - u;
    const b = zone - v;
    const r = Math.hypot(a, b);
    const d = radius - r;
    return { d, bare: d, nx: r > 0 ? (sx * a) / r : 0, ny: r > 0 ? (sy * b) / r : 0 };
  }
  const h = horizontal();
  const w = vertical();
  return h.d <= w.d ? h : w;
}

function samplePiece(m: Material, kind: PieceKind, corner: Corner, x: number, y: number, ts: number): Rgba | null {
  const g = geometry(m, kind, corner, x, y, ts);
  if (!(g.d > 0)) return null;
  const visible = (dx: number, dy: number) => geometry(m, kind, corner, x + dx, y + dy, ts).d > 0;
  return m.color({
    x,
    y,
    ts,
    k: ts / 16,
    d: g.d,
    nx: g.nx,
    ny: g.ny,
    light: (g.nx + g.ny) * Math.SQRT1_2,
    outline: !visible(1, 0) || !visible(-1, 0) || !visible(0, 1) || !visible(0, -1),
    bump: !(g.bare > 0),
  });
}

/** The 13-tile template: the island and the inner corners from their pieces, the rest of the 2×2 block as fill. */
function renderTemplate(m: Material, ts: number): RgbaImage {
  const t = autotiler13;
  const img = createImage(t.columns * ts, t.rows * ts);
  for (let ty = 0; ty < t.rows; ty++) {
    for (let tx = 0; tx < t.columns; tx++) {
      for (const corner of CORNERS) {
        const kind = t.pieceAt(tx, ty, corner) ?? (tx >= 3 && ty <= 1 ? "F" : null);
        if (!kind) continue;
        const q = quarterRect(ts, corner);
        for (let y = q.y; y < q.y + q.h; y++) {
          for (let x = q.x; x < q.x + q.w; x++) {
            const c = samplePiece(m, kind, corner, x, y, ts);
            if (c) img.data.set(c, ((ty * ts + y) * img.width + tx * ts + x) * 4);
          }
        }
      }
    }
  }
  return img;
}

// ---- material helpers -----------------------------------------------------------------------------------------

const lit = (p: Px) => p.light > 0.35;
const shaded = (p: Px) => p.light < -0.35;

/** Edge bands: 1 px outline, then rims that widen with the tile size. */
const band = (p: Px, i: number) => p.d < 1 + i * Math.floor(p.k);

/**
 * Which part of a small sprite (rows of chars, "." = none) covers the pixel. Sprites grow with the tile in whole
 * steps (2× at 32 px) unless `fixed`, and are spread `per16` times per 16×16 px.
 */
function sprite(
  p: Px,
  per16: number,
  seed: number,
  sprites: ReadonlyArray<readonly string[]>,
  fixed = false,
): string | null {
  const s = fixed ? 1 : Math.max(1, Math.floor(p.k));
  const count = Math.max(1, Math.round((per16 * p.k * p.k) / (s * s)));
  const size = Math.max(...sprites.map((r) => Math.max(r.length, ...r.map((row) => row.length))));
  const pts = scatter(p.ts, count, (size + 1) * s, seed);
  for (const [i, [px, py]] of pts.entries()) {
    const rows = sprites[i % sprites.length];
    const row = rows[Math.floor(wrap(p.y - Math.floor(py), p.ts) / s)];
    const ch = row?.[Math.floor(wrap(p.x - Math.floor(px), p.ts) / s)];
    if (ch && ch !== ".") return ch;
  }
  return null;
}

/** Voronoi cells whose count per tile stays the same at every tile size. */
const cells = (p: Px, perTile: number, seed: number) =>
  voronoi(p.x, p.y, scatter(p.ts, perTile, (p.ts / Math.sqrt(perTile)) * 0.7, seed), p.ts);

// ---- materials ------------------------------------------------------------------------------------------------

/** Meadow: a flat, top-down patch of grass with a soft, tufty edge. */
const MEADOW_RAMP = ramp("#1d3a2e", "#28573a", "#33703d", "#458c41", "#56a246", "#76bd55", "#a8da72");
const TUFTS = [
  ["L.L", ".M.", "D.D"],
  [".L.", "LML", ".D."],
];
const meadow: Material = {
  id: "meadow",
  inset: 1,
  radius: 3,
  edge: (side, t) => {
    const r = hash(t, side.length, 7);
    return r > 0.8 ? 1 : r < 0.08 ? -1 : 0;
  },
  color: (p) => {
    const [out, g1, g2, g3, g4, g5, g6] = MEADOW_RAMP;
    if (p.outline) return out;
    if (band(p, 1)) return lit(p) ? g6 : shaded(p) ? g1 : g4;
    if (band(p, 2) && shaded(p)) return g2;
    const tuft = sprite(p, 5, 3, TUFTS, true); // blades stay thin at every size
    if (tuft === "L") return g5;
    if (tuft === "M") return g4;
    if (tuft === "D") return g2;
    const g = grain(p.x, p.y, p.ts, 4);
    if (g > 0.94) return g4;
    if (g < 0.04) return g2;
    return noise(p.x, p.y, p.ts, 4 * Math.floor(p.k), 11) > 0.66 ? g4 : g3;
  },
};

/** Pond: top-down water, shaded by the far bank and lit on the near side. */
const POND_RAMP = ramp("#17263f", "#1b3f73", "#215395", "#2a68b0", "#3b86c8", "#62b0e0", "#aee4f5");
const RIPPLES = [["MLLM"], ["MLM"]];
const pond: Material = {
  id: "pond",
  inset: 0,
  radius: 3,
  color: (p) => {
    const [out, w1, w2, w3, w4, w5, w6] = POND_RAMP;
    if (p.outline) return out;
    // a depression: the edges facing the light are shaded by the bank, the others catch it
    if (band(p, 1)) return lit(p) ? w1 : shaded(p) ? w6 : w4;
    if (band(p, 2)) return lit(p) ? w2 : shaded(p) ? w5 : w3;
    if (band(p, 3) && shaded(p)) return w4;
    const ripple = sprite(p, 4, 9, RIPPLES);
    if (ripple === "L") return w5;
    if (ripple === "M") return w4;
    // broken horizontal streaks: the swell
    const swell = Math.sin(((p.y + 0.5) / p.ts) * Math.PI * 4 + 1.3) > 0.5;
    const dash = Math.sin(((p.x + 0.5) / p.ts) * Math.PI * 4 + hash(p.y, 3, 5) * Math.PI * 2) > 0.1;
    return swell && dash ? w2 : w3;
  },
};

/** Grassy ground: side-view platformer dirt with a grass top and pebbles. */
const DIRT_RAMP = ramp("#2a1917", "#4a2b24", "#633a2b", "#7d4d32", "#99633d", "#b87f4f");
const TURF_RAMP = ramp("#173524", "#2c6b37", "#46913f", "#68b449", "#9ad760");
const STONE_RAMP = ramp("#4d4449", "#6f6366", "#948789");
const PEBBLES = [
  [".hs.", "hsss", ".dd."],
  ["hs", "sd"],
  [".h.", "hss", ".dd"],
];
const ground: Material = {
  id: "ground",
  inset: 1,
  radius: 3,
  edge: (side, t) => (side === "top" && hash(t, 1, 5) > 0.7 ? 1 : 0),
  color: (p) => {
    const [out, d1, d2, d3, d4, d5] = DIRT_RAMP;
    const [gOut, g1, g2, g3, g4] = TURF_RAMP;
    if (p.ny > 0.6) {
      // the edge faces up: turf, with blades hanging into the dirt
      const depth = Math.round(4 * p.k) + (hash(p.x, 2, 6) > 0.5 ? 1 : 0);
      if (p.bump) return g2;
      if (p.outline) return gOut;
      if (band(p, 1)) return g4;
      if (band(p, 2)) return g3;
      if (p.d < depth) return g2;
      if (p.d < depth + 1) return g1;
    } else {
      if (p.outline) return out;
      if (band(p, 1)) return lit(p) ? d5 : shaded(p) ? d1 : d3;
      if (band(p, 2) && shaded(p)) return d2;
    }
    const stone = sprite(p, 1.5, 31, PEBBLES);
    if (stone === "h") return STONE_RAMP[2];
    if (stone === "s") return STONE_RAMP[1];
    if (stone === "d") return d1;
    // soft horizontal strata with a few light grains
    if (grain(p.x, p.y, p.ts, 22) > 0.965) return d4;
    const n = 0.6 * noise(p.x, p.y, p.ts, 4, 21, 8) + 0.4 * noise(p.x, p.y, p.ts, 8, 23);
    return n < 0.45 ? d2 : d3;
  },
};

/** Lava: cooled plates drifting on glowing cracks, with a hot rim along the shore. */
const LAVA_RAMP = ramp("#1f1012", "#3b1716", "#5c2118", "#8f2a19", "#d24a1b", "#f47f24", "#fdb43b", "#fff1a8");
const lava: Material = {
  id: "lava",
  inset: 0,
  radius: 3,
  color: (p) => {
    const [out, c1, c2, c3, l1, l2, l3, l4] = LAVA_RAMP;
    if (p.outline) return out;
    if (band(p, 1)) return l3;
    if (band(p, 2)) return l2;
    const v = cells(p, 3, 43);
    if (v.gap < 0.9 * p.k) return l4; // hot crack
    if (v.gap < 1.7 * p.k) return l1; // glow on the plate's rim
    // cooled plates, a little lighter towards the top left
    if (v.gap < 2.6 * p.k) return v.facing > 0.3 ? c3 : c1;
    return grain(p.x, p.y, p.ts, 44) > 0.92 ? c3 : c2;
  },
};

/** Cobblestone: a top-down path of rounded stones. */
const COBBLE_RAMP = ramp("#26232b", "#3d3842", "#5a5360", "#776e7a", "#948a93", "#b3a9ad", "#d2c9c5");
const cobblestone: Material = {
  id: "cobblestone",
  inset: 0,
  radius: 2,
  color: (p) => {
    const [out, k1, k2, k3, k4, k5, k6] = COBBLE_RAMP;
    if (p.outline) return out;
    if (band(p, 1)) return lit(p) ? k6 : shaded(p) ? k1 : k4;
    const v = cells(p, 6, 51);
    if (v.gap < 0.6 + 0.6 * p.k) return k1; // mortar
    if (v.gap < 1.6 + 0.6 * p.k) return v.facing > 0.3 ? k5 : v.facing < -0.3 ? k2 : k3;
    if (band(p, 2) && shaded(p)) return k2;
    return grain(p.x, p.y, p.ts, 52) > 0.9 ? k3 : k4;
  },
};

const MATERIALS = [meadow, pond, ground, lava, cobblestone];

// ---- output ---------------------------------------------------------------------------------------------------

const examplesDir = fileURLToPath(new URL("../public/examples/", import.meta.url));
const previewDir = process.argv[2];

function enlarge(img: RgbaImage, k: number, bg: Rgba): RgbaImage {
  const big = createImage(img.width * k, img.height * k);
  for (let y = 0; y < big.height; y++) {
    for (let x = 0; x < big.width; x++) {
      const i = (Math.floor(y / k) * img.width + Math.floor(x / k)) * 4;
      const a = img.data[i + 3] / 255;
      const px = [0, 1, 2].map((c) => Math.round(img.data[i + c] * a + bg[c] * (1 - a)));
      big.data.set([...px, 255], (y * big.width + x) * 4);
    }
  }
  return big;
}

const PREVIEW_BG: Record<string, string> = {
  meadow: "#8a6a45",
  pond: "#6aa84f",
  ground: "#8fc7e8",
  lava: "#3a3431",
  cobblestone: "#5f8a45",
};

/** The examples the app lists (src/app/features/actions.ts); `a2` also writes the RPG Maker A2 version. */
const SHIPPED: ReadonlyArray<{ id: string; sizes: number[]; a2?: number }> = [
  { id: "meadow", sizes: [16, 32], a2: 16 },
  { id: "pond", sizes: [16] },
  { id: "ground", sizes: [16, 24] },
  { id: "lava", sizes: [16] },
  { id: "cobblestone", sizes: [16, 32] },
];

const sheet: RgbaImage[] = [];
for (const m of MATERIALS) {
  const shipped = SHIPPED.find((s) => s.id === m.id);
  for (const ts of [16, 24, 32]) {
    const template = renderTemplate(m, ts);
    if (shipped?.sizes.includes(ts)) writeFileSync(join(examplesDir, `${m.id}-${ts}px.png`), encodePng(template));
    if (shipped?.a2 === ts) {
      const a2 = repackTemplate(template, autotiler13, rpgmakerA2, ts);
      writeFileSync(join(examplesDir, `${m.id}-a2-${ts}px.png`), encodePng(a2));
    }
    if (previewDir) {
      mkdirSync(previewDir, { recursive: true });
      const bg = hex(PREVIEW_BG[m.id] ?? "#303642");
      const tileset = generate(template, { template: autotiler13, tileSize: ts, layout: getLayout("godot-12x4") });
      const map = renderTestMap(tileset, randomMap(20, 12, 3, 0.55));
      writeFileSync(join(previewDir, `${m.id}-${ts}-template.png`), encodePng(enlarge(template, 4, bg)));
      if (ts === 16) sheet.push(enlarge(template, 4, bg));
      writeFileSync(join(previewDir, `${m.id}-${ts}-map.png`), encodePng(enlarge(map, 48 / ts, bg)));
    }
  }
}

if (previewDir && sheet.length) {
  // every 16 px template in one image, for review
  const w = Math.max(...sheet.map((i) => i.width));
  const all = createImage(
    w,
    sheet.reduce((h, i) => h + i.height + 8, 0),
  );
  let y = 0;
  for (const img of sheet) {
    for (let r = 0; r < img.height; r++) {
      all.data.set(img.data.subarray(r * img.width * 4, (r + 1) * img.width * 4), (y + r) * w * 4);
    }
    y += img.height + 8;
  }
  writeFileSync(join(previewDir, "sheet-16.png"), encodePng(all));
}
