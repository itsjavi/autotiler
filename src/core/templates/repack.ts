// Converts a template image between layouts (e.g. Autotiler 13-tile → RPG Maker A2) by moving each of the 20
// pieces to where the target template expects it.
import { CORNERS, quarterRect } from "../blob/quarters.ts";
import { copyRect, createImage, type RgbaImage } from "../image/rgba.ts";
import type { Template } from "./types.ts";

export function repackTemplate(src: RgbaImage, from: Template, to: Template, tileSize: number): RgbaImage {
  const out = createImage(to.columns * tileSize, to.rows * tileSize);
  const copyPiece = (
    kind: Parameters<Template["pieceSource"]>[0],
    corner: (typeof CORNERS)[number],
    tx: number,
    ty: number,
  ) => {
    const ref = from.pieceSource(kind, corner);
    const q = quarterRect(tileSize, corner);
    copyRect(
      src,
      ref.tx * tileSize + q.x,
      ref.ty * tileSize + q.y,
      q.w,
      q.h,
      out,
      tx * tileSize + q.x,
      ty * tileSize + q.y,
    );
  };
  for (let ty = 0; ty < to.rows; ty++) {
    for (let tx = 0; tx < to.columns; tx++) {
      for (const corner of CORNERS) {
        const kind = to.pieceAt(tx, ty, corner);
        if (kind) copyPiece(kind, corner, tx, ty);
      }
    }
  }
  // RPG Maker shows the A2 thumbnail tile in its palette: use the isolated tile there
  if (to.id === "rpgmaker-a2") for (const corner of CORNERS) copyPiece("O", corner, 0, 0);
  return out;
}
