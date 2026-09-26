# Loads an exported TileSet, paints a mask with terrain auto-connect and dumps what Godot chose.
# godot --headless --path . --script res://validate.gd -- <tileset.tres> <mask.txt> <out.json>
extends SceneTree

func _init() -> void:
	var args := OS.get_cmdline_user_args()
	var tres_path: String = args[0]
	var mask_path: String = args[1]
	var out_path: String = args[2]

	var ts: TileSet = load(tres_path)
	if ts == null:
		push_error("could not load " + tres_path)
		quit(2)
		return
	var src := ts.get_source(ts.get_source_id(0)) as TileSetAtlasSource
	var info := {
		"tile_size": [ts.tile_size.x, ts.tile_size.y],
		"sources": ts.get_source_count(),
		"terrain_sets": ts.get_terrain_sets_count(),
		"terrain_mode": ts.get_terrain_set_mode(0),
		"terrain_name": ts.get_terrain_name(0, 0),
		"physics_layers": ts.get_physics_layers_count(),
		"texture": src.texture.resource_path if src.texture else "",
		"texture_size": [src.texture.get_width(), src.texture.get_height()] if src.texture else [],
		"region_size": [src.texture_region_size.x, src.texture_region_size.y],
		"tiles": src.get_tiles_count(),
	}
	# collision polygon of the first tile, to check the coordinate convention survived the round trip
	var first := src.get_tile_id(0)
	var td := src.get_tile_data(first, 0)
	info["first_tile"] = [first.x, first.y]
	info["first_tile_polygons"] = td.get_collision_polygons_count(0) if ts.get_physics_layers_count() > 0 else 0
	if ts.get_physics_layers_count() > 0 and td.get_collision_polygons_count(0) > 0:
		info["first_tile_polygon"] = Array(td.get_collision_polygon_points(0, 0))

	var text := FileAccess.get_file_as_string(mask_path)
	var cells: Array[Vector2i] = []
	var lines := text.strip_edges().split("\n")
	for y in lines.size():
		for x in lines[y].length():
			if lines[y][x] == "#":
				cells.append(Vector2i(x, y))

	var layer := TileMapLayer.new()
	layer.tile_set = ts
	root.add_child(layer)
	layer.set_cells_terrain_connect(cells, 0, 0)

	var chosen := {}
	for c in cells:
		var ac := layer.get_cell_atlas_coords(c)
		chosen["%d,%d" % [c.x, c.y]] = [ac.x, ac.y]
	# any tiles placed outside the mask?
	var extra := []
	for c in layer.get_used_cells():
		if not cells.has(c):
			extra.append([c.x, c.y])

	var f := FileAccess.open(out_path, FileAccess.WRITE)
	f.store_string(JSON.stringify({"info": info, "chosen": chosen, "extra_cells": extra}, "  "))
	f.close()
	print("OK tiles=%d cells=%d" % [info["tiles"], cells.size()])
	quit(0)
