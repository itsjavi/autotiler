import { Copy, FileDown, FolderInput, FolderOpen, X } from "lucide-react";

import { getLayout, LAYOUTS, toHex } from "../../../core/index.ts";
import { Button, Field, IconButton, Segmented, SelectInput, SwitchInput, TextInput } from "../../components/ui.tsx";
import { platform } from "../../platform/index.ts";
import { baseName, exportNameOf, terrainColorOf, useTileset } from "../../state/derived.ts";
import { useApp } from "../../state/store.ts";
import { chooseOutputFolder, copyPng, exportNow } from "../actions.ts";
import { buildExport, TARGETS, targetSupports } from "./build.ts";

export function ExportPanel() {
  const settings = useApp((s) => s.settings);
  const source = useApp((s) => s.source);
  const outputFolder = useApp((s) => s.outputFolder);
  const godotPath = useApp((s) => s.godotPath);
  const setSettings = useApp((s) => s.setSettings);
  const result = useTileset();
  const tileset = result?.tileset ?? null;
  const layout = getLayout(settings.layoutId);
  const supported = targetSupports(settings.target, layout);
  const p = platform();
  const bundle = source && tileset && supported ? buildExport(source, tileset, settings) : null;
  const autoColor = toHex(terrainColorOf(source, tileset, { ...settings, terrainColor: null }));
  const usesTerrain = settings.target === "godot4" || settings.target === "tiled";
  const canAutoExport = p.canWatch && !!outputFolder;

  return (
    <aside
      aria-label="Export"
      className="flex min-h-0 flex-col gap-4 overflow-y-auto border-l border-line bg-panel p-3"
    >
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Export</h2>

      <Field label="Layout" hint={layout.description}>
        <SelectInput
          label="Layout"
          value={settings.layoutId}
          options={LAYOUTS.map((l) => ({ value: l.id, label: l.name }))}
          onChange={(layoutId) => {
            const next = getLayout(layoutId);
            setSettings({ layoutId, ...(targetSupports(settings.target, next) ? {} : { target: "png" }) });
          }}
        />
      </Field>

      <Field label="Format" hint={TARGETS.find((t) => t.id === settings.target)?.hint}>
        <Segmented
          label="Format"
          value={settings.target}
          options={TARGETS.map((t) => ({ value: t.id, label: t.label, disabled: !targetSupports(t.id, layout) }))}
          onChange={(target) => setSettings({ target })}
        />
      </Field>

      {usesTerrain ? (
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <Field label="Terrain name">
            <TextInput
              value={settings.terrainName}
              placeholder={baseName(source)}
              onChange={(e) => setSettings({ terrainName: e.target.value })}
            />
          </Field>
          <Field label="Colour">
            <div className="flex items-center gap-1">
              <input
                type="color"
                aria-label="Terrain colour"
                value={settings.terrainColor ?? autoColor}
                onChange={(e) => setSettings({ terrainColor: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded-md border border-line bg-field p-0.5"
              />
              {settings.terrainColor ? (
                <IconButton label="Use the fill colour" onClick={() => setSettings({ terrainColor: null })}>
                  <X className="size-3.5" />
                </IconButton>
              ) : null}
            </div>
          </Field>
        </div>
      ) : null}

      {settings.target === "godot4" || settings.target === "godot3" ? (
        <SwitchInput
          label="Full-tile collisions"
          hint="A square collision polygon on physics layer 0 for every tile."
          checked={settings.collision}
          onChange={(collision) => setSettings({ collision })}
        />
      ) : null}
      {settings.target === "godot4" ? (
        <SwitchInput
          label="Force nearest filtering"
          hint="Wraps the texture in a CanvasTexture so pixels stay crisp without changing project settings (Godot 4.2+)."
          checked={settings.forceNearest}
          onChange={(forceNearest) => setSettings({ forceNearest })}
        />
      ) : null}
      {settings.target === "png" ? (
        <SwitchInput
          label="JSON tile map"
          hint="Adds <name>.autotile.json with each tile's neighbour mask, for custom engines."
          checked={settings.sidecar}
          onChange={(sidecar) => setSettings({ sidecar })}
        />
      ) : null}

      <Field label="File name">
        <TextInput
          value={settings.fileName}
          placeholder={exportNameOf(source, { ...settings, fileName: "" })}
          onChange={(e) => setSettings({ fileName: e.target.value })}
        />
      </Field>

      {bundle ? (
        <ul className="flex flex-col gap-0.5 rounded-md border border-line bg-field px-2 py-1.5 font-mono text-[11px] text-muted">
          {bundle.files.map((f) => (
            <li key={f.path} className="truncate">
              {f.path}
            </li>
          ))}
        </ul>
      ) : null}

      <DestinationField />

      <div className="flex flex-col gap-2">
        <Button variant="primary" disabled={!bundle} onClick={() => void exportNow()}>
          <FileDown className="size-4" />{" "}
          {outputFolder ? `Export to ${outputFolder.label}` : p.kind === "desktop" ? "Export…" : "Download"}
        </Button>
        <Button disabled={!tileset} onClick={() => void copyPng()}>
          <Copy className="size-4" /> Copy PNG
        </Button>
      </div>

      {p.canWatch ? (
        <SwitchInput
          label="Re-export when the source changes"
          hint={
            canAutoExport
              ? "Edit the template in your pixel editor and the files update on save."
              : "Choose an export folder first."
          }
          checked={settings.autoExport && canAutoExport}
          disabled={!canAutoExport}
          onChange={(autoExport) => setSettings({ autoExport })}
        />
      ) : null}

      {godotPath || outputFolder ? null : settings.target === "godot4" ? (
        <p className="text-[11px] leading-relaxed text-muted">
          Put the files anywhere inside your Godot project; the texture is referenced relative to the <code>.tres</code>
          .
        </p>
      ) : null}
    </aside>
  );
}

function DestinationField() {
  const outputFolder = useApp((s) => s.outputFolder);
  const godotPath = useApp((s) => s.godotPath);
  const setOutputFolder = useApp((s) => s.setOutputFolder);
  const p = platform();
  if (!p.canPickFolder) {
    return <p className="text-[11px] text-muted">Files are downloaded (several files come as a .zip).</p>;
  }
  return (
    <Field
      label="Destination"
      hint={
        outputFolder
          ? godotPath
            ? `Inside a Godot project: ${godotPath}`
            : "Not inside a Godot project folder (that's fine for PNG/Tiled)."
          : p.kind === "desktop"
            ? "You'll be asked where to save. Pick a folder to export with one click."
            : "Downloads by default. Pick a folder to write the files directly."
      }
    >
      <div className="flex items-center gap-1">
        <Button className="min-w-0 flex-1 justify-start" onClick={() => void chooseOutputFolder()}>
          {outputFolder ? <FolderOpen className="size-4 shrink-0" /> : <FolderInput className="size-4 shrink-0" />}
          <span className="truncate" title={outputFolder?.path ?? outputFolder?.label}>
            {outputFolder ? outputFolder.label : "Choose folder…"}
          </span>
        </Button>
        {outputFolder ? (
          <IconButton label="Forget folder" onClick={() => setOutputFolder(null)}>
            <X className="size-4" />
          </IconButton>
        ) : null}
      </div>
    </Field>
  );
}
