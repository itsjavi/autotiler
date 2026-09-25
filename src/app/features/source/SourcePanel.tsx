import { AlertTriangle, CircleX, Eye, FolderOpen, Info, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { PIECE_COLORS, PIECE_KINDS, PIECE_NAMES, quarterRect, type Issue, type Template } from "../../../core/index.ts";
import { fitZoom, PixelCanvas, useElementSize, type OverlayContext } from "../../components/PixelCanvas.tsx";
import { Button, Field, IconButton, SelectInput, TextInput } from "../../components/ui.tsx";
import { cn } from "../../lib/cn.ts";
import { platform } from "../../platform/index.ts";
import { useTileset } from "../../state/derived.ts";
import { useApp, type Source } from "../../state/store.ts";
import { EXAMPLES, openExample, openFile } from "../actions.ts";

const TEMPLATE_OPTIONS = [
  { value: "auto", label: "Detect automatically" },
  { value: "autotiler-13", label: "Autotiler 13-tile (5×3)", hint: "3×3 island + inner-corner block" },
  { value: "rpgmaker-a2", label: "RPG Maker A2 (2×3)", hint: "VX Ace / MV / MZ floor autotile" },
] as const;

export function SourcePanel() {
  const source = useApp((s) => s.source);
  const loadError = useApp((s) => s.loadError);
  return (
    <aside
      aria-label="Source"
      className="flex min-h-0 flex-col gap-3 overflow-y-auto border-r border-line bg-panel p-3"
    >
      {source ? <LoadedSource source={source} /> : <EmptySource />}
      {loadError ? (
        <ul>
          <IssueRow issue={{ level: "error", code: "unknown-size", message: loadError }} />
        </ul>
      ) : null}
    </aside>
  );
}

function EmptySource() {
  return (
    <>
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Source</h2>
      <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-line px-4 py-8 text-center">
        <p className="text-sm text-ink">Drop a template PNG here, paste it, or open a file.</p>
        <Button variant="primary" onClick={() => void openFile()}>
          <FolderOpen className="size-4" /> Open image…
        </Button>
        <p className="text-xs leading-relaxed text-muted">
          <strong className="font-medium text-ink">Autotiler 13-tile:</strong> 5×3 tiles — a 3×3 island plus a 2×2 block
          whose centre has the inner corners.
          <br />
          <strong className="font-medium text-ink">RPG Maker A2:</strong> 2×3 tiles.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">Try an example</span>
        {EXAMPLES.map((e) => (
          <button
            key={e.file}
            type="button"
            onClick={() => void openExample(e)}
            className="flex flex-col rounded-md px-2 py-1.5 text-left hover:bg-raised"
          >
            <span className="text-sm text-ink">{e.label}</span>
            <span className="text-[11px] text-muted">{e.hint}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function LoadedSource({ source }: { source: Source }) {
  const result = useTileset();
  const templateId = useApp((s) => s.settings.templateId);
  const tileSize = useApp((s) => s.settings.tileSize);
  const setSettings = useApp((s) => s.setSettings);
  const closeSource = useApp((s) => s.closeSource);
  const analysis = result?.analysis;
  const template = analysis?.template ?? null;
  const watching = platform().canWatch && source.file.ref !== undefined;

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Source</h2>
        <IconButton label="Close image" onClick={closeSource}>
          <X className="size-4" />
        </IconButton>
      </div>
      <SourcePreview source={source} template={template} tileSize={analysis?.tileSize ?? null} />
      <div className="flex flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-ink" title={source.file.location ?? source.file.name}>
          {source.file.name}
        </span>
        <span className="text-xs text-muted">
          {source.image.width}×{source.image.height} px
          {template && analysis?.tileSize
            ? ` · ${template.columns}×${template.rows} tiles of ${analysis.tileSize} px`
            : ""}
        </span>
        {watching ? (
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-ok">
            <Eye className="size-3" /> Watching for changes — save in your editor to update
          </span>
        ) : null}
      </div>
      <Field label="Template">
        <SelectInput
          label="Template"
          value={templateId}
          options={TEMPLATE_OPTIONS}
          onChange={(v) => setSettings({ templateId: v, tileSize: null })}
        />
      </Field>
      <Field
        label="Tile size"
        hint={tileSize === null ? "Detected from the image size." : "Set manually — clear it to detect again."}
      >
        <TextInput
          type="number"
          min={2}
          max={512}
          inputMode="numeric"
          placeholder={analysis?.tileSize ? `${analysis.tileSize} (auto)` : "auto"}
          value={tileSize ?? ""}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            setSettings({ tileSize: Number.isFinite(n) && n >= 2 ? n : null });
          }}
        />
      </Field>
      {analysis && analysis.issues.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {analysis.issues.map((issue) => (
            <IssueRow key={issue.code + issue.message} issue={issue} />
          ))}
        </ul>
      ) : null}
      <PieceLegend />
    </>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const Icon = issue.level === "error" ? CircleX : issue.level === "warning" ? AlertTriangle : Info;
  return (
    <li
      className={cn(
        "flex list-none gap-2 rounded-md border px-2 py-1.5 text-xs leading-snug",
        issue.level === "error" && "border-danger/50 bg-danger/10 text-ink",
        issue.level === "warning" && "border-warn/40 bg-warn/10 text-ink",
        issue.level === "info" && "border-line bg-raised text-muted",
      )}
    >
      <Icon
        className={cn(
          "mt-px size-3.5 shrink-0",
          issue.level === "error" ? "text-danger" : issue.level === "warning" ? "text-warn" : "text-muted",
        )}
      />
      <span>{issue.message}</span>
    </li>
  );
}

function PieceLegend() {
  return (
    <details className="group text-xs text-muted">
      <summary className="cursor-pointer select-none hover:text-ink">How templates work</summary>
      <p className="mt-2 leading-relaxed">
        Every tile is built from four quarters. A quarter shows one of five pieces depending on its neighbours; the
        template provides each piece once (or a few times, for context):
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {PIECE_KINDS.map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ backgroundColor: `rgb(${PIECE_COLORS[k].join(",")})` }} />
            <span className="text-ink">{PIECE_NAMES[k]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 leading-relaxed">The colours match the downloadable blank templates.</p>
    </details>
  );
}

function SourcePreview({
  source,
  template,
  tileSize,
}: {
  source: Source;
  template: Template | null;
  tileSize: number | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const size = useElementSize(box);
  const hover = useApp((s) => s.hover);
  const result = useTileset();
  const [slotLabel, setSlotLabel] = useState<string | null>(null);
  const zoom = fitZoom(source.image, { width: size.width || 256, height: 240 }, 8);

  const overlay = useCallback(
    ({ ctx, scale }: OverlayContext) => {
      if (!template || !tileSize) return;
      const t = tileSize * scale;
      // dim the cells generation never reads
      for (const slot of template.slots) {
        if (slot.used) continue;
        ctx.fillStyle = "rgba(20, 24, 34, 0.72)";
        ctx.fillRect(slot.tx * t, slot.ty * t, t, t);
      }
      ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
      for (let x = 1; x < template.columns; x++) ctx.fillRect(x * t, 0, 1, template.rows * t);
      for (let y = 1; y < template.rows; y++) ctx.fillRect(0, y * t, template.columns * t, 1);
      // quarters used by the hovered output tile
      const cell = hover && result?.tileset?.cells.find((c) => c.x === hover.x && c.y === hover.y);
      if (cell) {
        ctx.lineWidth = Math.max(2, Math.round(scale / 2));
        ctx.strokeStyle = "#fcc751";
        for (const ref of cell.quarters) {
          if (!ref) continue;
          const q = quarterRect(tileSize, ref.corner);
          ctx.strokeRect(ref.tx * t + q.x * scale + 1, ref.ty * t + q.y * scale + 1, q.w * scale - 2, q.h * scale - 2);
        }
      }
    },
    [template, tileSize, hover, result],
  );

  return (
    <div ref={box} className="flex flex-col items-center gap-1">
      <div className="overflow-hidden rounded-md border border-line">
        <PixelCanvas
          label="Source template"
          image={source.image}
          zoom={zoom}
          overlay={overlay}
          onPointer={(p) => {
            if (!p || !template || !tileSize) return setSlotLabel(null);
            const slot = template.slots.find(
              (s) => s.tx === Math.floor(p.x / tileSize) && s.ty === Math.floor(p.y / tileSize),
            );
            setSlotLabel(slot ? `${slot.label}${slot.used ? "" : " — not used"}` : null);
          }}
        />
      </div>
      <span className="h-4 text-[11px] text-muted">
        {slotLabel ?? (hover ? "Highlighted: quarters used by the hovered tile" : "")}
      </span>
    </div>
  );
}
