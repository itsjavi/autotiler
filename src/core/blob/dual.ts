// Dual grid: terrain lives on the world grid and tiles are drawn on a grid offset by half a tile, so each display
// tile only depends on its four world corners (16 tiles). Each display quadrant is one quarter piece of the world
// cell sitting at that corner: display-TL is the BR quarter of the TL cell, and so on.
import { type Corner, kindFrom, type PieceKind } from "./quarters.ts";

export const DUAL_TL = 1;
export const DUAL_TR = 2;
export const DUAL_BL = 4;
export const DUAL_BR = 8;

/** Filled world corners of a dual tile: TL=1, TR=2, BL=4, BR=8. */
export type DualCorners = number;

export interface DualQuadrant {
  /** whether the world cell providing this quadrant is terrain (otherwise the quadrant stays empty) */
  readonly filled: boolean;
  /** which quarter of that world cell is shown here */
  readonly quarter: Corner;
  readonly kind: PieceKind;
}

// For each display quadrant: [cell bit, cell quarter, vertical neighbour bit, horizontal bit, diagonal bit]
const TABLE: Record<Corner, readonly [number, Corner, number, number, number]> = {
  TL: [DUAL_TL, "BR", DUAL_BL, DUAL_TR, DUAL_BR],
  TR: [DUAL_TR, "BL", DUAL_BR, DUAL_TL, DUAL_BL],
  BL: [DUAL_BL, "TR", DUAL_TL, DUAL_BR, DUAL_TR],
  BR: [DUAL_BR, "TL", DUAL_TR, DUAL_BL, DUAL_TL],
};

export function dualQuadrant(corners: DualCorners, quadrant: Corner): DualQuadrant {
  const [cell, quarter, v, h, d] = TABLE[quadrant];
  return {
    filled: (corners & cell) !== 0,
    quarter,
    kind: kindFrom((corners & v) !== 0, (corners & h) !== 0, (corners & d) !== 0),
  };
}
