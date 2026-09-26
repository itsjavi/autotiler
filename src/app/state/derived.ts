// Values derived from the store. Generation is fast (~1 ms) but canvases re-render often, so results are memoized
// on the identity of their inputs.
import {
  analyzeSource,
  generate,
  getLayout,
  sanitizeName,
  terrainColor,
  type Rgb,
  type SourceAnalysis,
  type Tileset,
} from "../../core/index.ts";
import { useApp, type Settings, type Source } from "./store.ts";

let lastAnalysis: {
  source: Source;
  templateId: Settings["templateId"];
  tileSize: number | null;
  value: SourceAnalysis;
} | null = null;

export function analysisOf(
  source: Source,
  templateId: Settings["templateId"],
  tileSize: number | null,
): SourceAnalysis {
  if (
    lastAnalysis &&
    lastAnalysis.source === source &&
    lastAnalysis.templateId === templateId &&
    lastAnalysis.tileSize === tileSize
  ) {
    return lastAnalysis.value;
  }
  const value = analyzeSource(source.image, templateId === "auto" ? undefined : templateId, tileSize ?? undefined);
  lastAnalysis = { source, templateId, tileSize, value };
  return value;
}

export interface TilesetResult {
  readonly analysis: SourceAnalysis;
  readonly tileset: Tileset | null;
  readonly error: string | null;
}

let lastTileset: { analysis: SourceAnalysis; layoutId: Settings["layoutId"]; value: TilesetResult } | null = null;

export function tilesetOf(
  source: Source,
  settings: Pick<Settings, "templateId" | "tileSize" | "layoutId">,
): TilesetResult {
  const analysis = analysisOf(source, settings.templateId, settings.tileSize);
  if (lastTileset && lastTileset.analysis === analysis && lastTileset.layoutId === settings.layoutId)
    return lastTileset.value;
  let value: TilesetResult;
  const blocking = analysis.issues.find((i) => i.level === "error");
  if (blocking || !analysis.template || !analysis.tileSize) {
    value = { analysis, tileset: null, error: blocking?.message ?? "The image can't be used as a template." };
  } else {
    try {
      const tileset = generate(source.image, {
        template: analysis.template,
        tileSize: analysis.tileSize,
        layout: getLayout(settings.layoutId),
      });
      value = { analysis, tileset, error: null };
    } catch (err) {
      value = { analysis, tileset: null, error: err instanceof Error ? err.message : String(err) };
    }
  }
  lastTileset = { analysis, layoutId: settings.layoutId, value };
  return value;
}

export function useTileset(): TilesetResult | null {
  const source = useApp((s) => s.source);
  const templateId = useApp((s) => s.settings.templateId);
  const tileSize = useApp((s) => s.settings.tileSize);
  const layoutId = useApp((s) => s.settings.layoutId);
  return source ? tilesetOf(source, { templateId, tileSize, layoutId }) : null;
}

export function baseName(source: Source | null): string {
  return sanitizeName(source?.file.name ?? "tileset");
}

export function exportNameOf(source: Source | null, settings: Settings): string {
  return sanitizeName(settings.fileName || `${baseName(source)}-autotile`);
}

export function terrainNameOf(source: Source | null, settings: Settings): string {
  return settings.terrainName.trim() || baseName(source);
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

export function terrainColorOf(source: Source | null, tileset: Tileset | null, settings: Settings): Rgb {
  const manual = settings.terrainColor ? hexToRgb(settings.terrainColor) : null;
  if (manual) return manual;
  return source && tileset ? terrainColor(tileset, source.image) : [90, 154, 60];
}
