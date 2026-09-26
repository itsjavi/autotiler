// RPG Maker VX/VX Ace/MV/MZ "A2" floor autotile: 2×3 tiles = a 4×6 grid of quarters. Every piece exists exactly
// once, so there is nothing to choose. Map checked against RPG Maker MV's Tilemap.FLOOR_AUTOTILE_TABLE, which
// decodes to exactly the 47 canonical masks with this layout.
//   qy\qx   0      1      2      3
//    0    thumb  thumb  I@TL   I@TR     tile (0,0): palette thumbnail, never used in maps
//    1    thumb  thumb  I@BL   I@BR     tile (1,0): inner corners
//    2    O@TL   H@TR   H@TL   O@TR     tiles (0,1)-(1,2): a 2×2 island
//    3    V@BL   F@BR   F@BL   V@BR
//    4    V@TL   F@TR   F@TL   V@TR
//    5    O@BL   H@BR   H@BL   O@BR
import type { Mask } from "../blob/mask.ts";
import { type Corner, type PieceKind, pieceKind } from "../blob/quarters.ts";
import type { QuarterRef, Template, TemplateSlot } from "./types.ts";

type Piece = readonly [PieceKind, Corner];
// prettier-ignore
const GRID: ReadonlyArray<ReadonlyArray<Piece | null>> = [
  [null,        null,        ["I", "TL"], ["I", "TR"]],
  [null,        null,        ["I", "BL"], ["I", "BR"]],
  [["O", "TL"], ["H", "TR"], ["H", "TL"], ["O", "TR"]],
  [["V", "BL"], ["F", "BR"], ["F", "BL"], ["V", "BR"]],
  [["V", "TL"], ["F", "TR"], ["F", "TL"], ["V", "TR"]],
  [["O", "BL"], ["H", "BR"], ["H", "BL"], ["O", "BR"]],
];

const cornerOf = (qx: number, qy: number): Corner => `${qy % 2 === 0 ? "T" : "B"}${qx % 2 === 0 ? "L" : "R"}` as Corner;

const SOURCES = new Map<string, QuarterRef>();
GRID.forEach((row, qy) =>
  row.forEach((piece, qx) => {
    if (!piece) return;
    const [kind, at] = piece;
    const corner = cornerOf(qx, qy);
    if (at !== corner) throw new Error(`A2 table error: ${kind}@${at} sits at ${corner}`);
    SOURCES.set(`${kind}@${corner}`, { tx: qx >> 1, ty: qy >> 1, corner });
  }),
);

function pieceSource(kind: PieceKind, corner: Corner): QuarterRef {
  const ref = SOURCES.get(`${kind}@${corner}`);
  if (!ref) throw new Error(`A2 has no ${kind}@${corner}`);
  return ref;
}

const SLOTS: TemplateSlot[] = [
  { tx: 0, ty: 0, label: "palette thumbnail (ignored)", used: false },
  { tx: 1, ty: 0, label: "inner corners", used: true },
  { tx: 0, ty: 1, label: "island top-left", used: true },
  { tx: 1, ty: 1, label: "island top-right", used: true },
  { tx: 0, ty: 2, label: "island bottom-left", used: true },
  { tx: 1, ty: 2, label: "island bottom-right", used: true },
];

export const rpgmakerA2: Template = {
  id: "rpgmaker-a2",
  name: "RPG Maker A2 (2×3)",
  description: "RPG Maker VX Ace / MV / MZ floor autotile: palette tile, inner corners and a 2×2 island.",
  columns: 2,
  rows: 3,

  quarterFor(mask: Mask, corner: Corner): QuarterRef {
    return pieceSource(pieceKind(mask, corner), corner);
  },

  pieceSource,

  pieceAt(tx: number, ty: number, corner: Corner): PieceKind | null {
    const qx = tx * 2 + (corner.endsWith("R") ? 1 : 0);
    const qy = ty * 2 + (corner.startsWith("B") ? 1 : 0);
    return GRID[qy]?.[qx]?.[0] ?? null;
  },

  slots: SLOTS,
};
