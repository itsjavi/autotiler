// Godot 3 (legacy) TileSet: one autotile in "3x3 minimal" bitmask mode with full-square collisions, plus a
// .png.import with nearest filtering. Generated (not string-templated like v1); tile id 1 as in v1, so tilemaps
// painted with a v1 export keep working. Unlike v1, every tile — including the all-neighbours one — gets a collision.
import { godot3Bitmask } from "../blob/godot.ts";
import type { Tileset } from "../generate.ts";
import { encodePng } from "../image/png.ts";
import { sanitizeName } from "./common.ts";
import type { ExportFile } from "./types.ts";

export interface Godot3Options {
  readonly name: string;
  readonly collision: boolean;
}

const TILE = "1/";

export function godot3Tres(tileset: Tileset, o: Godot3Options): string {
  if (tileset.layout.kind !== "blob") throw new Error("Godot 3 export needs a 47-tile blob layout");
  const name = sanitizeName(o.name);
  const ts = tileset.tileSize;
  const { columns, rows } = tileset.layout;
  const cells = tileset.cells.toSorted((a, b) => a.x - b.x || a.y - b.y); // v1 listed tiles column by column
  const shaped = o.collision ? cells : [];
  const isolated = cells.find((c) => c.mask === 0) ?? cells[0];

  const L: string[] = [];
  L.push(`[gd_resource type="TileSet" load_steps=${shaped.length + 2} format=2]`, "");
  L.push(`[ext_resource path=${JSON.stringify(`${name}.png`)} type="Texture" id=1]`, "");
  shaped.forEach((_, i) => {
    L.push(`[sub_resource type="ConvexPolygonShape2D" id=${i + 1}]`);
    L.push(`points = PoolVector2Array( 0, 0, ${ts}, 0, ${ts}, ${ts}, 0, ${ts} )`, "");
  });
  L.push("[resource]");
  L.push(`${TILE}name = ${JSON.stringify(name)}`);
  L.push(`${TILE}texture = ExtResource( 1 )`);
  L.push(`${TILE}tex_offset = Vector2( 0, 0 )`);
  L.push(`${TILE}modulate = Color( 1, 1, 1, 1 )`);
  L.push(`${TILE}region = Rect2( 0, 0, ${columns * ts}, ${rows * ts} )`);
  L.push(`${TILE}tile_mode = 1`);
  L.push(`${TILE}autotile/bitmask_mode = 1`);
  L.push(
    `${TILE}autotile/bitmask_flags = [ ` +
      cells.map((c) => `Vector2( ${c.x}, ${c.y} ), ${godot3Bitmask(c.mask ?? 0)}`).join(", ") +
      " ]",
  );
  L.push(`${TILE}autotile/icon_coordinate = Vector2( ${isolated.x}, ${isolated.y} )`);
  L.push(`${TILE}autotile/tile_size = Vector2( ${ts}, ${ts} )`);
  L.push(`${TILE}autotile/spacing = 0`);
  L.push(`${TILE}autotile/occluder_map = [  ]`);
  L.push(`${TILE}autotile/navpoly_map = [  ]`);
  L.push(`${TILE}autotile/priority_map = [  ]`);
  L.push(`${TILE}autotile/z_index_map = [  ]`);
  L.push(`${TILE}occluder_offset = Vector2( 0, 0 )`);
  L.push(`${TILE}navigation_offset = Vector2( 0, 0 )`);
  L.push(`${TILE}shape_offset = Vector2( 0, 0 )`);
  L.push(`${TILE}shape_transform = Transform2D( 1, 0, 0, 1, 0, 0 )`);
  if (shaped.length) L.push(`${TILE}shape = SubResource( 1 )`);
  L.push(`${TILE}shape_one_way = false`);
  L.push(`${TILE}shape_one_way_margin = 1.0`);
  const shapes = shaped.map(
    (c, i) =>
      `{\n"autotile_coord": Vector2( ${c.x}, ${c.y} ),\n"one_way": false,\n"one_way_margin": 1.0,\n"shape": SubResource( ${i + 1} ),\n"shape_transform": Transform2D( 1, 0, 0, 1, 0, 0 )\n}`,
  );
  L.push(`${TILE}shapes = [ ${shapes.join(", ")} ]`);
  L.push(`${TILE}z_index = 0`, "");
  return L.join("\n");
}

/** Import settings for crisp pixel art (Godot 3 filters textures by default). Godot rewrites the paths on import. */
export function godot3Import(name: string): string {
  const file = `${sanitizeName(name)}.png`;
  return [
    "[remap]",
    "",
    'importer="texture"',
    'type="StreamTexture"',
    `path="res://.import/${file}-.stex"`,
    "metadata={",
    '"vram_texture": false',
    "}",
    "",
    "[deps]",
    "",
    `source_file="res://${file}"`,
    `dest_files=[ "res://.import/${file}-.stex" ]`,
    "",
    "[params]",
    "",
    "compress/mode=0",
    "compress/lossy_quality=0.7",
    "compress/hdr_mode=0",
    "compress/bptc_ldr=0",
    "compress/normal_map=0",
    "flags/repeat=0",
    "flags/filter=false",
    "flags/mipmaps=false",
    "flags/anisotropic=false",
    "flags/srgb=2",
    "process/fix_alpha_border=true",
    "process/premult_alpha=false",
    "process/HDR_as_SRGB=false",
    "process/invert_color=false",
    "stream=false",
    "size_limit=0",
    "detect_3d=true",
    "svg/scale=1.0",
    "",
  ].join("\n");
}

export function exportGodot3(tileset: Tileset, o: Godot3Options): ExportFile[] {
  const name = sanitizeName(o.name);
  return [
    { path: `${name}.png`, data: encodePng(tileset.image) },
    { path: `${name}.png.import`, data: godot3Import(name) },
    { path: `${name}.tres`, data: godot3Tres(tileset, o) },
  ];
}
