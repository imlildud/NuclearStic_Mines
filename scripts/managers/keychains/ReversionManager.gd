# ==============================================================
# ==================== REVERSION MANAGER =======================
# ==============================================================
# Handles save state, rewind effect, and reversion logic.

extends RefCounted
class_name ReversionManager

# ======================= STATE =======================

var game_manager = null
var is_rewinding: bool = false
var saved_state: Dictionary = {}


func _init(gm = null) -> void:
	game_manager = gm


# ======================= USES =======================

# Returns the maximum number of uses for the Reversion keychain.
func get_max_uses() -> int:
	return 3


# Returns the remaining uses for the given player.
func get_uses(player) -> int:
	return player.get_keychain_uses("reversion")


# Returns true if the player still has uses left.
func has_uses(player) -> bool:
	return get_uses(player) > 0


# ======================= SAVE STATE =======================

# Saves a complete snapshot of the player and the board.
# This is what fixes the rescued/remaining desync.
func save_state() -> void:
	var board: Array = game_manager.get_board()
	var player = game_manager.get_player()

	# --- Board snapshot: deep copy of every TileModel ---
	var board_snapshot: Array = []
	for i in range(board.size()):
		var row: Array = []
		for j in range(board.size()):
			row.append(_copy_tile(board[i][j]))
		board_snapshot.append(row)

	# --- Player snapshot ---
	var reversion_uses: int = player.get_keychain_uses("reversion")

	saved_state = {
		# Board (full deep copy)
		"board": board_snapshot,

		# Player position and stats
		"player_pos_x": player.get_pos_x(),
		"player_pos_y": player.get_pos_y(),
		"player_hp": player.get_hp(),
		"player_ap": player.get_ap(),
		"player_flags": player.get_flags(),
		"player_force": player.get_force(),
		"player_rescued": player.get_rescued(),
		"player_total_rescued": player.get_total_rescued(),
		"player_damage_taken": player.get_damage_taken(),
		"player_dead_pals": player.get_dead_pals(),
		"player_failed_flags": player.get_failed_flags(),
		"player_failed_jump_flags": player.get_failed_jump_flags(),
		"player_criticized": player.is_criticized(),
		"player_criticker_goal": player.get_criticker_goal(),
		"player_criticker_progress": player.get_criticker_progress(),
		"player_regen": player.is_regen(),
		"player_alive": player.is_alive(),
		"player_keychain_uses": player.keychain_uses.duplicate(true),

		# Mission progress (the fix)
		"remaining_pals": game_manager.char_ctrl.get_remaining_pals(),
		"total_pals": game_manager.char_ctrl.get_total_pals(),

		# Reversion uses (after spending this one)
		"reversion_uses": reversion_uses - 1
	}

	print("[Reversion] State saved - rescued: %d, remaining_pals: %d, hp: %d" % [
		player.get_rescued(), saved_state["remaining_pals"], player.get_hp()
	])


# Creates a shallow copy of a TileModel.
# TileModel only contains value types (bool, int, String, Array, Dictionary),
# so a shallow field-by-field copy is enough.
func _copy_tile(tile) -> TileModel:
	var copy := TileModel.new()
	copy.hide = tile.hide
	copy.unhideable = tile.unhideable
	copy.start = tile.start
	copy.flaggoal = tile.flaggoal
	copy.pal_alive = tile.pal_alive
	copy.pal_type = tile.pal_type
	copy.secure = tile.secure
	copy.securehidden = tile.securehidden
	copy.flagged = tile.flagged
	copy.jumpflagged = tile.jumpflagged
	copy.marked = tile.marked
	copy.treasure = tile.treasure
	copy.memory_marker = tile.memory_marker
	copy.height = tile.height
	copy.obstacletype = tile.obstacletype
	copy.spike_state = tile.spike_state
	copy.hazardcount = tile.hazardcount
	copy.smoke = tile.smoke
	copy.smoke_cleared = tile.smoke_cleared
	copy.damageratio = tile.damageratio
	copy.detectionratio = tile.detectionratio
	copy.hazardtype = tile.hazardtype
	copy.hazardlive = tile.hazardlive
	return copy


# ======================= RESTORE STATE =======================

# Restores the player, board, and mission progress from the snapshot.
# Returns true on success.
func restore_state() -> bool:
	if saved_state.is_empty():
		push_warning("[Reversion] No state to restore")
		return false

	var player = game_manager.get_player()

	# --- 1. Replace the board with the snapshot ---
	var new_board: Array = []
	for i in range(saved_state["board"].size()):
		var row: Array = []
		for j in range(saved_state["board"].size()):
			row.append(_copy_tile(saved_state["board"][i][j]))
		new_board.append(row)
	game_manager.board = new_board

	# --- 2. Restore the player ---
	player.set_pos_x(saved_state["player_pos_x"])
	player.set_pos_y(saved_state["player_pos_y"])
	player.set_hp(saved_state["player_hp"])
	player.set_ap(saved_state["player_ap"])
	player.set_flags(saved_state["player_flags"])
	player.set_force(saved_state["player_force"])
	player.set_rescued(saved_state["player_rescued"])
	player.total_rescued = saved_state["player_total_rescued"]
	player.set_damage_taken(saved_state["player_damage_taken"])
	player.set_dead_pals(saved_state["player_dead_pals"])
	player.set_failed_flags(saved_state["player_failed_flags"])
	player.set_failed_jump_flags(saved_state["player_failed_jump_flags"])
	player.set_criticized(saved_state["player_criticized"])
	player.set_criticker_goal(saved_state["player_criticker_goal"])
	player.set_criticker_progress(saved_state["player_criticker_progress"])
	player.set_regen(saved_state["player_regen"])
	player.set_alive(saved_state["player_alive"])
	player.keychain_uses = saved_state["player_keychain_uses"].duplicate(true)

	# --- 3. Restore mission progress (the fix) ---
	game_manager.char_ctrl.remaining_pals = saved_state["remaining_pals"]
	game_manager.char_ctrl.total_pals = saved_state["total_pals"]

	print("[Reversion] State restored - rescued: %d, remaining_pals: %d, hp: %d" % [
		player.get_rescued(), saved_state["remaining_pals"], player.get_hp()
	])
	return true


# ======================= ACTIVATE REVERSION =======================

# Activates Reversion: saves the current state, spends a use,
# and restores the snapshot without regenerating the board.
# Returns true if it activated.
func activate() -> bool:
	var game = game_manager
	var player = game.get_player()

	if not has_uses(player):
		print("[Reversion] No uses left")
		return false

	if is_rewinding:
		print("[Reversion] Already rewinding")
		return false

	is_rewinding = true

	# ===== TRIGGER REWIND VISUAL EFFECT =====
	if game.renderer != null:
		game.renderer.trigger_rewind()

	# ===== PLAY REWIND SOUND =====
	if AudioManager != null:
		AudioManager.play_rewind_sfx()

	# ===== 1. SAVE STATE (full snapshot) =====
	save_state()

	# ===== 2. SPEND USE =====
	player.use_keychain("reversion")

	# ===== 3. RESTORE STATE (no retryLevel! this is the fix) =====
	var ok: bool = restore_state()
	if not ok:
		is_rewinding = false
		return false

	# ===== 4. UPDATE VISION AND UI =====
	game.board_ctrl.update_vision(game.board, player)
	game.board_ctrl.update_vision_around_player(game.board, player)

	game.update_flag_ui()
	game.get_flag_mode_manager().update_swamp_button_ui()
	update_button_ui()

	is_rewinding = false
	print("[Reversion] Rewind complete")
	return true


# ======================= AUTO ACTIVATE ON DEATH =======================

# Called when the player dies: if they have Reversion with uses left,
# activates it to prevent the death.
func auto_activate_on_death() -> bool:
	var game = game_manager
	var player = game.get_player()

	if not player.has_keychain("reversion") or not has_uses(player):
		return false

	print("[Reversion] Auto-activating on death")
	return activate()


# ======================= UI BUTTON =======================

# Emits the button state. The UI scene listens and updates the icon.
func update_button_ui() -> void:
	var player = game_manager.get_player()
	if player == null:
		_emit_button_state("disabled", "Reversion (not available)")
		return

	var has_reversion: bool = player.has_keychain("reversion")
	var uses: int = get_uses(player)
	var has_uses_left: bool = uses > 0

	if has_reversion and has_uses_left:
		_emit_button_state("active", "Reversion (%d uses left)" % uses)
	elif has_reversion and not has_uses_left:
		_emit_button_state("disabled", "Reversion (no uses left)")
	else:
		_emit_button_state("disabled", "Reversion (not available)")


# Emits the button state to the UI.
func _emit_button_state(state_class: String, tooltip: String) -> void:
	# The UI scene connects to this signal.
	if game_manager.has_signal("reversion_button_state_changed"):
		game_manager.reversion_button_state_changed.emit(state_class, tooltip)


# ======================= KEYBOARD SHORTCUT =======================

# Handles the "R" key press to activate Reversion.
func handle_key_press(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_R:
			activate()
