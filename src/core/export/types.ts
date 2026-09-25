export interface ExportFile {
  /** file name relative to the output folder */
  readonly path: string;
  readonly data: Uint8Array | string;
}

export type TargetId = "godot4" | "godot3" | "tiled" | "png";

/** RGB in 0..255 */
export type Rgb = readonly [number, number, number];
