import { autotilerV1, gamemaker47, godot12x4 } from "./blob.ts";
import { dual16 } from "./dual.ts";
import type { Layout, LayoutId } from "./types.ts";

export type { BlobCell, BlobLayout, BlobLayoutId, DualCell, DualLayout, Layout, LayoutId } from "./types.ts";
export { autotilerV1, dual16, gamemaker47, godot12x4 };

export const LAYOUTS: readonly Layout[] = [godot12x4, autotilerV1, gamemaker47, dual16];

export const DEFAULT_LAYOUT_ID: LayoutId = "godot-12x4";

export function isLayoutId(id: string): id is LayoutId {
  return LAYOUTS.some((l) => l.id === id);
}

export function getLayout(id: LayoutId): Layout {
  const layout = LAYOUTS.find((l) => l.id === id);
  if (!layout) throw new Error(`unknown layout ${id}`);
  return layout;
}
