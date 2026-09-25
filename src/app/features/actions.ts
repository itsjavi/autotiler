// App-level actions shared by buttons, keyboard shortcuts, drag & drop, paste and live reload.
import { encodePng, getTemplate, renderGuide, type TemplateId } from "../../core/index.ts";
import { notify } from "../components/toasts.tsx";
import { platform, type SourceFile } from "../platform/index.ts";
import { tilesetOf } from "../state/derived.ts";
import { useApp } from "../state/store.ts";
import { buildExport, pngOf, targetSupports } from "./export/build.ts";

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
    notify("Couldn't open the file", err instanceof Error ? err.message : String(err), { type: "error" });
  }
}

export async function openExample(example: Example): Promise<void> {
  try {
    const res = await fetch(`./examples/${example.file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    useApp.getState().setSettings({ templateId: "auto", tileSize: null });
    loadSource({ name: example.file, bytes: new Uint8Array(await res.arrayBuffer()) });
  } catch (err) {
    notify("Couldn't load the example", err instanceof Error ? err.message : String(err), { type: "error" });
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
    const tip =
      settings.target === "godot4" && !settings.forceNearest
        ? " For crisp pixels in Godot: Project Settings → Rendering → Textures → Default Texture Filter = Nearest."
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
    notify("Export failed", err instanceof Error ? err.message : String(err), { type: "error" });
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
    notify("Couldn't copy the image", err instanceof Error ? err.message : String(err), { type: "error" });
  }
}

export async function saveGuide(templateId: TemplateId, tileSize: number): Promise<void> {
  const template = getTemplate(templateId);
  const png = encodePng(renderGuide(template, tileSize));
  const name = `${templateId}-guide-${tileSize}px.png`;
  try {
    await platform().save([{ path: name, data: png }], name, null);
  } catch (err) {
    notify("Couldn't save the template", err instanceof Error ? err.message : String(err), { type: "error" });
  }
}

export async function chooseOutputFolder(): Promise<void> {
  const folder = await platform().pickOutputFolder();
  if (folder) useApp.getState().setOutputFolder(folder);
}
