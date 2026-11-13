# ==============================================================
# ====================== FLAG MANAGER ===========================
# ==============================================================
# Handles flag placement and marking logic.
#
# FOUR MODES (selected by FlagModeManager):
# 0 - Normal: place flags on hidden tiles. Combo: revealed tiles with
#     hazard != "none" can also be flagged (Revelation combo).
# 1 - Revelation: reveal a tile (10 uses).
# 2 - Memory: place up to 3 lettered markers (a, b, c).
# 3 - Purity: clean a damage-ratio tile (9 uses).
#
# SCOUT (Ability 4) has special jump-flag behavior in Normal mode.

extends RefCounted
class_name FlagManager

var game_manager = null


func _init(gm = null) -> void:
	game_manager = gm


# ======================= MAIN DISPATCH =======================

# Handle a flag action in the given direction.
# `direction`: "Up" | "Down" | "Left" | "Right".
# Returns a Dictionary with optional `jumped`, `x`, `y` for Scout.
func handle_flag_direction(direction: String, board: Array, player, criticker) -> Dictionary:
	if board.is_empty():
		return {}

	var flag_mode: int = game_manager.get_flag_mode_manager().get_flag_mode()

	# ===== REVELATION MODE =====
	if flag_mode == 1:
		return handle_revelation(direction, board, player)

	# ===== MEMORY MODE =====
	if flag_mode == 2:
		return handle_memory(direction, board, player)

	# ===== PURITY MODE =====
	if flag_mode == 3:
		return handle_purity(direction, board, player)

	# ===== NORMAL MODE =====
	return handle_normal_flag(direction, board, player, criticker)


# ===== REVELATION: Reveal a tile (10 uses) =====
func handle_revelation(direction: String, board: Array, player) -> Dictionary:
	var px: int = player.get_pos_x()
	var py: int = player.get_pos_y()
	var target_x: int = px
	var target_y: int = py

	match direction:
		"Up":    target_y -= 1
		"Down":  target_y += 1
		"Left":  target_x -= 1
		"Right": target_x += 1

	var size: int = board.size()
	if target_x < 0 or target_x >= size or target_y < 0 or target_y >= size:
		return {}

	var tile = board[target_x][target_y]

	# Only reveal if hidden and has uses left.
	# set_unhideable(true) is required, same as Concentration: without it
	# the next update_vision()/update_vision_around_player() re-hides the
	# tile (both first hide every non-secure, non-unhideable tile).
	if tile.is_hide() and player.get_keychain_uses("revelation") > 0:
		tile.set_unhideable(true)
		tile.set_hide(false)
		player.use_keychain("revelation")

		game_manager.get_flag_mode_manager().check_depleted()
		game_manager.update_flag_ui()
		print("[Revelation] Revealed tile at %d, %d" % [target_x, target_y])

	return {}


# ===== MEMORY: Place markers (a, b, c) =====
func handle_memory(direction: String, board: Array, player) -> Dictionary:
	var px: int = player.get_pos_x()
	var py: int = player.get_pos_y()
	var target_x: int = px
	var target_y: int = py

	match direction:
		"Up":    target_y -= 1
		"Down":  target_y += 1
		"Left":  target_x -= 1
		"Right": target_x += 1

	var size: int = board.size()
	if target_x < 0 or target_x >= size or target_y < 0 or target_y >= size:
		return {}

	var tile = board[target_x][target_y]

	# Toggle: if already has a marker, remove it
	if tile.has_memory_marker():
		tile.clear_memory_marker()
		game_manager.update_flag_ui()
		print("[Memory] Removed marker at %d, %d" % [target_x, target_y])
		return {}

	# Find which markers are already used on the board
	var markers: Array = ["a", "b", "c"]
	var used_markers: Array = []

	for i in range(size):
		for j in range(size):
			var marker: String = board[i][j].get_memory_marker()
			if marker != "":
				used_markers.append(marker)

	# Find the first available marker
	var available: Array = []
	for m in markers:
		if not used_markers.has(m):
			available.append(m)

	if available.is_empty():
		print("[Memory] No markers available")
		return {}

	# Place the marker
	tile.set_memory_marker(available[0])
	game_manager.memory_markers = available.size() - 1
	game_manager.update_flag_ui()
	print("[Memory] Placed marker %s at %d, %d" % [available[0], target_x, target_y])

	return {}


# ===== PURITY: Clean a damage-ratio tile (9 uses) =====
func handle_purity(direction: String, board: Array, player) -> Dictionary:
	var px: int = player.get_pos_x()
	var py: int = player.get_pos_y()
	var target_x: int = px
	var target_y: int = py

	match direction:
		"Up":    target_y -= 1
		"Down":  target_y += 1
		"Left":  target_x -= 1
		"Right": target_x += 1

	var size: int = board.size()
	if target_x < 0 or target_x >= size or target_y < 0 or target_y >= size:
		return {}

	var tile = board[target_x][target_y]

	# Only clean if the tile has a damage ratio and has uses left
	if tile.get_damageratio() and player.get_keychain_uses("purity") > 0:
		tile.set_damageratio(false)
		player.use_keychain("purity")

		game_manager.get_flag_mode_manager().check_depleted()
		game_manager.update_flag_ui()
		print("[Purity] Cleaned damageratio at %d, %d" % [target_x, target_y])

	return {}


# ===== NORMAL FLAG =====
func handle_normal_flag(direction: String, board: Array, player, criticker) -> Dictionary:
	var px: int = player.get_pos_x()
	var py: int = player.get_pos_y()
	var ability_id: int = player.get_ability_id()

	var target_x: int = px
	var target_y: int = py
	var jump_x: int = px
	var jump_y: int = py

	match direction:
		"Up":    target_y -= 1; jump_y -= 2
		"Down":  target_y += 1; jump_y += 2
		"Left":  target_x -= 1; jump_x -= 2
		"Right": target_x += 1; jump_x += 2

	var size: int = board.size()
	if target_x < 0 or target_x >= size or target_y < 0 or target_y >= size:
		return {}

	var tile = board[target_x][target_y]

	# ===== SCOUT ABILITY (Ability 4) =====
	if ability_id == 4:
		return handle_scout_flag(player, board, tile, target_x, target_y, jump_x, jump_y)

	# ===== OTHER CHARACTERS =====
	if ability_id == 1 and tile.is_flagged():
		return {}
	# Normal rule: only hidden, unmarked tiles can be flagged.
	# Combo rule (Revelation): a revealed tile that actually has a hazard
	# (hazard != "none") can also be flagged, even though it is not hidden.
	# Revealed safe tiles (hazard == "none") still cannot be flagged.
	var tile_has_hazard: bool = tile.get_hazardtype() != "none"
	if (not tile.is_hide() and not tile_has_hazard) or tile.is_marked():
		return {}

	if tile.is_flagged():
		tile.set_flagged(false)
		player.increment_flags()
		return {}

	if player.get_flags() > 0:
		tile.set_flagged(true)
		player.decrement_flags()

		var is_chef: bool = ability_id == 1
		var is_criticized: bool = player.is_criticized()
		var has_judgment: bool = player.has_keychain("judgment")
		var has_hazard: bool = tile.get_hazardtype() != "none"

		# Judgment or Chef or Criticized: auto-mark on correct hazard
		if (is_chef or is_criticized or has_judgment) and has_hazard:
			tile.set_marked(true)
			tile.set_flagged(false)

			# Concentration logic: reveal 3x3
			var has_concentration: bool = player.has_keychain("concentration")
			if has_concentration:
				_reveal_concentration_3x3(board, target_x, target_y, size)
				print("[Concentration] Revealed 3x3 around marked hazard")

			# Progress criticker (only for normal Criticized, not Judgment)
			if is_criticized and not has_judgment and criticker != null:
				var current_progress: int = player.get_criticker_progress()
				var goal: int = player.get_criticker_goal()
				var new_progress: int = criticker.mark_progress(current_progress, goal)
				player.set_criticker_progress(new_progress)

				if new_progress >= goal:
					player.set_criticized(false)

		# Wrong flag on Judgment = damage
		if has_judgment and not has_hazard:
			if game_manager != null and game_manager.char_ctrl != null:
				game_manager.char_ctrl.hurt_character()
			tile.set_flagged(false)
			player.increment_flags()  # Return the flag

			# OBLIVION: Remove a marked hazard
			if player.has_keychain("oblivion"):
				remove_marked_hazard(board)
			return {}

		# Wrong flag on normal Criticized
		if is_criticized and not has_hazard and not has_judgment:
			player.set_criticized(false)
			if criticker != null:
				criticker.fail()

			# OBLIVION: Remove a marked hazard
			if player.has_keychain("oblivion"):
				remove_marked_hazard(board)

	return {}


# Handles Scout's jump-flag logic: place jump flags, jump over them,
# and auto-mark on hazards if Criticized/Judgment.
func handle_scout_flag(player, board: Array, tile, target_x: int, target_y: int, jump_x: int, jump_y: int) -> Dictionary:
	var size: int = board.size()
	var is_criticized: bool = player.is_criticized()
	var has_judgment: bool = player.has_keychain("judgment")
	var has_hazard: bool = tile.get_hazardtype() != "none"

	# ===== PLACE JUMP FLAG =====
	# Same Revelation combo as normal flags: revealed hazard tiles can
	# receive a jump flag even though they are not hidden anymore.
	if (tile.is_hide() or has_hazard) and not tile.is_jumpflagged():
		if player.get_flags() > 0:
			tile.set_jumpflagged(true)
			player.decrement_flags()

			# ===== CRITICIZED or JUDGMENT: Immediately mark if on hazard =====
			if (is_criticized or has_judgment) and has_hazard:
				tile.set_marked(true)
				print("[Scout] Criticized/Judgment: Jump Flag instantly marked")

				# ===== CONCENTRATION: Reveal 3x3 =====
				var has_concentration: bool = player.has_keychain("concentration")
				if has_concentration:
					_reveal_concentration_3x3(board, target_x, target_y, size)
					print("[Concentration] Revealed 3x3 around marked Jump Flag")

				# ===== PROGRESS CRITICKER (only for normal Criticized, not Judgment) =====
				if is_criticized and not has_judgment:
					var criticker = game_manager.criticker
					if criticker != null:
						var current_progress: int = player.get_criticker_progress()
						var goal: int = player.get_criticker_goal()
						var new_progress: int = criticker.mark_progress(current_progress, goal)
						player.set_criticker_progress(new_progress)

						if new_progress >= goal:
							player.set_criticized(false)
				return {}

			# ===== JUDGMENT: Wrong flag on empty tile =====
			if has_judgment and not has_hazard:
				if game_manager != null and game_manager.char_ctrl != null:
					game_manager.char_ctrl.hurt_character()
				tile.set_jumpflagged(false)
				player.increment_flags()

				# Oblivion: remove a marked hazard
				if player.has_keychain("oblivion"):
					remove_marked_hazard(board)

				print("[Scout] Judgment triggered on wrong flag")
				return {}
		return {}

	# ===== JUMP =====
	if tile.is_jumpflagged():
		if jump_x >= 0 and jump_x < size and jump_y >= 0 and jump_y < size:
			player.set_pos_x(jump_x)
			player.set_pos_y(jump_y)
			return {"jumped": true, "x": jump_x, "y": jump_y}
		else:
			print("[Scout] Jump out of bounds, blocked")
			return {"jumped": false}

	return {"jumped": false}


# ===== SCOUT: Convert Jump Flags to Marked Jump Flags =====
# Returns the number of flags converted.
func convert_jump_flags_to_marked(board: Array) -> int:
	var converted_count: int = 0

	for i in range(board.size()):
		for j in range(board.size()):
			var tile = board[i][j]
			if tile.is_jumpflagged() and tile.get_hazardtype() != "none":
				tile.set_jumpflagged(true)
				tile.set_marked(true)
				converted_count += 1

	return converted_count


# ===== OBLIVION: Remove a random marked hazard =====
func remove_marked_hazard(board: Array) -> void:
	var marked_hazards: Array = []

	# Collect all marked hazards
	for i in range(board.size()):
		for j in range(board.size()):
			var tile = board[i][j]
			if tile.is_marked() and tile.get_hazardtype() != "none":
				marked_hazards.append({"x": i, "y": j, "tile": tile})

	if marked_hazards.is_empty():
		print("[Oblivion] No marked hazards to remove")
		return

	# Pick a random marked hazard
	var random_entry = marked_hazards[randi_range(0, marked_hazards.size() - 1)]

	# Remove the mark
	random_entry["tile"].set_marked(false)

	# Also remove flag if present (cleanup)
	if random_entry["tile"].is_flagged():
		random_entry["tile"].set_flagged(false)

	print("[Oblivion] Removed mark at (%d, %d)" % [random_entry["x"], random_entry["y"]])


# ======================= INTERNAL HELPERS =======================

# Reveals the 3x3 area around the given coordinates, skipping tiles
# that have a hazard, pit, or spikes. Used by Concentration keychain.
func _reveal_concentration_3x3(board: Array, cx: int, cy: int, size: int) -> void:
	var directions: Array = [
		[-1,-1], [-1,0], [-1,1],
		[0,-1],  [0,0],  [0,1],
		[1,-1],  [1,0],  [1,1]
	]

	for d in directions:
		var nx: int = cx + d[0]
		var ny: int = cy + d[1]

		if nx >= 0 and nx < size and ny >= 0 and ny < size:
			var adjacent_tile = board[nx][ny]

			# Skip tiles with hazards (already visible)
			if adjacent_tile.get_hazardtype() != "none":
				continue

			# Skip pits and spikes (visual-only)
			var obstacle_type: String = adjacent_tile.get_obstacletype()
			if obstacle_type == "pit" or obstacle_type == "spikes":
				continue

			adjacent_tile.set_unhideable(true)
			adjacent_tile.set_hide(false)
