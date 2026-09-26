import { isTauri } from "@tauri-apps/api/core";

import type { Platform } from "./types.ts";
import { webPlatform } from "./web.ts";

export type { OutputFolder, Platform, SaveResult, SourceFile } from "./types.ts";

let current: Platform = webPlatform;

export function platform(): Platform {
  return current;
}

/** Swaps in the desktop implementation when running inside Tauri (loaded lazily so the web build stays lean). */
export async function initPlatform(): Promise<Platform> {
  current = isTauri() ? (await import("./tauri.ts")).tauriPlatform : webPlatform;
  return current;
}
