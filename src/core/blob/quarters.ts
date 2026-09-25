// Every autotile is made of four quarter tiles. A quarter at corner c of a terrain cell looks like one of five
// pieces depending on its vertical side (v), horizontal side (h) and diagonal (d) neighbours:
//   O outer corner (!v !h) · H horizontal edge (!v h) · V vertical edge (v !h) · I inner corner (v h !d) · F fill
// 5 kinds × 4 corners = the 20 pieces every template in the wild is a packing of.
import { E, type Mask, N, NE, NW, S, SE, SW, W } from "./mask.ts";

export type Corner = "TL" | "TR" | "BL" | "BR";
export const CORNERS: readonly Corner[] = ["TL", "TR", "BL", "BR"];

export type PieceKind = "O" | "H" | "V" | "I" | "F";
export const PIECE_KINDS: readonly PieceKind[] = ["O", "H", "V", "I", "F"];

export const PIECE_NAMES: Record<PieceKind, string> = {
  O: "outer corner",
  H: "horizontal edge",
  V: "vertical edge",
  I: "inner corner",
  F: "fill",
};

export const CORNER_NEIGHBORS: Record<
  Corner,
  { readonly vertical: number; readonly horizontal: number; readonly diagonal: number }
> = {
  TL: { vertical: N, horizontal: W, diagonal: NW },
  TR: { vertical: N, horizontal: E, diagonal: NE },
  BL: { vertical: S, horizontal: W, diagonal: SW },
  BR: { vertical: S, horizontal: E, diagonal: SE },
};

export function isLeft(c: Corner): boolean {
  return c === "TL" || c === "BL";
}

export function isTop(c: Corner): boolean {
  return c === "TL" || c === "TR";
}

export function kindFrom(v: boolean, h: boolean, d: boolean): PieceKind {
  if (!v && !h) return "O";
  if (!v) return "H";
  if (!h) return "V";
  return d ? "F" : "I";
}

/** Which piece quarter `corner` of a cell with neighbour mask `mask` needs. */
export function pieceKind(mask: Mask, corner: Corner): PieceKind {
  const n = CORNER_NEIGHBORS[corner];
  return kindFrom((mask & n.vertical) !== 0, (mask & n.horizontal) !== 0, (mask & n.diagonal) !== 0);
}

/**
 * Pixel rect of a quarter inside a tile. Odd tile sizes split unevenly: the left/top quarters get floor(ts/2),
 * the right/bottom ones the rest. Pieces are always sampled at their own corner, so sizes always match.
 */
export function quarterRect(tileSize: number, corner: Corner): { x: number; y: number; w: number; h: number } {
  const a = Math.floor(tileSize / 2);
  const b = tileSize - a;
  const left = isLeft(corner);
  const top = isTop(corner);
  return { x: left ? 0 : a, y: top ? 0 : a, w: left ? a : b, h: top ? a : b };
}
