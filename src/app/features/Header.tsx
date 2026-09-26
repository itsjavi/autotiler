import { BookOpen, ChevronDown, FolderOpen, History, Keyboard } from "lucide-react";

import { Button, DropdownMenu, IconButton, type MenuEntry } from "../components/ui.tsx";
import { platform } from "../platform/index.ts";
import { useApp } from "../state/store.ts";
import { EXAMPLES, fileNameOf, openExample, openFile, openRecent, saveGuide } from "./actions.ts";

const GUIDE_SIZES = [8, 16, 24, 32] as const;

export function Header({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
      <img src="./favicon.png" alt="" className="size-5 [image-rendering:pixelated]" />
      <h1 className="text-sm font-semibold tracking-tight">Autotiler</h1>
      <span className="rounded bg-raised px-1.5 py-px text-[10px] font-medium text-muted">v2</span>
      <nav className="ml-3 flex items-center gap-1" aria-label="File">
        <Button size="sm" onClick={() => void openFile()}>
          <FolderOpen className="size-3.5" /> Open…
        </Button>
        <RecentMenu />
        <DropdownMenu
          label="Examples"
          trigger={
            <Button size="sm" variant="ghost">
              Examples <ChevronDown className="size-3.5" />
            </Button>
          }
          items={EXAMPLES.map((e) => ({
            kind: "item",
            key: e.file,
            label: e.label,
            hint: e.hint,
            onSelect: () => void openExample(e),
          }))}
        />
        <DropdownMenu
          label="Blank template"
          trigger={
            <Button size="sm" variant="ghost">
              Blank template <ChevronDown className="size-3.5" />
            </Button>
          }
          items={[
            { kind: "heading", key: "h13", text: "Autotiler 13-tile (5×3)" },
            ...GUIDE_SIZES.map((ts) => ({
              kind: "item" as const,
              key: `13-${ts}`,
              label: `${ts} px tiles`,
              hint: `${ts * 5}×${ts * 3} PNG, colour-coded slots`,
              onSelect: () => void saveGuide("autotiler-13", ts),
            })),
            { kind: "separator", key: "sep" },
            { kind: "heading", key: "ha2", text: "RPG Maker A2 (2×3)" },
            ...GUIDE_SIZES.map((ts) => ({
              kind: "item" as const,
              key: `a2-${ts}`,
              label: `${ts} px tiles`,
              hint: `${ts * 2}×${ts * 3} PNG, colour-coded slots`,
              onSelect: () => void saveGuide("rpgmaker-a2", ts),
            })),
          ]}
        />
      </nav>
      <div className="ml-auto flex items-center gap-0.5">
        <IconButton label="Keyboard shortcuts" onClick={onShowShortcuts}>
          <Keyboard className="size-4" />
        </IconButton>
        <IconButton
          label="Documentation and source code"
          onClick={() => platform().openUrl("https://github.com/itsjavi/autotiler")}
        >
          <BookOpen className="size-4" />
        </IconButton>
      </div>
    </header>
  );
}

function RecentMenu() {
  const recent = useApp((s) => s.recent);
  const clearRecent = useApp((s) => s.clearRecent);
  if (!platform().openPath || recent.length === 0) return null;
  const items: MenuEntry[] = [
    ...recent.map((path) => ({
      kind: "item" as const,
      key: path,
      label: fileNameOf(path),
      hint: <span className="block max-w-96 truncate">{path}</span>,
      onSelect: () => void openRecent(path),
    })),
    { kind: "separator", key: "sep" },
    { kind: "item", key: "clear", label: "Clear the list", onSelect: clearRecent },
  ];
  return (
    <DropdownMenu
      label="Open recent"
      trigger={
        <Button size="sm" variant="ghost">
          <History className="size-3.5" /> Recent <ChevronDown className="size-3.5" />
        </Button>
      }
      items={items}
    />
  );
}
