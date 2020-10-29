# Godot Autotiler

An autotile tileset generator with Godot export support.

Generates a 42-tile autotile tileset from any 15-tile based tileset, including a
resource with configured collisions and bitmask ready to be used in Godot.

![](img/preview.png)
 
## Features

- Automatic tileset generator from Wang to Blob and vice-versa
- Exports to Godot with configured collisions and bitmask
- Supports any tile size (multiples of 8)

## Planned features
- DONE - Auto-detect tile size when changing image.
- Drag and drop input image.
- DONE - Generate output in same page.
- DONE - Export to Godot (Collisions and Bitmap).
- Zoom change.
- Preview Mode layers:
    - Grid
    - Grid split
    - Transparency
    - Collisions
    - Bitmask
- Edit Mode:
    - Edit collisions and bitmasks on the canvas (rects and triangles).
    - Edit Godot icon.
- DONE - App exports for MacOS, Windows and Linux (Debian).
- Examples for 24-px and 32-px tiles.
- Support for Wang autotiles (reverse Blob to Wang)

## Unsupported

Not yet supported or not tested:

- Isometric tiles
- Non top-down tilesets
- Exporting to other game engines (Unity, Game Maker Studio)