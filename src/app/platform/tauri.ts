// Desktop platform (Tauri 2): native dialogs, drag & drop with real paths, file watching, direct writes into a
// folder, the store plugin for settings. Loaded lazily, only inside the desktop app.
import { invoke } from "@tauri-apps/api/core";
import { basename, join } from "@tauri-apps/api/path";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, watch, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { load, type Store } from "@tauri-apps/plugin-store";

import type { ExportFile } from "../../core/index.ts";
import type { OutputFolder, Platform, SaveResult, SourceFile } from "./types.ts";

const PNG_FILTER = [{ name: "PNG image", extensions: ["png"] }];

async function readSource(path: string): Promise<SourceFile> {
  return { name: await basename(path), bytes: await readFile(path), ref: path, location: path };
}

async function write(path: string, data: ExportFile["data"]): Promise<void> {
  if (typeof data === "string") await writeTextFile(path, data);
  else await writeFile(path, data);
}

let storePromise: Promise<Store> | undefined;
const settingsStore = () => (storePromise ??= load("settings.json", { autoSave: false, defaults: {} }));

async function pickFolder(title: string): Promise<OutputFolder | null> {
  const dir = await open({ directory: true, recursive: true, title });
  return typeof dir === "string" ? { label: await basename(dir), path: dir, ref: dir } : null;
}

export const tauriPlatform: Platform = {
  kind: "desktop",
  canWatch: true,
  canPickFolder: true,

  openImage: async () => {
    const path = await open({ multiple: false, directory: false, filters: PNG_FILTER, title: "Open a template image" });
    return typeof path === "string" ? readSource(path) : null;
  },

  openPath: readSource,

  fileFromDataTransfer: async (dt) => {
    const file = dt.files[0];
    return file ? { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) } : null;
  },

  subscribeNativeDrop: (onFile, onHover) =>
    getCurrentWebview().onDragDropEvent((event) => {
      const p = event.payload;
      if (p.type === "enter" || p.type === "over") onHover(true);
      else if (p.type === "leave") onHover(false);
      else {
        onHover(false);
        const path = p.paths.find((x) => x.toLowerCase().endsWith(".png")) ?? p.paths[0];
        if (path) void readSource(path).then(onFile, () => undefined);
      }
    }),

  watch: (file, onChange) => {
    const path = file.ref;
    if (typeof path !== "string") return null;
    let stop: (() => void) | undefined;
    let cancelled = false;
    // debounced; editors often write in several steps. Unreadable intermediate states are skipped.
    void watch(path, () => void readSource(path).then(onChange, () => undefined), { delayMs: 200 }).then(
      (unwatch) => {
        if (cancelled) unwatch();
        else stop = unwatch;
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  },

  pickOutputFolder: () => pickFolder("Export folder"),

  save: async (files, _zipName, folder): Promise<SaveResult | null> => {
    if (!folder && files.length === 1) {
      const ext = files[0].path.split(".").pop() ?? "";
      const target = await save({
        defaultPath: files[0].path,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      });
      if (!target) return null;
      await write(target, files[0].data);
      return { kind: "written", where: target };
    }
    const dest = folder ?? (await pickFolder("Export into folder"));
    if (!dest?.path) return null;
    const dir = dest.path;
    await Promise.all(files.map(async (f) => write(await join(dir, f.path), f.data)));
    return { kind: "written", where: dest.label, folder: folder ? undefined : dest };
  },

  godotPathOf: async (folder) => (folder.path ? invoke<string | null>("godot_res_path", { dir: folder.path }) : null),

  reveal: (path) => revealItemInDir(path),

  copyPng: async (png) => {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": new Blob([new Uint8Array(png)], { type: "image/png" }) }),
    ]);
  },

  openUrl: (url) => void openUrl(url),

  loadState: async () => (await settingsStore()).get("state"),

  saveState: async (state) => {
    const store = await settingsStore();
    await store.set("state", state);
    await store.save();
  },
};
