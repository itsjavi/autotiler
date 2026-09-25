// Browser platform: <input type=file>/drag & drop/paste, downloads (zip for multi-file exports), and — in Chromium,
// when not inside a cross-origin iframe like itch.io's — File System Access for watching the source and writing
// straight into a folder.
import { zipFiles, type ExportFile } from "../../core/index.ts";
import type { OutputFolder, Platform, SaveResult, SourceFile } from "./types.ts";

const STORAGE_KEY = "autotiler:v2";
const topLevel = typeof window !== "undefined" && window.self === window.top;
const hasOpenPicker = topLevel && typeof window.showOpenFilePicker === "function";
const hasDirPicker = topLevel && typeof window.showDirectoryPicker === "function";

const PNG_TYPES: FilePickerAcceptType[] = [{ description: "PNG images", accept: { "image/png": [".png"] } }];

async function fromFile(file: File, ref?: FileSystemFileHandle): Promise<SourceFile> {
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()), ref };
}

function isFileHandle(h: unknown): h is FileSystemFileHandle {
  return typeof FileSystemFileHandle !== "undefined" && h instanceof FileSystemFileHandle;
}

function isDirHandle(h: unknown): h is FileSystemDirectoryHandle {
  return typeof FileSystemDirectoryHandle !== "undefined" && h instanceof FileSystemDirectoryHandle;
}

function pickWithInput(): Promise<SourceFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      resolve(file ? fromFile(file) : null);
    });
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

export function toBlob(data: Uint8Array | string, type: string): Blob {
  return new Blob([typeof data === "string" ? data : new Uint8Array(data)], { type });
}

export function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const mime = (path: string) =>
  path.endsWith(".png") ? "image/png" : path.endsWith(".json") ? "application/json" : "text/plain";

export const webPlatform: Platform = {
  kind: "web",
  canWatch: hasOpenPicker,
  canPickFolder: hasDirPicker,

  async openImage() {
    if (!hasOpenPicker || !window.showOpenFilePicker) return pickWithInput();
    try {
      const [handle] = await window.showOpenFilePicker({ types: PNG_TYPES, excludeAcceptAllOption: false });
      return handle ? fromFile(await handle.getFile(), handle) : null;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return null;
      return pickWithInput();
    }
  },

  async fileFromDataTransfer(dt) {
    const item = [...dt.items].find((i) => i.kind === "file");
    if (item?.getAsFileSystemHandle && hasOpenPicker) {
      try {
        const handle = await item.getAsFileSystemHandle();
        if (isFileHandle(handle)) return fromFile(await handle.getFile(), handle);
      } catch {
        // fall back to the plain File below
      }
    }
    const file = dt.files[0];
    return file ? fromFile(file) : null;
  },

  watch(file, onChange) {
    const handle = file.ref;
    if (!isFileHandle(handle)) return null;
    let last = -1;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const f = await handle.getFile();
        if (last !== -1 && f.lastModified !== last) onChange(await fromFile(f, handle));
        last = f.lastModified;
      } catch {
        // file moved or permission revoked: keep the last good version
      }
      if (!stopped) timer = setTimeout(tick, 1000);
    };
    timer = setTimeout(tick, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  },

  async pickOutputFolder() {
    if (!window.showDirectoryPicker) return null;
    try {
      const dir = await window.showDirectoryPicker({ id: "autotiler-export", mode: "readwrite" });
      return { label: dir.name, ref: dir };
    } catch {
      return null;
    }
  },

  async save(files: readonly ExportFile[], zipName: string, folder: OutputFolder | null): Promise<SaveResult> {
    const dir = folder?.ref;
    if (isDirHandle(dir)) {
      if (dir.requestPermission && (await dir.requestPermission({ mode: "readwrite" })) !== "granted") {
        throw new Error("Permission to write into the folder was denied.");
      }
      await Promise.all(
        files.map(async (f) => {
          const writable = await (await dir.getFileHandle(f.path, { create: true })).createWritable();
          await writable.write(toBlob(f.data, mime(f.path)));
          await writable.close();
        }),
      );
      return { kind: "written", where: dir.name };
    }
    if (files.length === 1) {
      download(files[0].path, toBlob(files[0].data, mime(files[0].path)));
      return { kind: "downloaded", where: files[0].path };
    }
    download(zipName, toBlob(zipFiles(files), "application/zip"));
    return { kind: "downloaded", where: zipName };
  },

  async godotPathOf(folder) {
    const dir = folder.ref;
    if (!isDirHandle(dir)) return null;
    try {
      await dir.getFileHandle("project.godot");
      return "res://";
    } catch {
      return null;
    }
  },

  async copyPng(png) {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": toBlob(png, "image/png") })]);
  },

  openUrl(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  },

  async loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // private mode / storage full: settings just won't persist
    }
  },
};
