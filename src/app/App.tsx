import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import { Tooltip } from "@base-ui/react/tooltip";
import { Upload, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Toaster } from "./components/toasts.tsx";
import { Kbd } from "./components/ui.tsx";
import { copyPng, exportNow, loadSource, openFile } from "./features/actions.ts";
import { ExportPanel } from "./features/export/ExportPanel.tsx";
import { Header } from "./features/Header.tsx";
import { SourcePanel } from "./features/source/SourcePanel.tsx";
import { TestMapView } from "./features/test-map/TestMapView.tsx";
import { TilesetView } from "./features/tileset/TilesetView.tsx";
import { cn } from "./lib/cn.ts";
import { platform } from "./platform/index.ts";
import { useApp, type Overlays, type View } from "./state/store.ts";

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/** Drag & drop anywhere on the window (HTML5 on the web, native events on desktop). */
function useFileDrop(): boolean {
  const [over, setOver] = useState(false);
  useEffect(() => {
    const p = platform();
    if (p.subscribeNativeDrop) {
      let unsubscribe: (() => void) | undefined;
      let cancelled = false;
      void p
        .subscribeNativeDrop((file) => loadSource(file), setOver)
        .then((u) => {
          if (cancelled) u();
          else unsubscribe = u;
        });
      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    }
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files") ?? false;
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setOver(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const overFn = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!e.dataTransfer || !hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setOver(false);
      void p.fileFromDataTransfer(e.dataTransfer).then((file) => file && loadSource(file));
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", overFn);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", overFn);
      window.removeEventListener("drop", drop);
    };
  }, []);
  return over;
}

/** Paste a PNG from the clipboard (e.g. copied in Aseprite). */
function usePaste(): void {
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type === "image/png");
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();
      void file.arrayBuffer().then((buf) => loadSource({ name: "pasted.png", bytes: new Uint8Array(buf) }));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);
}

const OVERLAY_KEYS: Record<string, keyof Overlays> = { g: "grid", q: "quarters", b: "bits", c: "collision" };

function useHotkeys(showShortcuts: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "o") {
        e.preventDefault();
        void openFile();
      } else if (mod && k === "e") {
        e.preventDefault();
        void exportNow();
      } else if (mod && e.shiftKey && k === "c") {
        e.preventDefault();
        void copyPng();
      } else if (!mod && !e.altKey && !isTyping(e.target)) {
        const s = useApp.getState();
        if (k === "1" || k === "2") s.setView(k === "1" ? "tileset" : "map");
        else if (OVERLAY_KEYS[k]) s.setOverlay(OVERLAY_KEYS[k], !s.settings.overlays[OVERLAY_KEYS[k]]);
        else if (k === "?") showShortcuts();
        else if (k === "+" || k === "=" || k === "-" || k === "0") {
          const key = s.view === "tileset" ? "zoom" : "mapZoom";
          const current = s.settings[key];
          if (k === "0") s.setSettings({ [key]: "fit" });
          else {
            const base = current === "fit" ? 4 : current;
            s.setSettings({ [key]: Math.min(16, Math.max(1, base + (k === "-" ? -1 : 1))) });
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showShortcuts]);
}

/** Re-reads the source when it changes on disk; optionally re-exports. */
function useLiveReload(): void {
  const file = useApp((s) => s.source?.file);
  useEffect(() => {
    if (!file) return undefined;
    return platform().watch(file, (next) => loadSource(next, "reload")) ?? undefined;
  }, [file]);

  const revision = useApp((s) => s.source?.revision);
  const reason = useApp((s) => s.source?.reason);
  useEffect(() => {
    const { settings, outputFolder } = useApp.getState();
    // `revision` changes on every reload, so saving the same file twice re-exports twice
    if (revision !== undefined && reason === "reload" && settings.autoExport && outputFolder)
      void exportNow({ quiet: true });
  }, [revision, reason]);
}

const SHORTCUTS: ReadonlyArray<[string, string]> = [
  ["⌘/Ctrl O", "Open an image"],
  ["⌘/Ctrl V", "Paste an image"],
  ["⌘/Ctrl E", "Export"],
  ["⌘/Ctrl ⇧ C", "Copy the tileset PNG"],
  ["1 / 2", "Tileset / test map"],
  ["G · Q · B · C", "Grid · quarters · bits · collision overlays"],
  ["+ / − / 0", "Zoom in / out / fit"],
];

export function App() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const dragging = useFileDrop();
  usePaste();
  useHotkeys(() => setShortcutsOpen(true));
  useLiveReload();
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);

  return (
    <Tooltip.Provider delay={350}>
      <div className="flex h-dvh min-h-0 flex-col bg-app text-ink">
        <Header onShowShortcuts={() => setShortcutsOpen(true)} />
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-[18rem_minmax(0,1fr)_19rem] lg:overflow-hidden">
          <SourcePanel />
          <Tabs.Root
            value={view}
            onValueChange={(v: View) => setView(v)}
            className="flex min-h-[28rem] min-w-0 flex-col bg-app"
          >
            <Tabs.List aria-label="View" className="flex h-9 shrink-0 items-end gap-1 border-b border-line px-2">
              {(["tileset", "map"] as const).map((v) => (
                <Tabs.Tab
                  key={v}
                  value={v}
                  className="-mb-px rounded-t-md border border-transparent px-3 py-1.5 text-xs font-medium text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/70 data-active:border-line data-active:border-b-app data-active:bg-app data-active:text-ink"
                >
                  {v === "tileset" ? "Tileset" : "Test map"}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            <Tabs.Panel value="tileset" className="flex min-h-0 flex-1 flex-col outline-none">
              <TilesetView />
            </Tabs.Panel>
            <Tabs.Panel value="map" className="flex min-h-0 flex-1 flex-col outline-none">
              <TestMapView />
            </Tabs.Panel>
          </Tabs.Root>
          <ExportPanel />
        </div>
      </div>

      <div
        aria-hidden={!dragging}
        className={cn(
          "pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-app/80 transition-opacity",
          dragging ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-accent px-12 py-10 text-accent">
          <Upload className="size-8" />
          <span className="text-sm font-medium">Drop the template PNG</span>
        </div>
      </div>

      <Dialog.Root open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-panel p-4 shadow-2xl outline-none">
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-sm font-semibold">Keyboard shortcuts</Dialog.Title>
              <Dialog.Close aria-label="Close" className="rounded p-1 text-muted hover:bg-raised hover:text-ink">
                <X className="size-4" />
              </Dialog.Close>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {SHORTCUTS.map(([keys, what]) => (
                <div key={keys} className="contents">
                  <dt>
                    <Kbd>{keys}</Kbd>
                  </dt>
                  <dd className="text-muted">{what}</dd>
                </div>
              ))}
            </dl>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <Toaster />
    </Tooltip.Provider>
  );
}
