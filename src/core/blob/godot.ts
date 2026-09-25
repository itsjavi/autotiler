import { E, type Mask, N, NE, NW, S, SE, SW, W } from "./mask.ts";

/** Godot 3 autotile bitmask (3x3 minimal): TL=1 T=2 TR=4 L=8 C=16 R=32 BL=64 B=128 BR=256. */
export function godot3Bitmask(mask: Mask): number {
  let b = 16;
  if (mask & NW) b |= 1;
  if (mask & N) b |= 2;
  if (mask & NE) b |= 4;
  if (mask & W) b |= 8;
  if (mask & E) b |= 32;
  if (mask & SW) b |= 64;
  if (mask & S) b |= 128;
  if (mask & SE) b |= 256;
  return b;
}

/** Godot 4 terrain peering bits for square tiles, in the order Godot writes them (TileSet.CellNeighbor). */
export const GODOT4_PEERING_BITS: ReadonlyArray<readonly [number, string]> = [
  [E, "right_side"],
  [SE, "bottom_right_corner"],
  [S, "bottom_side"],
  [SW, "bottom_left_corner"],
  [W, "left_side"],
  [NW, "top_left_corner"],
  [N, "top_side"],
  [NE, "top_right_corner"],
];

/**
 * Peering bits set to the terrain for a canonical mask. A side bit is set when that neighbour is terrain; a corner
 * bit only when both adjacent sides and the corner are terrain (canonical masks already guarantee that). Every
 * other bit stays unset (-1), which Godot reads as "no terrain" — there is no "don't care".
 */
export function godot4PeeringBits(mask: Mask): string[] {
  return GODOT4_PEERING_BITS.filter(([bit]) => mask & bit).map(([, name]) => name);
}
