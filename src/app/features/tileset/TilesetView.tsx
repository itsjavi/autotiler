import { Grid3x3, Maximize, Minus, Plus, Shapes, SquareDashed, Waypoints } from "lucide-react";
import { useCallback, useId, useRef, type KeyboardEvent } from "react";

import {
  DIRECTIONS,
  directionsOf,
  godot3Bitmask,
  godot4PeeringBits,
  type Tileset,
  type TilesetCell,
} from "../../../core/index.ts";
import { fitZoom, PixelCanvas, useElementSize, type OverlayContext } from "../../components/PixelCanvas.tsx";
import { IconButton, Kbd, Tip } from "../../components/ui.tsx";
import { cn } from "../../lib/cn.ts";
import { useTileset } from "../../state/derived.ts";
import { useApp, type Overlays } from "../../state/store.ts";

export function ZoomControls({
  value,
  fit,
  onChange,
}: {
  value: number | "fit";
  fit: number;
  onChange: (v: number | "fit") => void;
}) {
  const current = value === "fit" ? fit : value;
  const label = Number.isInteger(current) ? `${current}×` : `${current.toFixed(1)}×`;
  return (
    <div className="flex items-center gap-0.5">
      <IconButton
        label="Zoom out (−)"
        onClick={() => onChange(Math.max(1, Math.ceil(current) - 1))}
        disabled={current <= 1}
      >
        <Minus className="size-4" />
      </IconButton>
      <span className="w-10 text-center text-xs text-muted tabular-nums">{label}</span>
      <IconButton
        label="Zoom in (+)"
        onClick={() => onChange(Math.min(16, Math.floor(current) + 1))}
        disabled={current >= 16}
      >
        <Plus className="size-4" />
      </IconButton>
      <IconButton label="Fit (0)" onClick={() => onChange("fit")} className={cn(value === "fit" && "text-accent")}>
        <Maximize className="size-4" />
      </IconButton>
    </div>
  );
}

function OverlayToggle({
  id,
  label,
  keyHint,
  children,
}: {
  id: keyof Overlays;
  label: string;
  keyHint: string;
  children: React.ReactNode;
}) {
  const on = useApp((s) => s.settings.overlays[id]);
  const setOverlay = useApp((s) => s.setOverlay);
  return (
    <Tip
      content={
        <span className="inline-flex items-center gap-1.5">
          {label} <Kbd>{keyHint}</Kbd>
        </span>
      }
    >
      <button
        type="button"
        aria-pressed={on}
        aria-label={label}
        onClick={() => setOverlay(id, !on)}
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-colors",
          on ? "bg-raised text-ink" : "text-muted hover:bg-raised/60 hover:text-ink",
        )}
      >
        {children}
      </button>
    </Tip>
  );
}

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  scale: number,
  tileset: Tileset,
  overlays: Overlays,
  collision: boolean,
  hover: { x: number; y: number } | null,
) {
  const ts = tileset.tileSize;
  const t = ts * scale;
  const { columns, rows } = tileset.layout;
  const W = columns * t;
  const H = rows * t;
  if (overlays.quarters) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    const half = Math.floor(ts / 2) * scale;
    for (let x = 0; x < columns; x++) ctx.fillRect(x * t + half, 0, 1, H);
    for (let y = 0; y < rows; y++) ctx.fillRect(0, y * t + half, W, 1);
  }
  if (overlays.grid) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.30)";
    for (let x = 1; x < columns; x++) ctx.fillRect(x * t, 0, 1, H);
    for (let y = 1; y < rows; y++) ctx.fillRect(0, y * t, W, 1);
  }
  if (overlays.bits) {
    // small markers on a 3×3 grid, like Godot's terrain peering-bit editor
    const third = t / 3;
    const m = Math.max(2, Math.round(t / 7));
    for (const cell of tileset.cells) {
      const ox = cell.x * t;
      const oy = cell.y * t;
      const square = (col: number, row: number) => {
        const x = Math.round(ox + col * third + (third - m) / 2);
        const y = Math.round(oy + row * third + (third - m) / 2);
        ctx.fillStyle = "rgba(13, 20, 34, 0.85)";
        ctx.fillRect(x - 1, y - 1, m + 2, m + 2);
        ctx.fillStyle = "#699ce8";
        ctx.fillRect(x, y, m, m);
      };
      if (cell.mask !== null) {
        square(1, 1);
        for (const d of DIRECTIONS) if (cell.mask & d.bit) square(d.dx + 1, d.dy + 1);
      } else if (cell.corners !== null) {
        if (cell.corners & 1) square(0, 0);
        if (cell.corners & 2) square(2, 0);
        if (cell.corners & 4) square(0, 2);
        if (cell.corners & 8) square(2, 2);
      }
    }
  }
  if (overlays.collision && collision && tileset.layout.kind === "blob") {
    ctx.strokeStyle = "rgba(80, 220, 255, 0.85)";
    ctx.lineWidth = 1;
    for (const cell of tileset.cells) ctx.strokeRect(cell.x * t + 1.5, cell.y * t + 1.5, t - 3, t - 3);
  }
  if (hover) {
    ctx.strokeStyle = "#fcc751";
    ctx.lineWidth = Math.max(2, Math.round(scale / 2));
    ctx.strokeRect(hover.x * t + 1, hover.y * t + 1, t - 2, t - 2);
  }
}

function describe(cell: TilesetCell | undefined): string {
  if (!cell) return "";
  if (cell.mask !== null) {
    const dirs = directionsOf(cell.mask);
    return `Tile ${cell.x},${cell.y} · neighbours: ${dirs.length ? dirs.join(" ") : "none (isolated)"} · Godot 3 bitmask ${godot3Bitmask(cell.mask)} · Godot 4 bits: ${godot4PeeringBits(cell.mask).length}`;
  }
  const c = cell.corners ?? 0;
  const names = [c & 1 && "TL", c & 2 && "TR", c & 4 && "BL", c & 8 && "BR"].filter(Boolean);
  return `Dual tile ${cell.x},${cell.y} · filled corners: ${names.length ? names.join(" ") : "none"}`;
}

const ARROWS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** The next tile from `from` in direction (dx, dy), skipping the layout's empty cells. */
function step(tileset: Tileset, from: { x: number; y: number }, dx: number, dy: number) {
  const { columns, rows } = tileset.layout;
  for (let x = from.x + dx, y = from.y + dy; x >= 0 && y >= 0 && x < columns && y < rows; x += dx, y += dy) {
    if (tileset.cells.some((c) => c.x === x && c.y === y)) return { x, y };
  }
  return null;
}

const firstCell = (tileset: Tileset) =>
  tileset.cells.reduce((a, c) => (c.y < a.y || (c.y === a.y && c.x < a.x) ? c : a), tileset.cells[0]);

export function TilesetView() {
  const result = useTileset();
  const zoomSetting = useApp((s) => s.settings.zoom);
  const overlays = useApp((s) => s.settings.overlays);
  const collision = useApp((s) => s.settings.collision);
  const hover = useApp((s) => s.hover);
  const setHover = useApp((s) => s.setHover);
  const setSettings = useApp((s) => s.setSettings);
  const box = useRef<HTMLDivElement>(null);
  const size = useElementSize(box);
  const statusId = useId();
  const tileset = result?.tileset ?? null;

  const overlay = useCallback(
    ({ ctx, scale }: OverlayContext) => {
      if (tileset) drawOverlays(ctx, scale, tileset, overlays, collision, hover);
    },
    [tileset, overlays, collision, hover],
  );

  // keyboard inspection: arrow keys walk the tiles, the status bar (a live region) describes the current one
  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const d = ARROWS[e.key];
    if (!d || !tileset) return;
    e.preventDefault();
    const next = hover ? step(tileset, hover, d[0], d[1]) : firstCell(tileset);
    if (next) setHover({ x: next.x, y: next.y });
  };

  const fit = tileset ? fitZoom(tileset.image, { width: size.width - 2, height: size.height - 2 }) : 1;
  const zoom = zoomSetting === "fit" ? fit : zoomSetting;
  const hovered = tileset && hover ? tileset.cells.find((c) => c.x === hover.x && c.y === hover.y) : undefined;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2">
        <OverlayToggle id="grid" label="Tile grid" keyHint="G">
          <Grid3x3 className="size-3.5" /> Grid
        </OverlayToggle>
        <OverlayToggle id="quarters" label="Quarter split" keyHint="Q">
          <SquareDashed className="size-3.5" /> Quarters
        </OverlayToggle>
        <OverlayToggle id="bits" label="Neighbour bits (Godot peering bits / bitmask)" keyHint="B">
          <Waypoints className="size-3.5" /> Bits
        </OverlayToggle>
        <OverlayToggle id="collision" label="Collision shapes" keyHint="C">
          <Shapes className="size-3.5" /> Collision
        </OverlayToggle>
        <div className="ml-auto">
          {tileset ? <ZoomControls value={zoomSetting} fit={fit} onChange={(v) => setSettings({ zoom: v })} /> : null}
        </div>
      </div>
      <div ref={box} className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
        {tileset ? (
          <div className="rounded-md border border-line shadow-lg">
            <PixelCanvas
              label={`Generated tileset, ${tileset.cells.length} tiles`}
              className="outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
              tabIndex={0}
              aria-describedby={statusId}
              onKeyDown={onKeyDown}
              onFocus={() => {
                if (!useApp.getState().hover) {
                  const first = firstCell(tileset);
                  setHover({ x: first.x, y: first.y });
                }
              }}
              onBlur={() => setHover(null)}
              image={tileset.image}
              zoom={zoom}
              overlay={overlay}
              onPointer={(p) => {
                if (!p) return setHover(null);
                const x = Math.floor(p.x / tileset.tileSize);
                const y = Math.floor(p.y / tileset.tileSize);
                const cell = tileset.cells.find((c) => c.x === x && c.y === y);
                const next = cell ? { x, y } : null;
                if (next?.x !== hover?.x || next?.y !== hover?.y) setHover(next);
              }}
            />
          </div>
        ) : (
          <EmptyState error={result?.error ?? null} />
        )}
      </div>
      <div className="flex h-7 shrink-0 items-center border-t border-line px-3 text-[11px] text-muted">
        <span id={statusId} aria-live="polite" className="truncate">
          {hovered
            ? describe(hovered)
            : tileset
              ? `${tileset.cells.length} tiles · ${tileset.layout.name} · ${tileset.tileSize} px — hover a tile (or focus the image and use the arrow keys) to inspect it`
              : ""}
        </span>
      </div>
    </section>
  );
}

function EmptyState({ error }: { error: string | null }) {
  return error ? (
    <div className="max-w-sm text-center">
      <p className="text-sm text-ink">The tileset can't be generated yet.</p>
      <p className="mt-1 text-xs text-muted">{error}</p>
    </div>
  ) : (
    <div className="max-w-md text-center">
      <p className="text-base font-medium text-ink">Turn a small template into a full autotile tileset</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Open or drop a PNG in the 13-tile Autotiler or RPG Maker A2 layout. You get the 47-tile blob set (or a 16-tile
        dual grid) with Godot 4 terrains, Tiled Wang sets or plain PNG — and a test map to try it.
      </p>
    </div>
  );
}
