// Tiled tileset (.tsx) with a Wang set: "mixed" (corners + edges) for blob layouts, "corner" for the dual grid.
// Two colours are used — terrain (1) and "empty" (2) — because Tiled silently drops an all-zero wangid, which would
// lose the isolated tile.
import { DIRECTIONS } from "../blob/mask.ts";
import type { Tileset } from "../generate.ts";
import { encodePng } from "../image/png.ts";
import { sanitizeName, toHex } from "./common.ts";
import type { ExportFile, Rgb } from "./types.ts";

export interface TiledOptions {
  readonly name: string;
  readonly terrainName: string;
  readonly terrainColor: Rgb;
}

const v = (on: boolean) => (on ? 1 : 2);
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function tiledTsx(tileset: Tileset, o: TiledOptions): string {
  const name = sanitizeName(o.name);
  const ts = tileset.tileSize;
  const { columns, rows, kind } = tileset.layout;
  const terrain = o.terrainName || name;
  const cells = tileset.cells.toSorted((a, b) => a.y - b.y || a.x - b.x);
  const wangid = (cell: (typeof cells)[number]): string => {
    if (kind === "blob") return DIRECTIONS.map((d) => v(((cell.mask ?? 0) & d.bit) !== 0)).join(",");
    // corner sets only use the corner slots: top-right, bottom-right, bottom-left, top-left
    const c = cell.corners ?? 0;
    return [0, v((c & 2) !== 0), 0, v((c & 8) !== 0), 0, v((c & 4) !== 0), 0, v((c & 1) !== 0)].join(",");
  };
  const L: string[] = [];
  L.push('<?xml version="1.0" encoding="UTF-8"?>');
  L.push(
    `<tileset version="1.10" tiledversion="1.12.2" name="${xml(name)}" tilewidth="${ts}" tileheight="${ts}" tilecount="${columns * rows}" columns="${columns}">`,
  );
  L.push(` <image source="${xml(`${name}.png`)}" width="${columns * ts}" height="${rows * ts}"/>`);
  L.push(" <wangsets>");
  L.push(`  <wangset name="${xml(terrain)}" type="${kind === "blob" ? "mixed" : "corner"}" tile="-1">`);
  L.push(`   <wangcolor name="${xml(terrain)}" color="${toHex(o.terrainColor)}" tile="-1" probability="1"/>`);
  L.push('   <wangcolor name="empty" color="#202020" tile="-1" probability="1"/>');
  for (const cell of cells) L.push(`   <wangtile tileid="${cell.y * columns + cell.x}" wangid="${wangid(cell)}"/>`);
  L.push("  </wangset>", " </wangsets>", "</tileset>", "");
  return L.join("\n");
}

export function exportTiled(tileset: Tileset, o: TiledOptions): ExportFile[] {
  const name = sanitizeName(o.name);
  return [
    { path: `${name}.png`, data: encodePng(tileset.image) },
    { path: `${name}.tsx`, data: tiledTsx(tileset, o) },
  ];
}
