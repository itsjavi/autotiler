# Changelog

## 2.0.1 (unreleased)

- New **examples**: meadow, pond, side-view grassy ground, cobblestone and lava at 16 px, with 24 and 32 px versions
  and an RPG Maker A2 meadow, shown as thumbnails when no template is open. v1's beveled block is still there.

## 2.0.0 (2026-09-26)

A rewrite from scratch: a TypeScript engine with tests, a new UI, a small native desktop app and a web version.

### Added

- **Godot 4** export (#5): a TileSet with a terrain set, the peering bits of all 47 tiles and full-tile
  collisions. It's verified by painting every terrain combination in headless Godot 4.7. An option forces nearest
  filtering without touching the project settings.
- **Native Apple Silicon** support (#7): one universal macOS app for Apple Silicon and Intel. It's about 4 MB,
  down from Electron's 100+ MB.
- **RPG Maker A2** templates as input, and conversion between the 13-tile and A2 templates.
- **Layouts:** Godot 3×3 minimal (12×4), GameMaker 47 (8×6) and a 16-tile **dual grid** for the TileMapDual
  addon, next to v1's 11×5.
- **Exports:** Tiled tilesets with a Wang set, and a PNG with an optional JSON map of every tile's neighbours.
- A **test map** to paint with the tileset, fill randomly or fill with every combination.
- Overlays for the grid, quarters, peering bits and collisions, plus a tile inspector that also works from the
  keyboard.
- Drag and drop, pasting from and copying to the clipboard, blank colour-coded templates, keyboard shortcuts and
  warnings for template problems (such as empty pieces).
- **Live updates:** export straight into a folder, re-read the template when it changes and optionally re-export.
  When the folder is inside a Godot project, the app shows its `res://` path.
- Recent files and reopening the last file (desktop).
- A **web version** that needs no install. Chrome and Edge also get folder export and live updates.

### Changed

- The default layout is now Godot's 3×3 minimal (12×4), the one in the Godot docs and most tutorials. Pick
  **Autotiler v1 (11×5)** to replace tilesets exported with v1.
- The tile size can be anything from 2 px (v1 needed multiples of 8), and it's detected from both dimensions.
- Godot 3 export is kept as _legacy_.
- The desktop app is built with Tauri 2 instead of Electron 9 and runs on macOS 13 or later, Windows 10 or later
  and Linux.

### Fixed

- Transparent inner corners were filled in: the fill tile showed through their transparent pixels.
- Colours shifted in PNGs with colour-space chunks (`gAMA`, `cHRM`, `iCCP`), because v1 let the browser
  colour-manage the pixels. v2 copies pixels exactly.
- Tiles in 1-tile-wide strips used some quarters from the wrong template tiles, which showed as notches at small
  sizes (visible in v1's own 8 px example).
- The Godot 3 tile with all eight neighbours had no collision shape.
- Godot exports only worked when saved in the project root (hard-coded `res://` paths). Exports now work in any
  folder.

With the Autotiler v1 layout, v2 puts every pixel where v1 did, except where v1 was wrong (above).

## 1.2.0 (2020-10-30)

- Fixed paths on Windows; crash reporting.
- After the release: a fix for out-of-bounds Godot autotile bitmasks (#4) and Electron 9.4.

## 1.1.0 (2020-10-30)

- Godot 3 export (a folder with the PNG, `.png.import` and `.tres`) and fixes for other tile sizes.

## 1.0.1 (2020-08-07)

- First public release: 47-tile blob tilesets from the 13-tile template.
