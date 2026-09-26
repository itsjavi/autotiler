import type { DualCell, DualLayout } from "./types.ts";

// TileMapDual "Standard" / Godot 3 docs `autotile_template_2x2.png` order. Values are the filled world corners
// (TL=1 TR=2 BL=4 BR=8); the sheet reads as one connected picture.
const GRID = [
  [4, 10, 13, 12],
  [9, 14, 15, 7],
  [2, 3, 11, 5],
  [0, 8, 6, 1],
];

export const dual16: DualLayout = {
  kind: "dual",
  id: "dual-16",
  name: "Dual grid (4×4)",
  description: "16 corner-based tiles for dual-grid tilemaps (TileMapDual addon, Tiled corner sets).",
  columns: 4,
  rows: 4,
  cells: GRID.flatMap((row, y) => row.map((corners, x): DualCell => ({ x, y, corners }))),
};
