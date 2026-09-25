import type { DualCorners } from "../blob/dual.ts";
import type { Mask } from "../blob/mask.ts";

export type BlobLayoutId = "godot-12x4" | "autotiler-v1" | "gamemaker-47";
export type LayoutId = BlobLayoutId | "dual-16";

export interface BlobCell {
  readonly x: number;
  readonly y: number;
  readonly mask: Mask;
}

export interface DualCell {
  readonly x: number;
  readonly y: number;
  readonly corners: DualCorners;
}

interface LayoutInfo {
  readonly name: string;
  readonly description: string;
  /** size in tiles */
  readonly columns: number;
  readonly rows: number;
}

/** A 47-tile blob layout: where each canonical mask lives in the atlas. */
export interface BlobLayout extends LayoutInfo {
  readonly kind: "blob";
  readonly id: BlobLayoutId;
  readonly cells: readonly BlobCell[];
}

/** A 16-tile dual-grid (Wang 2-corner) layout. */
export interface DualLayout extends LayoutInfo {
  readonly kind: "dual";
  readonly id: "dual-16";
  readonly cells: readonly DualCell[];
}

export type Layout = BlobLayout | DualLayout;
