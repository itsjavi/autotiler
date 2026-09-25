import { Dices, Eraser, LayoutGrid, Paintbrush, PaintBucket } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { allBlobCombinations, allDualCombinations, randomMap, renderTestMap, setCell } from "../../../core/index.ts";
import { fitZoom, PixelCanvas, useElementSize, type OverlayContext } from "../../components/PixelCanvas.tsx";
import { Button, Kbd } from "../../components/ui.tsx";
import { useTileset } from "../../state/derived.ts";
import { emptyMap, MAP_HEIGHT, MAP_WIDTH, useApp } from "../../state/store.ts";
import { ZoomControls } from "../tileset/TilesetView.tsx";

export function TestMapView() {
  const result = useTileset();
  const map = useApp((s) => s.map);
  const setMap = useApp((s) => s.setMap);
  const zoomSetting = useApp((s) => s.settings.mapZoom);
  const setSettings = useApp((s) => s.setSettings);
  const box = useRef<HTMLDivElement>(null);
  const size = useElementSize(box);
  const [seed, setSeed] = useState(5);
  const painting = useRef<boolean | null>(null);
  const tileset = result?.tileset ?? null;

  const image = useMemo(() => (tileset ? renderTestMap(tileset, map) : null), [tileset, map]);
  const fit = image ? fitZoom(image, { width: size.width - 2, height: size.height - 2 }, 8) : 1;
  const zoom = zoomSetting === "fit" ? fit : zoomSetting;

  const overlay = useCallback(
    ({ ctx, scale }: OverlayContext) => {
      if (!tileset) return;
      const t = tileset.tileSize * scale;
      ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
      for (let x = 1; x < map.width; x++) ctx.fillRect(x * t, 0, 1, map.height * t);
      for (let y = 1; y < map.height; y++) ctx.fillRect(0, y * t, map.width * t, 1);
    },
    [tileset, map.width, map.height],
  );

  if (!tileset || !image) {
    return (
      <section aria-label="Test map" className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
        {result?.error ?? "Open a template to paint with its tileset."}
      </section>
    );
  }

  const dual = tileset.layout.kind === "dual";
  const combos = () => setMap(dual ? allDualCombinations() : allBlobCombinations(8));

  return (
    <section aria-label="Test map" className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2">
        <Button size="sm" variant="ghost" onClick={() => setMap(emptyMap())}>
          <Eraser className="size-3.5" /> Clear
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setSeed(seed + 1);
            setMap(randomMap(MAP_WIDTH, MAP_HEIGHT, seed + 1, 0.52));
          }}
        >
          <Dices className="size-3.5" /> Random
        </Button>
        <Button size="sm" variant="ghost" onClick={combos}>
          <LayoutGrid className="size-3.5" /> All combinations
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setMap({ ...emptyMap(), cells: new Uint8Array(MAP_WIDTH * MAP_HEIGHT).fill(1) })}
        >
          <PaintBucket className="size-3.5" /> Fill
        </Button>
        <span className="ml-3 hidden items-center gap-1.5 text-[11px] text-muted xl:inline-flex">
          <Paintbrush className="size-3" /> drag to paint · right-drag or <Kbd>Alt</Kbd> to erase
        </span>
        <div className="ml-auto">
          <ZoomControls value={zoomSetting} fit={fit} onChange={(v) => setSettings({ mapZoom: v })} />
        </div>
      </div>
      <div ref={box} className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
        <div className="rounded-md border border-line shadow-lg">
          <PixelCanvas
            label="Test map painted with the generated tileset"
            className="cursor-crosshair touch-none"
            image={image}
            zoom={zoom}
            overlay={overlay}
            onPointer={(p, type) => {
              if (type === "up" || type === "leave" || !p) {
                painting.current = null;
                return;
              }
              if (type === "down") painting.current = !(p.buttons & 2 || p.altKey);
              if (painting.current === null || !p.buttons) return;
              const x = Math.floor(p.x / tileset.tileSize);
              const y = Math.floor(p.y / tileset.tileSize);
              const next = setCell(useApp.getState().map, x, y, painting.current);
              if (next !== useApp.getState().map) setMap(next);
            }}
          />
        </div>
      </div>
      <div className="flex h-7 shrink-0 items-center border-t border-line px-3 text-[11px] text-muted">
        {dual
          ? "Dual grid: tiles are drawn half a tile off the painted cells, like TileMapDual does."
          : "Painted like Godot's terrain painting picks tiles (verified against Godot 4.7)."}
      </div>
    </section>
  );
}
