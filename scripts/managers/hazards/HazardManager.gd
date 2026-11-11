# ==============================================================
# ==================== HAZARD MANAGER ===========================
# ==============================================================
# Handles hazard regeneration.
#
# Called from GameManager.handle_input when the player has
# Regeneration active (e.g. after rescuing a pal).
# Regenerates hazards, recalculates hazard counts, updates vision,
# and clears the regen flag.

extends RefCounted

var game_manager = null


func _init(gm = null) -> void:
	game_manager = gm


# Regenerates hazards based on the current mode and level.
func regenerate(game) -> void:
	print("Regenerating hazards - Rescued: %d" % game.player.get_rescued())

	var hazard_amount: int
	var hazard_intensity: int
	var size: int

	var config: Dictionary = game.config
	var player = game.player
	var board_ctrl = game.board_ctrl
	var current_level: int = game.current_level
	var is_hardcore: bool = game.is_hardcore_enabled()

	if config.get("mode") == "legacy":
		if is_hardcore:
			size = config.get("size", 12)
			hazard_intensity = config.get("hazards", 0)
			hazard_amount = DifficultyScaler.get_hazard_count_by_size(size)
			print("[Hardcore Regen] Size: %d, Amount: %d" % [size, hazard_amount])
		else:
			size = DifficultyScaler.get_board_size(current_level)
			hazard_amount = DifficultyScaler.get_hazard_count(current_level)
			hazard_intensity = current_level
	else:
		size = config.get("size", 8)
		hazard_amount = DifficultyScaler.get_hazard_count_by_size(size)
		hazard_intensity = config.get("hazards", 0)

	board_ctrl.regenerate_hazards(game.board, hazard_amount, hazard_intensity, size)
	board_ctrl.track_hazard_count(game.board)
	board_ctrl.update_vision(game.board, player)
	player.set_regen(false)
