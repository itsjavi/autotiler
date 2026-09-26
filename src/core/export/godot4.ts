// Godot 4 TileSet (text resource, format=3): one atlas source, one terrain set in MATCH_CORNERS_AND_SIDES mode with
// the 47 blob configurations as peering bits, optional full-square collisions. Verified by loading and painting
// the exported files in headless Godot 4.7.2 (tests/godot). format=3 loads in every Godot 4.x release.
//
// Invariants (breaking them loads "fine" but silently corrupts the TileSet):
// - in [resource], every physics_layer_* / terrain_set_* line comes before sources/0 (Godot applies properties in
//   file order; attaching the source first drops every polygon and peering bit)
// - per tile: terrain_set before terrain before terrains_peering_bit/*
// - unset peering bits mean "no terrain"; there is no "don't care"
// - never write "#" comments ("#" starts a colour in .tres files)
import { godot4PeeringBits } from "../blob/godot.ts";
import type { Tileset } from "../generate.ts";
import { encodePng } from "../image/png.ts";
import { num, sanitizeName } from "./common.ts";
import type { ExportFile, Rgb } from "./types.ts";

export interface Godot4Options {
  /** base file name: writes <name>.png and <name>.tres side by side */
  readonly name: string;
  readonly terrainName: string;
  readonly terrainColor: Rgb;
  /** full-square collision polygon on physics layer 0 for every tile */
  readonly collision: boolean;
  /** wrap the texture in a CanvasTexture with nearest filtering (Godot 4.2+), so pixel art stays crisp */
  readonly forceNearest: boolean;
}

const q = (s: string) => JSON.stringify(s);

export function godot4Tres(tileset: Tileset, o: Godot4Options): string {
  if (tileset.layout.kind !== "blob") throw new Error("Godot 4 export needs a 47-tile blob layout");
  const name = sanitizeName(o.name);
  const ts = tileset.tileSize;
  const h = num(ts / 2);
  const mh = num(-ts / 2);
  const L: string[] = [];

  L.push('[gd_resource type="TileSet" format=3]', "");
  // relative to the .tres, so the pair can live anywhere inside a Godot project
  L.push(`[ext_resource type="Texture2D" path=${q(`${name}.png`)} id="1_texture"]`, "");
  if (o.forceNearest) {
    L.push('[sub_resource type="CanvasTexture" id="CanvasTexture_nearest"]');
    L.push('diffuse_texture = ExtResource("1_texture")', "texture_filter = 1", "");
  }
  L.push('[sub_resource type="TileSetAtlasSource" id="TileSetAtlasSource_terrain"]');
  L.push(o.forceNearest ? 'texture = SubResource("CanvasTexture_nearest")' : 'texture = ExtResource("1_texture")');
  L.push(`texture_region_size = Vector2i(${ts}, ${ts})`);

  const cells = tileset.cells.toSorted((a, b) => a.y - b.y || a.x - b.x);
  for (const cell of cells) {
    const id = `${cell.x}:${cell.y}/0`;
    L.push(`${id} = 0`, `${id}/terrain_set = 0`, `${id}/terrain = 0`);
    if (o.collision) {
      L.push(
        `${id}/physics_layer_0/polygon_0/points = PackedVector2Array(${mh}, ${mh}, ${h}, ${mh}, ${h}, ${h}, ${mh}, ${h})`,
      );
    }
    for (const bit of godot4PeeringBits(cell.mask ?? 0)) L.push(`${id}/terrains_peering_bit/${bit} = 0`);
  }

  const [r, g, b] = o.terrainColor;
  L.push("", "[resource]", `tile_size = Vector2i(${ts}, ${ts})`);
  if (o.collision) L.push("physics_layer_0/collision_layer = 1");
  L.push("terrain_set_0/mode = 0");
  L.push(`terrain_set_0/terrain_0/name = ${q(o.terrainName || name)}`);
  L.push(`terrain_set_0/terrain_0/color = Color(${num(r / 255)}, ${num(g / 255)}, ${num(b / 255)}, 1)`);
  L.push('sources/0 = SubResource("TileSetAtlasSource_terrain")', "");
  return L.join("\n");
}

export function exportGodot4(tileset: Tileset, o: Godot4Options): ExportFile[] {
  const name = sanitizeName(o.name);
  return [
    { path: `${name}.png`, data: encodePng(tileset.image) },
    { path: `${name}.tres`, data: godot4Tres(tileset, o) },
  ];
}
