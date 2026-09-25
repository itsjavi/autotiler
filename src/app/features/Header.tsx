import { BookOpen, ChevronDown, FolderOpen, Keyboard } from "lucide-react";

import { Button, DropdownMenu, IconButton } from "../components/ui.tsx";
import { platform } from "../platform/index.ts";
import { EXAMPLES, openExample, openFile, saveGuide } from "./actions.ts";

const GUIDE_SIZES = [8, 16, 24, 32] as const;

export function Header({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
      <img src="./favicon.png" alt="" className="size-5 [image-rendering:pixelated]" />
      <span className="text-sm font-semibold tracking-tight">Autotiler</span>
      <span className="rounded bg-raised px-1.5 py-px text-[10px] font-medium text-muted">v2</span>
      <nav className="ml-3 flex items-center gap-1" aria-label="File">
        <Button size="sm" onClick={() => void openFile()}>
          <FolderOpen className="size-3.5" /> Open…
        </Button>
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
          label="Blank templates"
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
