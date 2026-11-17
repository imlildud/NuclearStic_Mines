# ==============================================================
# ==================== LEVEL CONFIGURATOR =======================
# ==============================================================
# Handles board configuration and level setup.
#
# Called from GameManager.start_game() and GameManager.retry_level().
# It dispatches by mode (tutorial, test, legacy, custom/daily) and
# fills `game.board` with the generated board.
#
# NOTE: Requires DifficultyScaler (pending .gd) for the legacy and
# custom paths. Tutorial and test paths work without it.

extends RefCounted
class_name LevelConfigurator

var game_manager = null


func _init(gm = null) -> void:
	game_manager = gm


# Configures the board for the current game.
func configure(game) -> void:
	var size: int
	var pals: int
	var hazard_amount: int
	var hazard_intensity: int
	var height_intensity: int
	var obstacle_intensity: int
	var zone: String
	var child_level: int

	var config: Dictionary = game.config
	var player = game.player
	var board_ctrl = game.board_ctrl
	var char_ctrl = game.char_ctrl
	var current_level: int = game.current_level
	var is_hardcore: bool = game.is_hardcore_enabled()

	# ===== TUTORIAL MODE =====
	if config.get("mode") == "tutorial":
		game.board = board_ctrl.generate_board(5)
		char_ctrl.get_start_coords(game.board)
		board_ctrl.update_vision(game.board, player)
		return

	# ===== TEST MODE =====
	if config.get("mode") == "test":
		game.board = board_ctrl.generate_board(24)
		char_ctrl.get_start_coords(game.board)
		board_ctrl.update_vision(game.board, player)
		return

	# ===== LEGACY MODE =====
	if config.get("mode") == "legacy":
		if is_hardcore:
			size = 12 + current_level
			pals = DifficultyScaler.get_pal_count(current_level) + 4
			hazard_amount = DifficultyScaler.get_hazard_count_by_size(size)
			hazard_intensity = config.get("hazards", 0)
			height_intensity = config.get("obstacles", 0)
			obstacle_intensity = config.get("obstacles", 0)
			zone = config.get("zone", "ash")
			child_level = current_level
		else:
			size = DifficultyScaler.get_board_size(current_level)
			hazard_amount = DifficultyScaler.get_hazard_count(current_level)
			pals = DifficultyScaler.get_pal_count(current_level)
			height_intensity = current_level
			obstacle_intensity = current_level
			zone = DifficultyScaler.get_zone_by_level(current_level)
			child_level = current_level

	# ===== CUSTOM / DAILY MODE =====
	else:
		size = config.get("size", 8)
		pals = config.get("pals", 1)
		hazard_amount = DifficultyScaler.get_hazard_count_by_size(size)
		hazard_intensity = config.get("hazards", 0)
		height_intensity = config.get("obstacles", 0)
		obstacle_intensity = config.get("obstacles", 0)
		zone = config.get("zone", "backyard")
		child_level = 10

	# Generate board
	game.board = board_ctrl.generate_board(size)
	if config.get("seed", null) != null:
		board_ctrl.set_seed(config["seed"])
		print("[GameManager] Setting board seed: %s" % config["seed"])

	game.board = board_ctrl.generate_start_and_pal(game.board, pals, child_level)
	game.board = board_ctrl.set_safe_tiles(game.board, size)
	game.board = board_ctrl.generate_heights(game.board, height_intensity, size)
	game.board = board_ctrl.generate_obstacles(game.board, obstacle_intensity, size)
	game.board = board_ctrl.generate_hazards(game.board, hazard_amount, hazard_intensity, size)
	game.board = board_ctrl.track_hazard_count(game.board, size)

	if config.get("mode") == "legacy":
		game.board = board_ctrl.generate_treasures(game.board, size)

	char_ctrl.set_character_pals(pals)
	char_ctrl.get_start_coords(game.board)
	board_ctrl.update_vision(game.board, player)

	# Debug
	print("========== GAME CONFIGURATION ==========")
	print("Mode: %s" % config.get("mode"))
	print("Seed: %s" % str(config.get("seed")))
	print("Size: %d" % size)
	print("Pals: %d" % pals)
	print("Hazard Amount: %d" % hazard_amount)
	print("Zone: %s" % zone)
	print("Character: %s" % config.get("character"))
	print("========================================")
