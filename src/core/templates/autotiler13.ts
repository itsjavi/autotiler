// Autotiler v1's template: 5×3 tiles.
//   x:  0    1    2    3    4
//   y0 [TL] [T ] [TR] [i ] [i ]   a 3×3 island (outer corners, edges, centre) at x0-2,
//   y1 [L ] [C ] [R ] [i ] [i ]   a 2×2 block at x3-4,y0-1 whose four centre quarters are the inner corners,
//   y2 [BL] [B ] [BR] [--] [--]   and two spare cells.
import { E, type Mask, N, S, W } from "../blob/mask.ts";
import { type Corner, isLeft, isTop, type PieceKind, pieceKind } from "../blob/quarters.ts";
import type { QuarterRef, Template, TemplateSlot } from "./types.ts";

const INNER: Record<Corner, QuarterRef> = {
  TL: { tx: 4, ty: 1, corner: "TL" },
  TR: { tx: 3, ty: 1, corner: "TR" },
  BL: { tx: 4, ty: 0, corner: "BL" },
  BR: { tx: 3, ty: 0, corner: "BR" },
};

const BOX_LABELS = [
  ["top-left corner", "top edge", "top-right corner"],
  ["left edge", "centre", "right edge"],
  ["bottom-left corner", "bottom edge", "bottom-right corner"],
];

const SLOTS: TemplateSlot[] = [
  ...BOX_LABELS.flatMap((row, ty) => row.map((label, tx) => ({ tx, ty, label, used: true }))),
  { tx: 3, ty: 0, label: "inner corners", used: true },
  { tx: 4, ty: 0, label: "inner corners", used: true },
  { tx: 3, ty: 1, label: "inner corners", used: true },
  { tx: 4, ty: 1, label: "inner corners", used: true },
  { tx: 3, ty: 2, label: "spare", used: false },
  { tx: 4, ty: 2, label: "spare", used: false },
];

export const autotiler13: Template = {
  id: "autotiler-13",
  name: "Autotiler 13-tile (5×3)",
  description: "A 3×3 island plus a 2×2 inner-corner block — the Autotiler v1 template.",
  columns: 5,
  rows: 3,

  // "Matching base tile" rule: take the quarter from the island tile whose sides match the cell best, so each side
  // configuration keeps exactly what the artist drew. Reproduces v1 except its 12 mismatched strip quarters.
  quarterFor(mask: Mask, corner: Corner): QuarterRef {
    if (pieceKind(mask, corner) === "I") return INNER[corner];
    const l = (mask & W) !== 0;
    const r = (mask & E) !== 0;
    const t = (mask & N) !== 0;
    const b = (mask & S) !== 0;
    const tx = isLeft(corner) ? (l ? (r ? 1 : 2) : 0) : r ? (l ? 1 : 0) : 2;
    const ty = isTop(corner) ? (t ? (b ? 1 : 2) : 0) : b ? (t ? 1 : 0) : 2;
    return { tx, ty, corner };
  },

  pieceSource(kind: PieceKind, corner: Corner): QuarterRef {
    if (kind === "I") return INNER[corner];
    const x = isLeft(corner) ? 0 : 2;
    const y = isTop(corner) ? 0 : 2;
    const [tx, ty] = kind === "O" ? [x, y] : kind === "H" ? [1, y] : kind === "V" ? [x, 1] : [1, 1];
    return { tx, ty, corner };
  },

  pieceAt(tx: number, ty: number, corner: Corner): PieceKind | null {
    if (tx <= 2 && ty <= 2) {
      // inside the island a quarter's outward neighbours exist iff they stay inside the 3×3 box
      const hx = tx + (isLeft(corner) ? -1 : 1);
      const vy = ty + (isTop(corner) ? -1 : 1);
      const h = hx >= 0 && hx <= 2;
      const v = vy >= 0 && vy <= 2;
      return h && v ? "F" : h ? "H" : v ? "V" : "O";
    }
    const inner = INNER[corner];
    return inner.tx === tx && inner.ty === ty ? "I" : null;
  },

  slots: SLOTS,
};
