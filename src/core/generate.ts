import { dualQuadrant } from "./blob/dual.ts";
import type { Mask } from "./blob/mask.ts";
import { CORNERS, quarterRect } from "./blob/quarters.ts";
import { copyRect, createImage, type RgbaImage } from "./image/rgba.ts";
import type { Layout } from "./layouts/types.ts";
import type { QuarterRef, Template } from "./templates/types.ts";

export interface TilesetCell {
  readonly x: number;
  readonly y: number;
  /** blob layouts: canonical neighbour mask */
  readonly mask: Mask | null;
  /** dual layouts: filled world corners (TL=1 TR=2 BL=4 BR=8) */
  readonly corners: number | null;
  /** source quarter used for each display quadrant (TL, TR, BL, BR); null = left empty */
  readonly quarters: readonly (QuarterRef | null)[];
}

export interface Tileset {
  readonly image: RgbaImage;
  readonly tileSize: number;
  readonly template: Template;
  readonly layout: Layout;
  readonly cells: readonly TilesetCell[];
}

export interface GenerateOptions {
  readonly template: Template;
  readonly tileSize: number;
  readonly layout: Layout;
}

/** Composes the output atlas. Every output quadrant is copied exactly once from one source quarter — no blending. */
export function generate(source: RgbaImage, { template, tileSize: ts, layout }: GenerateOptions): Tileset {
  if (!Number.isInteger(ts) || ts < 2) throw new RangeError(`invalid tile size ${ts}`);
  if (source.width < template.columns * ts || source.height < template.rows * ts) {
    throw new RangeError(
      `a ${template.columns}×${template.rows}-tile template at ${ts} px needs ${template.columns * ts}×${template.rows * ts} px, got ${source.width}×${source.height}`,
    );
  }
  if (layout.kind === "dual" && ts % 2 !== 0) throw new RangeError("dual-grid tilesets need an even tile size");

  const image = createImage(layout.columns * ts, layout.rows * ts);
  const place = (ref: QuarterRef, cellX: number, cellY: number, quadrant: (typeof CORNERS)[number]) => {
    const s = quarterRect(ts, ref.corner);
    const d = quarterRect(ts, quadrant);
    copyRect(source, ref.tx * ts + s.x, ref.ty * ts + s.y, s.w, s.h, image, cellX * ts + d.x, cellY * ts + d.y);
  };

  let cells: TilesetCell[];
  if (layout.kind === "blob") {
    cells = layout.cells.map(({ x, y, mask }) => {
      const quarters = CORNERS.map((corner) => {
        const ref = template.quarterFor(mask, corner);
        place(ref, x, y, corner);
        return ref;
      });
      return { x, y, mask, corners: null, quarters };
    });
  } else {
    cells = layout.cells.map(({ x, y, corners }) => {
      const quarters = CORNERS.map((quadrant) => {
        const q = dualQuadrant(corners, quadrant);
        if (!q.filled) return null;
        const ref = template.pieceSource(q.kind, q.quarter);
        place(ref, x, y, quadrant);
        return ref;
      });
      return { x, y, mask: null, corners, quarters };
    });
  }
  return { image, tileSize: ts, template, layout, cells };
}
