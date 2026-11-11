# ==============================================================
# ===================== TILE RENDERER ==========================
# ==============================================================
# Draws the board grid using `_draw()` with real sprites.
# Ported from Renderer.js (render() method).
#
# Draw order (bottom to top), matching the original JS:
#   0. Base / Mountain
#   1. Hazard
#   2. Obstacle (spikes have 3 states)
#   3. Hazard count number
#   4. Cover (hide)
#   4.5 Cover markers (treasure, river_hide, etc. when Horizon)
#   5. Damage ratio (toxic)
#   6. Flag / Marked / Jump flag
#   6.5 Memory markers
#   7. Start tile
#   7.5 Pals (deathpal if dead)
#   7.6 Flaggoal
#   8. Player character (handled by Game.gd with Sprite2D)
#   9. Smoke
#   Delirium: full-screen dark overlay.

extends Node2D

const TILE_SIZE: int = 90
const BIOME_PATH := "res://assets/sprites/tiles/%s/"
const GLOBAL_PATH := "res://assets/sprites/tiles/"

var board: Array = []
var player = null
var zone: String = "backyard"

# Sprite cache: name -> Texture2D
var _images: Dictionary = {}


# ======================= INIT =======================

# Loads all sprites. Call once after the game starts.
func init_renderer(current_zone: String) -> void:
	zone = current_zone
	_load_images()


func set_board(new_board: Array) -> void:
	board = new_board
	queue_redraw()


func set_player(p) -> void:
	player = p


# ======================= SPRITE LOADING =======================

func _load_images() -> void:
	_images.clear()

	var biome_textures: Array = [
		"tile", "mountain1", "mountain2", "mountain3", "mountain4",
		"hide", "natural", "pit", "pit_hide", "safepit",
		"river", "river_hide"
	]

	var global_textures: Array = [
		"start", "mine", "pipe", "nest", "nest_marked", "nest_jumpmarked", "nest_open",
		"radioactive", "cactus", "flagged", "flaggoal", "jumpflag", "markedjumpflag",
		"marked", "memory_a", "memory_b", "memory_c", "treasure", "toxic", "smoke",
		"spikes_off", "spikes_prepared", "spikes_on", "spikes_hide",
		"1", "2", "3", "4", "5", "6", "7", "8", "9", "question"
	]

	for name in biome_textures:
		var path: String = BIOME_PATH % zone + name + ".png"
		if ResourceLoader.exists(path):
			_images[name] = load(path)

	for name in global_textures:
		var path: String = GLOBAL_PATH + name + ".png"
		if ResourceLoader.exists(path):
			_images[name] = load(path)


# ======================= MAIN DRAW =======================

func _draw() -> void:
	if board.is_empty():
		return
	if player == null:
		push_warning("[TileRenderer] player is null, skipping draw")
		return

	var board_size: int = board.size()
	var half: float = (board_size * TILE_SIZE) / 2.0

	for x in range(board_size):
		for y in range(board_size):
			var tile = board[x][y]
			var draw_x: float = x * TILE_SIZE - half
			var draw_y: float = y * TILE_SIZE - half
			var height: int = tile.get_tileheight()

			var mountain_offset: Vector2 = _get_mountain_offset(height)
			var obj_offset: Vector2 = _get_object_offset(height)
			var obj_size: float = _get_object_size(height)

			# Layer 0: base / mountain
			if height == 0:
				_draw_sprite("tile", draw_x, draw_y, TILE_SIZE)
			else:
				_draw_sprite(
					"mountain" + str(height),
					draw_x - mountain_offset.x,
					draw_y - mountain_offset.y,
					TILE_SIZE + mountain_offset.x
				)

			# Layer 1: hazard
			var hazard: String = tile.get_hazardtype()
			if hazard != "none" and not tile.is_hide():
				_draw_sprite(hazard, draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)

			# Layer 2: obstacle
			var obstacle: String = tile.get_obstacletype()
			if obstacle != "none" and not tile.is_hide():
				if obstacle == "spikes":
					var spike_state: String = tile.get_spike_state()
					var sprite_name: String = "spikes_off"
					if spike_state == "prepared":
						sprite_name = "spikes_prepared"
					elif spike_state == "on":
						sprite_name = "spikes_on"
					_draw_sprite(sprite_name, draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)
				else:
					_draw_sprite(obstacle, draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)

			# Layer 3: hazard count
			var count: int = tile.get_hazardcount()
			if count > 0 and not tile.is_hide() and obstacle == "none" and hazard == "none":
				var has_delirium: bool = player.has_keychain("delirium")
				var texture_name: String = str(count)
				if has_delirium:
					texture_name = "question"
				_draw_sprite(texture_name, draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)

			# Layer 4: cover
			if tile.is_hide():
				if height == 0:
					_draw_sprite("hide", draw_x, draw_y, TILE_SIZE)
				else:
					_draw_sprite("hide", draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)

			# Layer 4.5: cover markers (treasure + horizon)
			if tile.have_treasure():
				_draw_sprite("treasure", draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)

			if tile.is_hide() and player.has_keychain("horizon"):
				if obstacle == "river":
					_draw_sprite("river_hide", draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)
				if obstacle == "spikes":
					_draw_sprite("spikes_hide", draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)
				if obstacle == "pit":
					_draw_sprite("pit_hide", draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)

			# Layer 5: damage ratio (toxic)
			if tile.get_damageratio():
				_draw_sprite("toxic", draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)

			# Layer 6: flag / marked / jump flag
			_draw_flag_layer(tile, draw_x, draw_y, obj_offset, obj_size)

			# Layer 6.5: memory markers
			if tile.has_memory_marker():
				var marker: String = tile.get_memory_marker()
				var marker_height: float = obj_size * 1.1
				_draw_sprite(
					"memory_" + marker,
					draw_x - obj_offset.x,
					draw_y - obj_offset.y - (marker_height - obj_size),
					obj_size
				)

			# Layer 7: start tile
			if tile.is_start():
				_draw_sprite("start", draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)

			# Layer 7.5: pals
			var pal_type: String = tile.get_pal_type()
			var pal_alive: bool = tile.is_pal_alive()
			if pal_type != "none" and not tile.is_smoke():
				var should_draw: bool = (pal_type != "joni") or (pal_type == "joni" and not tile.is_hide())
				if should_draw:
					var goal_height: float = obj_size * 1.3
					var sprite_name: String = pal_type
					if not pal_alive:
						sprite_name = "deathpal"
					_draw_sprite(
						sprite_name,
						draw_x - obj_offset.x,
						draw_y - obj_offset.y - (goal_height - obj_size),
						obj_size
					)

			# Layer 7.6: flag goal
			if tile.is_flaggoal():
				_draw_sprite("flaggoal", draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)

			# Layer 9: smoke
			if tile.is_smoke():
				_draw_sprite("smoke", draw_x - obj_offset.x, draw_y - obj_offset.y, obj_size)

	# Delirium overlay (full board dark)
	if player.has_keychain("delirium"):
		var total_size: float = board_size * TILE_SIZE
		draw_rect(Rect2(Vector2(-half, -half), Vector2(total_size, total_size)), Color(0, 0, 0, 0.25))


# ======================= FLAG LAYER =======================

func _draw_flag_layer(tile, draw_x: float, draw_y: float, obj_offset: Vector2, obj_size: float) -> void:
	var has_delirium: bool = player.has_keychain("delirium")
	var is_marked: bool = tile.is_marked()
	var is_flagged: bool = tile.is_flagged()
	var is_jumpflagged: bool = tile.is_jumpflagged()
	var is_smoke: bool = tile.is_smoke()
	var is_marked_jump_flag: bool = is_jumpflagged and is_marked
	var hazard_type: String = tile.get_hazardtype()
	var should_show_as_flagged: bool = has_delirium and is_marked

	if is_marked_jump_flag and hazard_type == "nest" and not is_smoke:
		var flag_height: float = obj_size * 1.3
		var tex: String = "flagged" if should_show_as_flagged else "nest_jumpmarked"
		_draw_sprite(tex, draw_x - obj_offset.x, draw_y - obj_offset.y - (flag_height - obj_size), obj_size)
	elif is_marked_jump_flag and not is_smoke:
		var flag_height: float = obj_size * 1.3
		var tex: String = "flagged" if should_show_as_flagged else "markedjumpflag"
		_draw_sprite(tex, draw_x - obj_offset.x, draw_y - obj_offset.y - (flag_height - obj_size), obj_size)
	elif is_marked and hazard_type == "nest" and not is_smoke:
		var flag_height: float = obj_size * 1.3
		var tex: String = "flagged" if should_show_as_flagged else "nest_marked"
		_draw_sprite(tex, draw_x - obj_offset.x, draw_y - obj_offset.y - (flag_height - obj_size), obj_size)
	elif is_marked and not is_smoke:
		var flag_height: float = obj_size * 1.3
		var tex: String = "flagged" if should_show_as_flagged else "marked"
		_draw_sprite(tex, draw_x - obj_offset.x, draw_y - obj_offset.y - (flag_height - obj_size), obj_size)
	elif is_flagged and not is_smoke:
		var flag_height: float = obj_size * 1.3
		_draw_sprite("flagged", draw_x - obj_offset.x, draw_y - obj_offset.y - (flag_height - obj_size), obj_size)
	elif is_jumpflagged and not is_smoke:
		var flag_height: float = obj_size * 1.3
		_draw_sprite("jumpflag", draw_x - obj_offset.x, draw_y - obj_offset.y - (flag_height - obj_size), obj_size)


# ======================= OFFSET HELPERS =======================

func _get_mountain_offset(height: int) -> Vector2:
	if height == 0:
		return Vector2.ZERO
	var scale_map: Dictionary = {1: 1.15, 2: 1.35, 3: 1.55, 4: 1.75}
	var scale: float = scale_map.get(height, 1.0)
	var size: float = TILE_SIZE * scale
	return Vector2(size - TILE_SIZE, size - TILE_SIZE)


func _get_object_size(height: int) -> float:
	if height == 0:
		return TILE_SIZE
	var scale_map: Dictionary = {1: 1.1, 2: 1.18, 3: 1.28, 4: 1.38}
	return TILE_SIZE * scale_map.get(height, 1.0)


func _get_object_offset(height: int) -> Vector2:
	if height == 0:
		return Vector2.ZERO
	var push_x: Dictionary = {1: 0.15, 2: 0.30, 3: 0.50, 4: 0.68}
	var push_y: Dictionary = {1: 0.13, 2: 0.31, 3: 0.51, 4: 0.70}
	return Vector2(
		TILE_SIZE * push_x.get(height, 0.0),
		TILE_SIZE * push_y.get(height, 0.0)
	)


# ======================= DRAW HELPERS =======================

func _draw_sprite(name: String, x: float, y: float, size: float) -> void:
	var tex: Texture2D = _images.get(name, null)
	if tex == null:
		return
	draw_texture_rect(tex, Rect2(x, y, size, size), false)


# ======================= TILE-TO-WORLD =======================

func tile_to_world(tile_pos: Vector2i) -> Vector2:
	var board_size: int = board.size()
	var half: float = (board_size * TILE_SIZE) / 2.0
	return Vector2(
		tile_pos.x * TILE_SIZE - half + TILE_SIZE / 2.0,
		tile_pos.y * TILE_SIZE - half + TILE_SIZE / 2.0
	)
