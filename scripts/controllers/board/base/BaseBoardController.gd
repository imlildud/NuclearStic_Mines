# ==============================================================
# =================== BASE BOARD CONTROLLER ====================
# ==============================================================
# Abstract base class for all board controllers.
# Provides common methods for board generation, hazard placement,
# vision system, and hazard regeneration.
# Child classes should override generation-specific methods.

class_name BaseBoardController
extends RefCounted

# ======================= CONSTRUCTOR =======================

var player = null                # Reference to player character (CharacterModel)
var game_manager = null          # Reference to GameManager

# Flag to indicate if this controller uses procedural generation
var is_procedural: bool = true

# ======================= SEED SYSTEM =======================
var seed_value = null
var _seed_state: int = 0
var _has_seed: bool = false


# ======================= SEED METHODS =======================
# Set seed for deterministic generation.
func set_seed(s: int) -> void:
	seed_value = s
	_seed_state = s
	_has_seed = true
	print("[BaseBoardController] Seed set to: %s" % s)


# Seeded pseudo-random generator (linear congruential).
func _seeded_rand() -> float:
	_seed_state = (_seed_state * 9301 + 49297) % 233280
	return float(_seed_state) / 233280.0


# Get random number between 0 and 1 (uses seed if available).
func random() -> float:
	if _has_seed:
		return _seeded_rand()
	return randf()


# Generate random integer between min and max (inclusive).
func rand_int(min_v: int, max_v: int) -> int:
	return floori(random() * float(max_v - min_v + 1)) + min_v


# ======================= ABSTRACT METHODS =======================
func generate_board(_board_size: int) -> Array:
	push_error("generateBoard() must be implemented by child class")
	return []

func generate_start_and_pal(board: Array, _num_pals: int, _level: int) -> Array:
	push_error("generateStartAndPal() must be implemented by child class")
	return board

func set_safe_tiles(board: Array, _size: int) -> Array:
	push_error("setSafeTiles() must be implemented by child class")
	return board

func generate_heights(board: Array, _level: int, _size: int) -> Array:
	return board  # Default: no heights

func generate_obstacles(board: Array, _level: int, _size: int) -> Array:
	return board  # Default: no obstacles

func generate_hazards(board: Array, _total_hazards: int, _level: int, _size: int) -> Array:
	return board  # Default: no hazards

func track_hazard_count(board: Array, _size: int) -> Array:
	return board  # Default: no counting


# ======================= COMMON UTILITY =======================
# Create empty board with TileModel instances.
func create_empty_board(board_size: int) -> Array:
	var board: Array = []
	for _i in range(board_size):
		var row: Array = []
		for _j in range(board_size):
			row.append(TileModel.new())
		board.append(row)
	return board

# Apply radius with height check (does NOT affect higher tiles).
# Calls `method` with `true` on every tile whose height <= source height.
func apply_radius_with_height_check(tile, board: Array, x: int, y: int, method_name: String) -> void:
	var board_size: int = board.size()
	var source_height: int = tile.get_tileheight()

	var directions := [
		[-1, 0], [1, 0], [0, -1], [0, 1],
		[-1, 1], [-1, -1], [1, 1], [1, -1], [0, 0]
	]

	for d in directions:
		var nx: int = x + d[0]
		var ny: int = y + d[1]
		if nx >= 0 and nx < board_size and ny >= 0 and ny < board_size:
			var target_tile = board[nx][ny]
			if target_tile.get_tileheight() <= source_height:
				target_tile.call(method_name, true)


# ======================= HAZARD REGENERATION (Common) =======================
# Regenerate hazards after player actions (flagging, etc.)
func regenerate_hazards(board: Array, _total_hazards: int, level: int, size: int) -> Array:
	var board_size: int = size
	var has_concentration: bool = player.has_keychain("concentration")
	reset_hazard_count(board)
	var remaining_hazards: int = 0
	var failed_flags: int = 0
	var failed_jump_flags: int = 0

	for i in range(board_size):
		for j in range(board_size):
			var tile = board[i][j]

			if tile.get_hazardtype() != "none":
				# ===== NORMAL FLAG → MARKED =====
				if tile.is_flagged() or tile.is_jumpflagged():
					tile.set_marked(true)
					tile.set_flagged(false)
					if has_concentration:
						reveal_concentration(board, i, j, board_size)
					continue

				# ===== SCOUT: JUMP FLAG MARKED =====
				if tile.is_jumpflagged() and tile.is_marked():
					continue

				if tile.is_marked():
					continue

				tile.set_hazardtype("none")
				remaining_hazards += 1

			if tile.is_flagged() and tile.get_hazardtype() == "none":
				tile.set_flagged(false)
				failed_flags += 1

			if tile.is_jumpflagged() and tile.get_hazardtype() == "none" and not tile.is_marked():
				failed_jump_flags += 1

	player.increment_failed_flags(failed_flags)
	player.increment_jump_failed_flags(failed_jump_flags)

	return generate_hazards(board, remaining_hazards, level, size)


# Reset hazard counts and radius flags.
func reset_hazard_count(board: Array) -> Array:
	var board_size: int = board.size()
	for i in range(board_size):
		for j in range(board_size):
			var tile = board[i][j]
			tile.set_hazardcount(0)
			tile.set_damageratio(false)
			tile.set_smoke(false)
			tile.set_detectionratio(false)
			if tile.is_hazardlive():
				tile.set_hazardlive(false)
	return board


# ======================= VISION SYSTEM (Common) =======================

# Update tile visibility based on character position.
func update_vision(board: Array, character) -> void:
	var board_size: int = board.size()
	var vision_x: int = character.get_pos_x()
	var vision_y: int = character.get_pos_y()
	var vision_range: int = character.get_vision()

	# Hide all non-secure tiles first
	for i in range(board_size):
		for j in range(board_size):
			var tile = board[i][j]
			if tile.get_pal_type() == "joni":
				tile.set_hide(true)
			elif not tile.is_start() and tile.get_pal_type() == "none" and not tile.is_secure() and not tile.is_unhideable():
				tile.set_hide(true)

	# Reveal player's current tile
	board[vision_x][vision_y].set_hide(false)

	var min_x: int = maxi(0, vision_x - vision_range)
	var max_x: int = mini(board_size - 1, vision_x + vision_range)
	var min_y: int = maxi(0, vision_y - vision_range)
	var max_y: int = mini(board_size - 1, vision_y + vision_range)

	var directions := [[-1, 0], [1, 0], [0, -1], [0, 1]]
	var visible: Array = []
	for _i in range(board_size):
		var row: Array = []
		row.resize(board_size)
		row.fill(false)
		visible.append(row)
	visible[vision_x][vision_y] = true

	# Reveal in cardinal directions
	for d in directions:
		if board[vision_x][vision_y].get_hazardcount() > 0:
			break

		var x: int = vision_x
		var y: int = vision_y

		while true:
			x += d[0]
			y += d[1]

			if x < min_x or x > max_x or y < min_y or y > max_y:
				break

			var tile = board[x][y]
			if tile.get_hazardtype() != "none":
				break

			tile.set_hide(false)
			visible[x][y] = true

			if tile.get_hazardcount() > 0:
				break

	# Reveal diagonal tiles
	var diagonals := [[-1, -1], [-1, 1], [1, -1], [1, 1]]

	for d in diagonals:
		var dx1: int = vision_x + d[0]
		var dy1: int = vision_y + d[1]
		if dx1 < min_x or dx1 > max_x or dy1 < min_y or dy1 > max_y:
			continue

		var cx1: int = vision_x + d[0]
		var cy1: int = vision_y
		var cx2: int = vision_x
		var cy2: int = vision_y + d[1]

		var can_see: bool = true

		if cx1 >= min_x and cx1 <= max_x and cy1 >= min_y and cy1 <= max_y:
			var tile1 = board[cx1][cy1]
			if not visible[cx1][cy1] or tile1.get_hazardcount() > 0:
				can_see = false
			if tile1.get_hazardtype() != "none":
				can_see = false
			if tile1.get_obstacletype() != "none":
				can_see = false
			if tile1.get_tileheight() > board[vision_x][vision_y].get_tileheight():
				can_see = false

		if cx2 >= min_x and cx2 <= max_x and cy2 >= min_y and cy2 <= max_y:
			var tile2 = board[cx2][cy2]
			if not visible[cx2][cy2] or tile2.get_hazardcount() > 0:
				can_see = false
			if tile2.get_hazardtype() != "none":
				can_see = false
			if tile2.get_obstacletype() != "none":
				can_see = false
			if tile2.get_tileheight() > board[vision_x][vision_y].get_tileheight():
				can_see = false

		if can_see:
			board[dx1][dy1].set_hide(false)


# Alternative vision update (used after player movement).
func update_vision_around_player(board: Array, character) -> void:
	var board_size: int = board.size()
	var vision_x: int = character.get_pos_x()
	var vision_y: int = character.get_pos_y()
	var vision_range: int = character.get_vision()

	var min_x: int = maxi(0, vision_x - vision_range)
	var max_x: int = mini(board_size - 1, vision_x + vision_range)
	var min_y: int = maxi(0, vision_y - vision_range)
	var max_y: int = mini(board_size - 1, vision_y + vision_range)

	var has_vision: bool = character.has_keychain("vision")
	var has_horizon: bool = character.has_keychain("horizon")
	var has_topography: bool = character.has_keychain("topography")
	var max_height_diff: int = 2 if has_topography else 1

	# Hide all non-secure tiles in range first
	for i in range(min_x, max_x + 1):
		for j in range(min_y, max_y + 1):
			var tile = board[i][j]

			if tile.is_unhideable():
				tile.set_hide(false)
				continue

			if has_horizon and tile.get_obstacletype() == "natural":
				tile.set_hide(false)
				continue

			if not tile.is_start() and tile.get_pal_type() == "none" and not tile.is_secure():
				if not has_vision:
					tile.set_hide(true)

	var player_tile = board[vision_x][vision_y]
	var player_height: int = player_tile.get_tileheight()
	var player_hazard_count: int = player_tile.get_hazardcount()

	if player_hazard_count > 0:
		player_tile.set_hide(false)
		return

	player_tile.set_hide(false)

	# Reveal in cardinal directions with height blocking
	var directions := [[-1, 0], [1, 0], [0, -1], [0, 1]]

	for d in directions:
		var x: int = vision_x
		var y: int = vision_y
		var height_blocked: bool = false

		while true:
			x += d[0]
			y += d[1]
			if x < min_x or x > max_x or y < min_y or y > max_y:
				break

			var tile = board[x][y]

			# ===== TOPOGRAPHY: Allow seeing up to 2 levels above =====
			if tile.get_tileheight() > player_height + max_height_diff:
				height_blocked = true
				break
			if tile.get_hazardtype() != "none":
				break
			if tile.is_unhideable():
				tile.set_hide(false)
				continue
			if has_horizon and tile.get_obstacletype() == "natural":
				tile.set_hide(false)
			else:
				tile.set_hide(false)

			if tile.get_hazardcount() > 0:
				break
		if height_blocked:
			continue

	# Reveal diagonal tiles
	if vision_range >= 2:
		var diagonals := [[-1, -1], [-1, 1], [1, -1], [1, 1]]

		for d in diagonals:
			var diag_x: int = vision_x + d[0]
			var diag_y: int = vision_y + d[1]
			if diag_x < min_x or diag_x > max_x or diag_y < min_y or diag_y > max_y:
				continue

			var card1_x: int = vision_x + d[0]
			var card1_y: int = vision_y
			var card2_x: int = vision_x
			var card2_y: int = vision_y + d[1]

			var can_see: bool = true

			if card1_x >= min_x and card1_x <= max_x and card1_y >= min_y and card1_y <= max_y:
				var tile1 = board[card1_x][card1_y]
				if tile1.is_hide() or tile1.get_hazardcount() > 0 \
					or tile1.get_hazardtype() != "none" \
					or tile1.get_tileheight() > player_height + max_height_diff:
					can_see = false
			else:
				can_see = false

			if can_see and card2_x >= min_x and card2_x <= max_x and card2_y >= min_y and card2_y <= max_y:
				var tile2 = board[card2_x][card2_y]
				if tile2.is_hide() or tile2.get_hazardcount() > 0 \
					or tile2.get_hazardtype() != "none" \
					or tile2.get_tileheight() > player_height + max_height_diff:
					can_see = false
			elif can_see:
				can_see = false

			if can_see:
				var diag_tile = board[diag_x][diag_y]
				if diag_tile.get_tileheight() > player_height + max_height_diff:
					can_see = false

			if can_see:
				var diag_tile = board[diag_x][diag_y]
				if diag_tile.is_unhideable():
					diag_tile.set_hide(false)
				elif has_horizon and diag_tile.get_obstacletype() == "natural":
					diag_tile.set_hide(false)
				else:
					diag_tile.set_hide(false)


# ===== CONCENTRATION HELPER =====
# Returns the number of tiles revealed.
func reveal_concentration(board: Array, x: int, y: int, size: int) -> int:
	var directions := [
		[-1,-1], [-1,0], [-1,1],
		[0,-1],  [0,0],  [0,1],
		[1,-1],  [1,0],  [1,1]
	]

	var revealed_count: int = 0
	for d in directions:
		var nx: int = x + d[0]
		var ny: int = y + d[1]
		if nx >= 0 and nx < size and ny >= 0 and ny < size:
			var tile = board[nx][ny]
			var hazard_type: String = tile.get_hazardtype()
			if hazard_type != "none":
				print("[Concentration] Skipping (%d,%d) - has hazard: %s" % [nx, ny, hazard_type])
				continue

			tile.set_unhideable(true)
			tile.set_hide(false)
			revealed_count += 1

	return revealed_count


# ======================= GAME MANAGER SETTER =======================

func set_game_manager(gm) -> void:
	game_manager = gm
