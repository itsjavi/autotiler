import type { Tileset } from "../generate.ts";
import { encodePng } from "../image/png.ts";
import { sanitizeName } from "./common.ts";
import type { ExportFile } from "./types.ts";

export interface PngOptions {
  readonly name: string;
  /** also write <name>.autotile.json describing every tile */
  readonly sidecar: boolean;
}

/** Engine-agnostic description of the atlas (bit order matches Tiled's wangid and Godot 4's peering bits). */
export function sidecarJson(tileset: Tileset): string {
  const { layout, tileSize } = tileset;
  const tiles = tileset.cells
    .toSorted((a, b) => a.y - b.y || a.x - b.x)
    .map((c) => (layout.kind === "blob" ? { x: c.x, y: c.y, mask: c.mask } : { x: c.x, y: c.y, corners: c.corners }));
  const doc =
    layout.kind === "blob"
      ? {
          format: "autotiler",
          version: 1,
          kind: "blob47",
          layout: layout.id,
          tileSize,
          columns: layout.columns,
          rows: layout.rows,
          bits: { N: 1, NE: 2, E: 4, SE: 8, S: 16, SW: 32, W: 64, NW: 128 },
          tiles,
        }
      : {
          format: "autotiler",
          version: 1,
          kind: "dual16",
          layout: layout.id,
          tileSize,
          columns: layout.columns,
          rows: layout.rows,
          bits: { TL: 1, TR: 2, BL: 4, BR: 8 },
          tiles,
        };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export function exportPng(tileset: Tileset, o: PngOptions): ExportFile[] {
  const name = sanitizeName(o.name);
  const files: ExportFile[] = [{ path: `${name}.png`, data: encodePng(tileset.image) }];
  if (o.sidecar) files.push({ path: `${name}.autotile.json`, data: sidecarJson(tileset) });
  return files;
}
