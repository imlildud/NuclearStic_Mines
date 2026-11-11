# ==============================================================
# ====================== UI MANAGER ============================
# ==============================================================
# Handles all UI modals (pause, level start, gameover).
#
# PHASE 3 STUB:
# This manager is 100% UI/DOM in the original JS. Its real
# implementation requires:
#   - A `PauseModal.tscn` scene.
#   - A `LevelStartModal.tscn` scene.
#   - A `GameOverModal.tscn` scene (already handled by Scoreboard).
#
# For now, this stub exposes the public API and emits signals so
# the rest of the code compiles. Full wiring in Phase 3.
#
# NOTE: This is a RefCounted (not a Node) so it can be instantiated
# with `UIManager.new(self)`. Scene navigation is delegated to
# GameManager, which is a Node and has `get_tree()`.

extends RefCounted
class_name UIManager

# ======================= SIGNALS =======================

# Emitted when the pause modal should be shown.
signal pause_modal_requested(data: Dictionary)

# Emitted when the level-start modal should be shown.
signal level_start_modal_requested(data: Dictionary)

# Emitted when the pause modal should be hidden.
signal pause_modal_hidden

# Emitted when the level-start modal should be hidden.
signal level_start_modal_hidden

# ======================= STATE =======================

var game_manager = null


func _init(gm = null) -> void:
	game_manager = gm


# ======================= TEXT HELPER =======================

func get_text(key: String) -> String:
	if game_manager != null and game_manager.has_method("get_text"):
		return game_manager.get_text(key)
	return key


# ======================= PAUSE MODAL =======================

# Shows the pause modal.
# The UI scene listens to `pause_modal_requested` and renders it.
func show_pause_modal(char_ctrl, config: Dictionary, board: Array, gm) -> void:
	var total_pals: int = char_ctrl.get_total_pals()
	var remaining_pals: int = char_ctrl.get_remaining_pals()

	var child_types: Array = get_child_types_from_board(board)

	var payload: Dictionary = {
		"title": get_text("game.paused"),
		"seed": config.get("seed", null),
		"seed_text": "Seed: %s" % str(config.get("seed", "---")),
		"stats_text": "%s: %d | %s: %d" % [
			get_text("game.wanted"), total_pals,
			get_text("game.remaining"), remaining_pals
		],
		"child_types": child_types
	}

	pause_modal_requested.emit(payload)


# Called by the UI when the player clicks "Continue".
func on_pause_continue(gm) -> void:
	pause_modal_hidden.emit()
	if gm != null:
		gm.set_game_input_locked(false)


# Called by the UI when the player clicks "Exit".
# Scene navigation is delegated to GameManager (which is a Node).
func on_pause_exit(gm) -> void:
	pause_modal_hidden.emit()
	if gm != null:
		gm.set_game_input_locked(false)
		gm.get_tree().change_scene_to_file("res://scenes/menu/MainMenu.tscn")


# ======================= LEVEL START MODAL =======================

# Shows the level-start modal.
func show_level_start_modal(char_ctrl, config: Dictionary, board: Array) -> void:
	var title: String = ""
	var seed_text: String = ""
	var info: String = ""

	match config.get("mode", "legacy"):
		"legacy":
			title = "%s %d" % [get_text("game.level"), game_manager.current_level]
			seed_text = "%s%s" % [get_text("menu.punchcard.seed"), str(config.get("seed", "---"))]
			info = "%s: %d" % [get_text("game.wanted"), char_ctrl.get_total_pals()]
		"daily":
			title = Time.get_date_string_from_system()
			seed_text = "%s%s" % [get_text("menu.punchcard.seed"), str(config.get("seed", "---"))]
			info = "%s: %d" % [get_text("game.wanted"), char_ctrl.get_total_pals()]
		_:
			title = get_text("game.customMission")
			seed_text = "%s%s" % [get_text("menu.punchcard.seed"), str(config.get("seed", "---"))]
			info = "%s: %d" % [get_text("game.wanted"), char_ctrl.get_total_pals()]

	var child_types: Array = get_child_types_from_board(board)

	var payload: Dictionary = {
		"title": title,
		"seed_text": seed_text,
		"info": info,
		"child_types": child_types
	}

	level_start_modal_requested.emit(payload)


# Called by the UI when the modal should close.
func on_level_start_closed() -> void:
	level_start_modal_hidden.emit()


# ======================= HELPERS =======================

# Returns the list of distinct child types on the board.
func get_child_types_from_board(board: Array) -> Array:
	var child_types: Array = []
	for i in range(board.size()):
		for j in range(board.size()):
			var pal_type: String = board[i][j].get_pal_type()
			if pal_type != "none" and not child_types.has(pal_type):
				child_types.append(pal_type)
	return child_types
