import {
  encodePng,
  exportGodot3,
  exportGodot4,
  exportPng,
  exportTiled,
  type ExportFile,
  type Layout,
  type TargetId,
  type Tileset,
} from "../../../core/index.ts";
import { exportNameOf, terrainColorOf, terrainNameOf } from "../../state/derived.ts";
import type { Settings, Source } from "../../state/store.ts";

export const TARGETS: ReadonlyArray<{ id: TargetId; label: string; hint: string }> = [
  { id: "godot4", label: "Godot 4", hint: "TileSet with a terrain set, peering bits and collisions" },
  { id: "tiled", label: "Tiled", hint: "Tileset (.tsx) with a Wang set" },
  { id: "png", label: "PNG", hint: "Just the image, optionally with a JSON tile map" },
  { id: "godot3", label: "Godot 3", hint: "Legacy autotile (3x3 minimal bitmask)" },
];

export function targetSupports(target: TargetId, layout: Layout): boolean {
  return layout.kind === "blob" || target === "png" || target === "tiled";
}

export interface ExportBundle {
  readonly files: ExportFile[];
  readonly zipName: string;
  readonly name: string;
}

export function buildExport(source: Source, tileset: Tileset, settings: Settings): ExportBundle {
  const name = exportNameOf(source, settings);
  const terrainName = terrainNameOf(source, settings);
  const terrainColor = terrainColorOf(source, tileset, settings);
  let files: ExportFile[];
  switch (settings.target) {
    case "godot4":
      files = exportGodot4(tileset, {
        name,
        terrainName,
        terrainColor,
        collision: settings.collision,
        forceNearest: settings.forceNearest,
      });
      break;
    case "godot3":
      files = exportGodot3(tileset, { name, collision: settings.collision });
      break;
    case "tiled":
      files = exportTiled(tileset, { name, terrainName, terrainColor });
      break;
    default:
      files = exportPng(tileset, { name, sidecar: settings.sidecar });
  }
  return { files, zipName: `${name}.zip`, name };
}

export function pngOf(tileset: Tileset): Uint8Array {
  return encodePng(tileset.image);
}
