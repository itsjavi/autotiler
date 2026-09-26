// 47-tile blob layouts as (column, row) grids of canonical masks (N=1 NE=2 E=4 SE=8 S=16 SW=32 W=64 NW=128).
// null = empty cell. Every layout is verified in Godot 4.7.2 (terrain painting picks the expected tile).
import type { BlobCell, BlobLayout } from "./types.ts";

function cellsFrom(grid: ReadonlyArray<ReadonlyArray<number | null>>): BlobCell[] {
  return grid.flatMap((row, y) => row.flatMap((mask, x) => (mask === null ? [] : [{ x, y, mask }])));
}

/** Godot 3 docs `autotile_template_3x3_minimal.png` order — the most copied blob layout. */
export const godot12x4: BlobLayout = {
  kind: "blob",
  id: "godot-12x4",
  name: "Godot 3×3 minimal (12×4)",
  description: "The standard blob template from the Godot docs, used by most tools and tutorials.",
  columns: 12,
  rows: 4,
  cells: cellsFrom([
    [16, 20, 84, 80, 213, 92, 116, 87, 28, 125, 124, 112],
    [17, 21, 85, 81, 29, 127, 253, 113, 31, 119, null, 245],
    [1, 5, 69, 65, 23, 223, 247, 209, 95, 255, 221, 241],
    [0, 4, 68, 64, 117, 71, 197, 93, 7, 199, 215, 193],
  ]),
};

/** Autotiler v1's own arrangement (tile ids stay compatible with v1 exports). */
export const autotilerV1: BlobLayout = {
  kind: "blob",
  id: "autotiler-v1",
  name: "Autotiler v1 (11×5)",
  description: "The layout Autotiler 1.x generated. Pick it to replace a tileset exported with v1.",
  columns: 11,
  rows: 5,
  cells: cellsFrom([
    [28, 124, 112, 16, 20, 116, 92, 80, 84, 221, null],
    [31, 255, 241, 17, 23, 247, 223, 209, 215, 119, null],
    [7, 199, 193, 1, 29, 253, 127, 113, 125, 93, 117],
    [4, 68, 64, 0, 5, 197, 71, 65, 69, 87, 213],
    [null, null, null, null, 21, 245, 95, 81, 85, null, null],
  ]),
};

/**
 * GameMaker's 47-tile auto-tile template order (= RPG Maker's internal shape order), 8 columns. GameMaker reserves
 * tile index 0 as "no tile", so the first cell stays empty and template entry k sits at index k+1.
 */
export const gamemaker47: BlobLayout = {
  kind: "blob",
  id: "gamemaker-47",
  name: "GameMaker 47 (8×6)",
  description: "GameMaker's 47-tile auto-tile template order; the first cell is left empty for GameMaker's tile 0.",
  columns: 8,
  rows: 6,
  cells: cellsFrom([
    [null, 255, 127, 253, 125, 247, 119, 245],
    [117, 223, 95, 221, 93, 215, 87, 213],
    [85, 31, 29, 23, 21, 124, 116, 92],
    [84, 241, 209, 113, 81, 199, 71, 197],
    [69, 17, 68, 28, 20, 112, 80, 193],
    [65, 7, 5, 16, 4, 1, 64, 0],
  ]),
};
