// App-level actions shared by buttons, keyboard shortcuts, drag & drop, paste and live reload.
import {
  autotiler13,
  encodePng,
  getTemplate,
  renderGuide,
  repackTemplate,
  rpgmakerA2,
  type ExportFile,
  type TemplateId,
} from "../../core/index.ts";
import { notify } from "../components/toasts.tsx";
import { platform, type SourceFile } from "../platform/index.ts";
import { baseName, tilesetOf } from "../state/derived.ts";
import { useApp } from "../state/store.ts";
import { buildExport, pngOf, targetSupports } from "./export/build.ts";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

export interface Example {
  readonly file: string;
  readonly label: string;
  readonly hint: string;
}

export const EXAMPLES: readonly Example[] = [
  { file: "autotiler13-16px.png", label: "Beveled block, 16 px", hint: "Autotiler 13-tile template" },
  { file: "autotiler13-8px.png", label: "Beveled block, 8 px", hint: "Autotiler 13-tile template" },
  { file: "autotiler13-32px.png", label: "Beveled block, 32 px", hint: "Autotiler 13-tile template" },
  { file: "rpgmaker-a2-16px.png", label: "Beveled block, 16 px", hint: "RPG Maker A2 template" },
];

export function loadSource(file: SourceFile, reason: "open" | "reload" = "open"): void {
  const ok = useApp.getState().loadFile(file, reason);
  if (!ok) notify("Couldn't open the image", useApp.getState().loadError ?? undefined, { type: "error" });
}

export async function openFile(): Promise<void> {
  try {
    const file = await platform().openImage();
    if (file) loadSource(file);
  } catch (err) {
    notify("Couldn't open the file", messageOf(err), { type: "error" });
  }
}

/** The file name part of a path (either separator). */
export const fileNameOf = (path: string): string => path.split(/[\\/]/).pop() ?? path;

export async function openRecent(path: string): Promise<void> {
  const open = platform().openPath;
  if (!open) return;
  try {
    loadSource(await open(path));
  } catch (err) {
    useApp.setState((s) => ({ recent: s.recent.filter((r) => r !== path) }));
    notify(`Couldn't open ${fileNameOf(path)}`, messageOf(err), { type: "error" });
  }
}

/** Reopens the file of the last session (desktop); silently skipped when it moved or was deleted. */
export async function restoreLastFile(path: string | null): Promise<void> {
  const open = platform().openPath;
  if (!path || !open || useApp.getState().source) return;
  try {
    const file = await open(path);
    if (!useApp.getState().source) useApp.getState().loadFile(file);
  } catch {
    // gone or no longer readable: start empty
  }
}

export async function openExample(example: Example): Promise<void> {
  try {
    const res = await fetch(`./examples/${example.file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    useApp.getState().setSettings({ templateId: "auto", tileSize: null });
    loadSource({ name: example.file, bytes: new Uint8Array(await res.arrayBuffer()) });
  } catch (err) {
    notify("Couldn't load the example", messageOf(err), { type: "error" });
  }
}

export async function exportNow(options: { quiet?: boolean } = {}): Promise<boolean> {
  const { source, settings, outputFolder } = useApp.getState();
  if (!source) {
    notify("Nothing to export yet", "Open a template image first.", { type: "error" });
    return false;
  }
  const { tileset, error } = tilesetOf(source, settings);
  if (!tileset) {
    notify("Can't export", error ?? undefined, { type: "error" });
    return false;
  }
  if (!targetSupports(settings.target, tileset.layout)) {
    notify("Pick another format", "Godot TileSets need a 47-tile layout; use PNG or Tiled for the dual grid.", {
      type: "error",
    });
    return false;
  }
  const bundle = buildExport(source, tileset, settings);
  try {
    const result = await platform().save(bundle.files, bundle.zipName, outputFolder);
    if (!result) return false; // dialog cancelled
    if (result.folder) useApp.getState().setOutputFolder(result.folder);
    const folderPath = result.folder?.path ?? outputFolder?.path;
    const files = bundle.files.map((f) => f.path).join(", ");
    const showTip = settings.target === "godot4" && !settings.forceNearest && !settings.filterTipShown;
    if (showTip) useApp.getState().setSettings({ filterTipShown: true });
    const tip = showTip
      ? " For crisp pixels in Godot: Project Settings → Rendering → Textures → Default Texture Filter = Nearest (or turn on “Force nearest filtering”)."
      : "";
    const p = platform();
    const where = folderPath;
    notify(
      options.quiet
        ? `Re-exported ${bundle.name}`
        : result.kind === "written"
          ? `Exported to ${result.where}`
          : `Downloaded ${result.where}`,
      options.quiet ? files : `${files}.${tip}`,
      {
        type: "success",
        action:
          p.reveal && where
            ? { label: "Show in folder", onClick: () => void p.reveal?.(`${where}/${bundle.files[0].path}`) }
            : undefined,
      },
    );
    return true;
  } catch (err) {
    notify("Export failed", messageOf(err), { type: "error" });
    return false;
  }
}

export async function copyPng(): Promise<void> {
  const { source, settings } = useApp.getState();
  const tileset = source ? tilesetOf(source, settings).tileset : null;
  if (!tileset) return;
  try {
    await platform().copyPng(pngOf(tileset));
    notify("Copied the tileset image", "Paste it into Aseprite or any image editor.", { type: "success" });
  } catch (err) {
    notify("Couldn't copy the image", messageOf(err), { type: "error" });
  }
}

/** Saves one image through a save dialog (desktop) or as a download (web). */
async function saveImage(file: ExportFile, what: string): Promise<void> {
  try {
    const result = await platform().save([file], file.path, null);
    if (result?.kind === "written") notify(`Saved the ${what}`, result.where, { type: "success" });
  } catch (err) {
    notify(`Couldn't save the ${what}`, messageOf(err), { type: "error" });
  }
}

export async function saveGuide(templateId: TemplateId, tileSize: number): Promise<void> {
  const png = encodePng(renderGuide(getTemplate(templateId), tileSize));
  await saveImage({ path: `${templateId}-guide-${tileSize}px.png`, data: png }, "blank template");
}

/** The other template kind: 13-tile ⇄ RPG Maker A2. */
export const counterpartOf = (id: TemplateId) => (id === "rpgmaker-a2" ? autotiler13 : rpgmakerA2);

/** Saves the source rearranged into the other template layout (e.g. to reuse the art in RPG Maker). */
export async function saveConverted(): Promise<void> {
  const { source, settings } = useApp.getState();
  const analysis = source ? tilesetOf(source, settings).analysis : null;
  if (!source || !analysis?.template || !analysis.tileSize) return;
  const to = counterpartOf(analysis.template.id);
  const png = encodePng(repackTemplate(source.image, analysis.template, to, analysis.tileSize));
  const suffix = to.id === "rpgmaker-a2" ? "a2" : "13tile";
  await saveImage({ path: `${baseName(source)}-${suffix}.png`, data: png }, `${to.name} template`);
}

export async function chooseOutputFolder(): Promise<void> {
  const folder = await platform().pickOutputFolder();
  if (folder) useApp.getState().setOutputFolder(folder);
}
