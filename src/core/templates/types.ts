import type { Mask } from "../blob/mask.ts";
import type { Corner, PieceKind } from "../blob/quarters.ts";

export type TemplateId = "autotiler-13" | "rpgmaker-a2";

/** A quarter of a template tile. `corner` is always the same corner the piece is used at. */
export interface QuarterRef {
  readonly tx: number;
  readonly ty: number;
  readonly corner: Corner;
}

export interface TemplateSlot {
  readonly tx: number;
  readonly ty: number;
  readonly label: string;
  /** false for cells generation never reads (RPG Maker's palette thumbnail, v1's two spare cells) */
  readonly used: boolean;
}

export interface Template {
  readonly id: TemplateId;
  readonly name: string;
  readonly description: string;
  /** size in tiles */
  readonly columns: number;
  readonly rows: number;
  /** Where to copy quarter `corner` of a blob cell with neighbour mask `mask` from; may use the cell's context. */
  quarterFor(mask: Mask, corner: Corner): QuarterRef;
  /** Context-free source of a piece — what the dual grid uses, since a dual tile only sees a 2×2 window. */
  pieceSource(kind: PieceKind, corner: Corner): QuarterRef;
  /** The piece a template quarter holds, or null when generation never reads that quarter. */
  pieceAt(tx: number, ty: number, corner: Corner): PieceKind | null;
  readonly slots: readonly TemplateSlot[];
}
