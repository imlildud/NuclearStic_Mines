# ==============================================================
# ==================== FLAG MODE MANAGER ========================
# ==============================================================
# Manages flag modes:
#   0 = Normal (place flags)
#   1 = Revelation (reveal a tile, 10 uses)
#   2 = Memory (place lettered markers a/b/c, 3 per level)
#   3 = Purity (clean a damage-ratio tile, 9 uses)
#
# The available modes depend on which keychains the player has.

extends RefCounted
class_name FlagModeManager

# ======================= SIGNALS =======================

# Emitted when the flag UI should update (icon + count).
signal update_flag_ui(icon_file: String, text: String, is_active: bool)

# Emitted when the swamp button state changes.
signal update_swamp_button(state_class: String)

# ======================= STATE =======================

var game_manager = null
var flag_mode: int = 0          # 0=normal, 1=revelation, 2=memory, 3=purity
var memory_markers: int = 3


func _init(gm = null) -> void:
	game_manager = gm


# ======================= GETTERS / SETTERS =======================

func get_flag_mode() -> int:
	return flag_mode


func set_flag_mode(mode: int) -> void:
	flag_mode = mode
	update_ui()
	print("[FlagMode] Mode set to: %d" % mode)


# ======================= AVAILABLE MODES =======================

# Returns the list of modes the player can currently use.
# Mode 0 (normal) is always available.
func get_available_modes() -> Array:
	var player = game_manager.get_player()
	if player == null:
		return [0]

	var modes: Array = [0]

	if player.has_keychain("revelation") and player.get_keychain_uses("revelation") > 0:
		modes.append(1)
	if player.has_keychain("memory"):
		modes.append(2)
	if player.has_keychain("purity") and player.get_keychain_uses("purity") > 0:
		modes.append(3)

	return modes


# Returns true if the player has any non-normal mode available.
func has_any_mode() -> bool:
	return get_available_modes().size() > 1


# Cycles to the next available mode.
func cycle_mode() -> void:
	var available: Array = get_available_modes()
	var current_index: int = available.find(flag_mode)
	if current_index == -1:
		current_index = 0
	var next_index: int = (current_index + 1) % available.size()
	set_flag_mode(available[next_index])


# ======================= UI UPDATE =======================

# Emits the current flag UI state (icon + count) to the UI scene.
func update_ui() -> void:
	var player = game_manager.get_player()
	if player == null:
		return

	var text: String = ""
	var icon: String = ""
	var is_active: bool = false

	match flag_mode:
		1:  # Revelation
			icon = "remainingreveals.png"
			text = str(player.get_keychain_uses("revelation"))
			is_active = true
		2:  # Memory
			icon = "remainingmemories.png"
			var used: int = count_memory_markers()
			text = str(maxi(0, 3 - used))
			is_active = true
		3:  # Purity
			icon = "remainingcleans.png"
			text = str(player.get_keychain_uses("purity"))
			is_active = true
		_:  # Normal
			icon = "remainingflags.png"
			text = str(player.get_flags())
			is_active = false

	update_flag_ui.emit(icon, text, is_active)
	update_swamp_button_ui()


# Emits the swamp button state to the UI scene.
func update_swamp_button_ui() -> void:
	var has_modes: bool = has_any_mode()
	var is_active: bool = flag_mode != 0

	if has_modes and is_active:
		update_swamp_button.emit("active")
	elif has_modes:
		update_swamp_button.emit("")
	else:
		update_swamp_button.emit("disabled")


# ======================= MEMORY MARKERS =======================

# Counts how many memory markers are currently on the board.
func count_memory_markers() -> int:
	var board: Array = game_manager.get_board()
	if board.is_empty():
		return 0
	var count: int = 0
	for i in range(board.size()):
		for j in range(board.size()):
			if board[i][j].has_memory_marker():
				count += 1
	return count


# Clears all memory markers from the board.
func reset_memory_markers() -> void:
	var board: Array = game_manager.get_board()
	if board.is_empty():
		return
	for i in range(board.size()):
		for j in range(board.size()):
			board[i][j].clear_memory_marker()
	update_ui()


# ======================= DEPLETION CHECK =======================

# Called after a mode is used. If the current mode's keychain is
# depleted, switches back to Normal mode and updates the UI.
func check_depleted() -> void:
	var player = game_manager.get_player()
	if player == null:
		return

	var should_reset: bool = false

	if flag_mode == 1 and player.get_keychain_uses("revelation") == 0:
		should_reset = true
		print("[FlagMode] Revelation depleted, switching to normal")

	if flag_mode == 3 and player.get_keychain_uses("purity") == 0:
		should_reset = true
		print("[FlagMode] Purity depleted, switching to normal")

	if should_reset:
		set_flag_mode(0)
		update_ui()
		update_swamp_button_ui()
