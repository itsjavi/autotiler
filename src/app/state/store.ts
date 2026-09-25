import { create } from "zustand";

import {
  createTestMap,
  decodePng,
  DEFAULT_LAYOUT_ID,
  isLayoutId,
  randomMap,
  type LayoutId,
  type RgbaImage,
  type TargetId,
  type TemplateId,
  type TestMap,
} from "../../core/index.ts";
import { platform, type OutputFolder, type SourceFile } from "../platform/index.ts";

export interface Source {
  readonly file: SourceFile;
  readonly image: RgbaImage;
  /** increases on every (re)load, so live reloads trigger auto-export */
  readonly revision: number;
  /** "reload" when the watched file changed on disk */
  readonly reason: "open" | "reload";
}

export interface Overlays {
  grid: boolean;
  quarters: boolean;
  bits: boolean;
  collision: boolean;
}

export interface Settings {
  templateId: TemplateId | "auto";
  /** null = detect from the image */
  tileSize: number | null;
  layoutId: LayoutId;
  target: TargetId;
  /** "" = derive from the file name */
  terrainName: string;
  /** "#rrggbb", null = average colour of the fill */
  terrainColor: string | null;
  collision: boolean;
  forceNearest: boolean;
  sidecar: boolean;
  /** "" = "<source>-autotile" */
  fileName: string;
  autoExport: boolean;
  zoom: number | "fit";
  mapZoom: number | "fit";
  overlays: Overlays;
}

export const DEFAULT_SETTINGS: Settings = {
  templateId: "auto",
  tileSize: null,
  layoutId: DEFAULT_LAYOUT_ID,
  target: "godot4",
  terrainName: "",
  terrainColor: null,
  collision: true,
  forceNearest: false,
  sidecar: false,
  fileName: "",
  autoExport: false,
  zoom: "fit",
  mapZoom: "fit",
  overlays: { grid: true, quarters: false, bits: false, collision: false },
};

export const MAP_WIDTH = 32;
export const MAP_HEIGHT = 20;

export type View = "tileset" | "map";

interface AppState {
  hydrated: boolean;
  source: Source | null;
  loadError: string | null;
  settings: Settings;
  outputFolder: OutputFolder | null;
  /** res:// path of the output folder when it is inside a Godot project */
  godotPath: string | null;
  view: View;
  /** hovered tileset cell (atlas coordinates) */
  hover: { x: number; y: number } | null;
  map: TestMap;
  recent: string[];

  loadFile: (file: SourceFile, reason?: "open" | "reload") => boolean;
  closeSource: () => void;
  setSettings: (patch: Partial<Settings>) => void;
  setOverlay: (key: keyof Overlays, on: boolean) => void;
  setOutputFolder: (folder: OutputFolder | null) => void;
  setView: (view: View) => void;
  setHover: (cell: { x: number; y: number } | null) => void;
  setMap: (map: TestMap) => void;
}

let revision = 0;

export const useApp = create<AppState>()((set, get) => ({
  hydrated: false,
  source: null,
  loadError: null,
  settings: DEFAULT_SETTINGS,
  outputFolder: null,
  godotPath: null,
  view: "tileset",
  hover: null,
  map: randomMap(MAP_WIDTH, MAP_HEIGHT, 4, 0.52),
  recent: [],

  loadFile: (file, reason = "open") => {
    try {
      const image = decodePng(file.bytes);
      const recent = [file.location ?? file.name, ...get().recent.filter((r) => r !== (file.location ?? file.name))];
      set({
        source: { file, image, revision: ++revision, reason },
        loadError: null,
        hover: reason === "open" ? null : get().hover,
        recent: recent.slice(0, 8),
      });
      return true;
    } catch (err) {
      set({ loadError: `${file.name}: ${err instanceof Error ? err.message : String(err)}` });
      return false;
    }
  },
  closeSource: () => set({ source: null, loadError: null, hover: null }),
  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  setOverlay: (key, on) =>
    set((s) => ({ settings: { ...s.settings, overlays: { ...s.settings.overlays, [key]: on } } })),
  setOutputFolder: (folder) => {
    set({ outputFolder: folder, godotPath: null });
    if (folder) {
      void platform()
        .godotPathOf(folder)
        .then((godotPath) => {
          if (get().outputFolder === folder) set({ godotPath });
        });
    }
  },
  setView: (view) => set({ view }),
  setHover: (hover) => set({ hover }),
  setMap: (map) => set({ map }),
}));

// ---- persistence (settings, recent files, desktop output folder, test map) ----

interface Persisted {
  settings?: Partial<Settings>;
  recent?: string[];
  outputFolder?: { label: string; path: string } | null;
  map?: { width: number; height: number; cells: string };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function hydrate(): Promise<void> {
  const raw: unknown = await platform().loadState();
  const data: Persisted = isRecord(raw) ? raw : {};
  const settings: Settings = { ...DEFAULT_SETTINGS, ...(isRecord(data.settings) ? data.settings : {}) };
  settings.overlays = { ...DEFAULT_SETTINGS.overlays, ...(isRecord(settings.overlays) ? settings.overlays : {}) };
  if (!isLayoutId(settings.layoutId)) settings.layoutId = DEFAULT_LAYOUT_ID;
  const map = data.map;
  const restored =
    map &&
    Number.isInteger(map.width) &&
    Number.isInteger(map.height) &&
    map.width > 0 &&
    map.height > 0 &&
    map.width <= 128 &&
    map.height <= 128 &&
    typeof map.cells === "string" &&
    map.cells.length === map.width * map.height
      ? { width: map.width, height: map.height, cells: Uint8Array.from(map.cells, (c) => (c === "1" ? 1 : 0)) }
      : null;
  useApp.setState({
    hydrated: true,
    settings,
    recent: Array.isArray(data.recent) ? data.recent.filter((r) => typeof r === "string") : [],
    ...(restored ? { map: restored } : {}),
  });
  const folder = data.outputFolder;
  if (platform().kind === "desktop" && folder?.path) {
    useApp.getState().setOutputFolder({ label: folder.label, path: folder.path, ref: folder.path });
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
useApp.subscribe((state, prev) => {
  if (!state.hydrated) return;
  if (
    state.settings === prev.settings &&
    state.recent === prev.recent &&
    state.outputFolder === prev.outputFolder &&
    state.map === prev.map
  ) {
    return;
  }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const s = useApp.getState();
    const persisted: Persisted = {
      settings: s.settings,
      recent: s.recent,
      outputFolder: s.outputFolder?.path ? { label: s.outputFolder.label, path: s.outputFolder.path } : null,
      map: {
        width: s.map.width,
        height: s.map.height,
        cells: Array.from(s.map.cells, (c) => (c ? "1" : "0")).join(""),
      },
    };
    void platform().saveState(persisted);
  }, 300);
});

export const emptyMap = () => createTestMap(MAP_WIDTH, MAP_HEIGHT);
