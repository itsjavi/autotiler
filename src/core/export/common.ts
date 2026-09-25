import { CORNERS, quarterRect } from "../blob/quarters.ts";
import type { Tileset } from "../generate.ts";
import type { Rgb } from "./types.ts";

/** A safe base file name: keeps letters/digits (any script), space, dot, dash and underscore. */
export function sanitizeName(name: string, fallback = "tileset"): string {
  const cleaned = name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^\p{L}\p{N} ._-]+/gu, "_")
    .replace(/^[\s.]+|[\s.]+$/g, "");
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : fallback;
}

/** Average colour of the opaque pixels of the template's fill pieces — a good default terrain colour. */
export function terrainColor(tileset: Tileset, source: { data: Uint8ClampedArray; width: number }): Rgb {
  const ts = tileset.tileSize;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (const corner of CORNERS) {
    const ref = tileset.template.pieceSource("F", corner);
    const q = quarterRect(ts, corner);
    for (let y = 0; y < q.h; y++) {
      for (let x = 0; x < q.w; x++) {
        const i = ((ref.ty * ts + q.y + y) * source.width + ref.tx * ts + q.x + x) * 4;
        if (source.data[i + 3] < 128) continue;
        r += source.data[i];
        g += source.data[i + 1];
        b += source.data[i + 2];
        n++;
      }
    }
  }
  if (!n) return [90, 154, 60];
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

export function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Shortest decimal (max 4 places) for text resource files. */
export function num(n: number): string {
  return String(Number(n.toFixed(4)));
}
