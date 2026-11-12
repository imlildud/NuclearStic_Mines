# ==============================================================
# ==================== GAME MODE MANAGER ========================
# ==============================================================
# Handles Legacy, Daily, and Custom mode logic.
#
# RESPONSIBILITIES:
# - Legacy/Hardcore victory progress saving (level + keychains).
# - Legacy/Hardcore next level preparation (rebuild board).
# - Legacy/Hardcore lose handling (clear progress, maybe save Stuffed).
# - Game over dispatch.
# - Custom mode randomization.
#
# NOTE: Sub-managers of GameManager are private (prefixed with `_`).
# Use the public getters: get_keychain_manager(),
# get_level_configurator(), get_reversion_manager(), etc.

extends RefCounted
class_name GameModeManager

var game_manager = null


func _init(gm = null) -> void:
	game_manager = gm


# ======================= LEGACY =======================

# Called when the player wins in Legacy (normal or Hardcore).
# Saves progress (level + keychains) WITHOUT rebuilding the board.
# Safe to call the moment the player wins, so that Home and Continue
# both behave correctly.
func save_legacy_victory_progress(game) -> void:
	print("[LegacyVictory] Saving progress - Player state: ", {
		"alive": game.player.is_alive(),
		"hp": game.player.get_hp(),
		"deadPals": game.player.get_dead_pals()
	})

	var is_hardcore: bool = game.is_hardcore_enabled()
	var player = game.player
	var keychain_manager = game.get_keychain_manager()

	if is_hardcore:
		# Save hardcore keychains and uses.
		keychain_manager.save_hardcore_keychains(player)

		# Save character and health.
		SaveManager.set_hardcore_character(player.get_type())
		SaveManager.set_hardcore_health(player.get_hp())

		game.current_level += 1
		SaveManager.set_hardcore_level(game.current_level)
	else:
		# Normal Legacy.
		keychain_manager.save_legacy_keychains(player)
		game.current_level += 1
		SaveManager.set_legacy_level(game.current_level)

	print("[LegacyVictory] Level advanced to: %d" % game.current_level)


# Called when the player presses "Continue" on the scoreboard.
# Rebuilds the player, board, controllers, and config for the new level.
func prepare_next_level(game) -> void:
	var is_hardcore: bool = game.is_hardcore_enabled()
	var config: Dictionary = game.config
	var keychain_manager = game.get_keychain_manager()

	print("[PrepareNextLevel] START - level: %d" % game.current_level)

	# Update config for the new level.
	if is_hardcore:
		config["level"] = game.current_level
		config["goals"] = 5
		config["size"] = 12 + game.current_level
		config["hazards"] = 5 + game.current_level
		config["obstacles"] = 10 + game.current_level
		config["zone"] = "ash"
	else:
		config["level"] = game.current_level

	# Re-roll seed if one was set.
	if config.get("seed", null) != null:
		config["seed"] = randi_range(1, 999999999)

	# Recreate player (preserve type and HP for Hardcore).
	var current_type: String = game.player.get_type()
	var current_hp: int = game.player.get_hp()
	game.player = CharacterFactory.create_character(current_type)
	if is_hardcore:
		game.player.set_hp(current_hp)

	# Load keychains into the new player.
	if is_hardcore:
		keychain_manager.load_hardcore_keychains(game.player)
	else:
		keychain_manager.load_legacy_keychains(game.player)

	# Recreate controllers.
	game.board_ctrl = BoardController.new(game.player)
	game.char_ctrl = CharacterController.new(game.player, game.board_ctrl, game)
	game.add_child(game.char_ctrl)

	# Reconfigure the level.
	var level_configurator = game.get_level_configurator()
	level_configurator.configure(game)

	# Recreate spikes.
	if game.spike_controller != null:
		game.spike_controller.destroy()
	game.spike_controller = SpikeController.new(game)
	game.spike_controller.register_spikes(game.board)

	game.turn_manager.reset()
	game.set_player_flags_from_board()
	game.game_input_locked = false

	print("[PrepareNextLevel] END - final state: ", {
		"alive": game.player.is_alive(),
		"hp": game.player.get_hp(),
		"flags": game.player.get_flags()
	})


# Called when the player loses in Legacy (normal or Hardcore).
# Clears progress and optionally saves Stuffed keychains.
func handle_legacy_lose(game) -> void:
	print("[LegacyLose] Before - current_level=%d, saved_level=%d" % [
		game.current_level, SaveManager.get_legacy_level()
	])

	var is_hardcore: bool = game.is_hardcore_enabled()
	var player = game.player
	var keychain_manager = game.get_keychain_manager()

	# Stuffed: Save keychains before clearing (separated by mode).
	if player.has_keychain("stuffed"):
		var keychains_to_save: Array = []
		for id in player.inventory:
			if id != "stuffed":
				keychains_to_save.append(id)

		if not keychains_to_save.is_empty():
			if is_hardcore:
				SaveManager.set_hardcore_stuffed_keychains(keychains_to_save)
				print("[Stuffed Hardcore] Saved keychains on death: ", keychains_to_save)
			else:
				SaveManager.set_legacy_stuffed_keychains(keychains_to_save)
				print("[Stuffed Legacy] Saved keychains on death: ", keychains_to_save)

	if is_hardcore:
		keychain_manager.clear_hardcore_keychains()
		SaveManager.clear_hardcore_all()
		SaveManager.clear_hardcore_progress()
		game.current_level = 1
		SaveManager.set_hardcore_level(1)
	else:
		keychain_manager.clear_legacy_keychains()
		SaveManager.clear_legacy_progress()
		game.current_level = 1
		SaveManager.set_legacy_level(1)

	print("[LegacyLose] After - current_level=%d, saved_level=%d" % [
		game.current_level, SaveManager.get_legacy_level()
	])


# ======================= GENERIC =======================

# Called by GameManager.handle_game_over.
# Dispatches to mode-specific lose logic.
func handle_game_over(game) -> void:
	var _scores = game.scoreboard.calculate_scores()
	if game.config.get("mode") == "legacy":
		handle_legacy_lose(game)


# ======================= RANDOMIZE =======================

# Randomizes the config for a new Custom game and restarts.
func randomize_new_game(game) -> void:
	if game.config.get("mode") != "custom":
		return

	var new_seed: int = randi_range(1, 999999999)
	var random: Callable = game.create_seeded_random(new_seed)

	var chars: Array = ["chef", "mosquito", "mommy", "scout"]
	var character: String = chars[floori(random.call() * chars.size())]

	var sizes: Array = [8, 12, 16, 20, 24]
	var size: int = sizes[floori(random.call() * sizes.size())]

	var hazards_list: Array = [1, 5, 8, 12, 20, 30]
	var hazards: int = hazards_list[floori(random.call() * hazards_list.size())]

	var obstacles_list: Array = [1, 3, 5, 10, 15, 30]
	var obstacles: int = obstacles_list[floori(random.call() * obstacles_list.size())]

	var goals: int = floori(random.call() * 5.0) + 1

	game.config["seed"] = new_seed
	game.config["character"] = character
	game.config["size"] = size
	game.config["hazards"] = hazards
	game.config["obstacles"] = obstacles
	game.config["goals"] = goals

	if game.spike_controller != null:
		game.spike_controller.destroy()
	game.spike_controller = SpikeController.new(game)
	game.spike_controller.register_spikes(game.board)
	game.turn_manager.reset()

	game.get_tree().call_group("scoreboard_overlay", "close")
	game.start_game(game.config)
