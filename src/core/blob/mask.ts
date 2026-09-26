// Neighbour masks, clockwise from north (the "cr31" blob convention). The same bit order drives every exporter:
// Tiled's wangid lists top, top-right, right, …, top-left, and Godot 4's peering bits run clockwise from the right.

export const N = 1;
export const NE = 2;
export const E = 4;
export const SE = 8;
export const S = 16;
export const SW = 32;
export const W = 64;
export const NW = 128;

/** An 8-bit neighbour mask. Blob masks are always canonical (see `canonical`). */
export type Mask = number;

export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export const DIRECTIONS: ReadonlyArray<{
  readonly name: Direction;
  readonly bit: number;
  readonly dx: number;
  readonly dy: number;
}> = [
  { name: "N", bit: N, dx: 0, dy: -1 },
  { name: "NE", bit: NE, dx: 1, dy: -1 },
  { name: "E", bit: E, dx: 1, dy: 0 },
  { name: "SE", bit: SE, dx: 1, dy: 1 },
  { name: "S", bit: S, dx: 0, dy: 1 },
  { name: "SW", bit: SW, dx: -1, dy: 1 },
  { name: "W", bit: W, dx: -1, dy: 0 },
  { name: "NW", bit: NW, dx: -1, dy: -1 },
];

/**
 * Drops every diagonal whose two adjacent sides are not both set: a corner only shows (as fill or as an inner
 * corner) when the cell continues on both sides. The 256 masks collapse into the 47 blob configurations.
 */
export function canonical(mask: number): Mask {
  let m = mask & 0xff;
  if (!(m & N && m & E)) m &= ~NE;
  if (!(m & S && m & E)) m &= ~SE;
  if (!(m & S && m & W)) m &= ~SW;
  if (!(m & N && m & W)) m &= ~NW;
  return m;
}

export function isCanonical(mask: number): boolean {
  return canonical(mask) === mask;
}

/** The 47 canonical masks, ascending. */
export const BLOB47: readonly Mask[] = [...new Set(Array.from({ length: 256 }, (_, m) => canonical(m)))].toSorted(
  (a, b) => a - b,
);

/** Canonical mask of a cell, given a predicate telling whether the neighbour at (dx, dy) is terrain. */
export function maskOf(isTerrain: (dx: number, dy: number) => boolean): Mask {
  let m = 0;
  for (const d of DIRECTIONS) if (isTerrain(d.dx, d.dy)) m |= d.bit;
  return canonical(m);
}

export function directionsOf(mask: Mask): Direction[] {
  return DIRECTIONS.filter((d) => mask & d.bit).map((d) => d.name);
}
