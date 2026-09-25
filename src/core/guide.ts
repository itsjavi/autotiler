// A blank template for artists: every quarter the generator reads is filled with the colour of its piece kind
// (shaded by corner), unused cells stay transparent. The app shows the legend.
import { CORNERS, type Corner, type PieceKind, quarterRect } from "./blob/quarters.ts";
import { createImage, type RgbaImage } from "./image/rgba.ts";
import type { Template } from "./templates/types.ts";

export const PIECE_COLORS: Record<PieceKind, readonly [number, number, number]> = {
  O: [224, 108, 117],
  H: [97, 175, 239],
  V: [152, 195, 121],
  I: [229, 192, 123],
  F: [150, 158, 172],
};

const SHADE: Record<Corner, number> = { TL: 1.12, TR: 1.04, BL: 0.96, BR: 0.88 };

export function renderGuide(template: Template, tileSize: number): RgbaImage {
  const img = createImage(template.columns * tileSize, template.rows * tileSize);
  for (let ty = 0; ty < template.rows; ty++) {
    for (let tx = 0; tx < template.columns; tx++) {
      for (const corner of CORNERS) {
        const kind = template.pieceAt(tx, ty, corner);
        if (!kind) continue;
        const [r, g, b] = PIECE_COLORS[kind].map((v) => Math.min(255, Math.round(v * SHADE[corner])));
        const q = quarterRect(tileSize, corner);
        for (let y = 0; y < q.h; y++) {
          for (let x = 0; x < q.w; x++) {
            const px = tx * tileSize + q.x + x;
            const py = ty * tileSize + q.y + y;
            // darker 1 px tile border (only when tiles are big enough to spare it)
            const edge =
              tileSize >= 16 &&
              (px % tileSize === 0 || py % tileSize === 0 || (px + 1) % tileSize === 0 || (py + 1) % tileSize === 0);
            const k = edge ? 0.7 : 1;
            img.data.set([Math.round(r * k), Math.round(g * k), Math.round(b * k), 255], (py * img.width + px) * 4);
          }
        }
      }
    }
  }
  return img;
}
