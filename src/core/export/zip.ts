import { strToU8, zipSync, type Zippable } from "fflate";

import type { ExportFile } from "./types.ts";

// fixed timestamp so the same export always produces the same bytes
const MTIME = new Date(Date.UTC(2026, 0, 1));

export function zipFiles(files: readonly ExportFile[]): Uint8Array {
  const entries: Zippable = {};
  for (const f of files) {
    const data = typeof f.data === "string" ? strToU8(f.data) : f.data;
    // PNGs are already deflated
    entries[f.path] = [data, { level: f.path.endsWith(".png") ? 0 : 6, mtime: MTIME }];
  }
  return zipSync(entries);
}
