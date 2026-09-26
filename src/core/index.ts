// Public API of the environment-free core: runs unchanged in the browser, the Tauri webview and Node.
export { DUAL_BL, DUAL_BR, DUAL_TL, DUAL_TR, dualQuadrant, type DualCorners } from "./blob/dual.ts";
export { GODOT4_PEERING_BITS, godot3Bitmask, godot4PeeringBits } from "./blob/godot.ts";
export {
  BLOB47,
  canonical,
  DIRECTIONS,
  directionsOf,
  isCanonical,
  maskOf,
  type Direction,
  type Mask,
} from "./blob/mask.ts";
export {
  CORNERS,
  PIECE_KINDS,
  PIECE_NAMES,
  pieceKind,
  quarterRect,
  type Corner,
  type PieceKind,
} from "./blob/quarters.ts";
export { analyzeSource, detectTemplate, type Issue, type IssueLevel, type SourceAnalysis } from "./detect.ts";
export * from "./export/index.ts";
export { generate, type GenerateOptions, type Tileset, type TilesetCell } from "./generate.ts";
export { PIECE_COLORS, renderGuide } from "./guide.ts";
export { decodePng, encodePng, isPng } from "./image/png.ts";
export {
  copyRect,
  copyRectClipped,
  createImage,
  diffImages,
  isRectTransparent,
  type ImageDiff,
  type RgbaImage,
} from "./image/rgba.ts";
export * from "./layouts/index.ts";
export * from "./templates/index.ts";
export {
  allBlobCombinations,
  allDualCombinations,
  blobMaskAt,
  createTestMap,
  dualCornersAt,
  isTerrain,
  randomMap,
  renderTestMap,
  setCell,
  type TestMap,
} from "./test-map.ts";
