# ==============================================================
# ==================== GAME MODE MANAGER ========================
# ==============================================================
# Handles Legacy, Daily, and Custom mode logic.
#
# RESPONSIBILITIES:
# - Legacy/Hardcore victory progression (level up, keep keychains).
# - Legacy/Hardcore lose handling (clear progress, maybe save Stuffed).
# - Game over dispatch.
# - Custom mode randomization.

extends RefCounted

var game_manager = null


func _init(gm = null) -> void:
	game_manager = gm


# ======================= LEGACY =======================

# Called when the player wins in Legacy (normal or Hardcore).
# Progresses the level, rebuilds the player and controllers.
func handle_legacy_victory(game) -> void:
	print("[LegacyVictory] START - Player state: ", {
		"alive": game.player.is_alive(),
		"hp": game.player.get_hp(),
		"deadPals": game.player.get_dead_pals()
	})

	var is_hardcore: bool = game.is_hardcore_enabled()
	var player = game.player
	var config: Dictionary = game.config

	if is_hardcore:
		# Save hardcore keychains and uses
		game.keychain_manager.save_hardcore_keychains(player)

		# Save character and health
		SaveManager.set_hardcore_character(player.get_type())
		SaveManager.set_hardcore_health(player.get_hp())

		game.current_level += 1
		SaveManager.set_hardcore_level(game.current_level)

		config["level"] = game.current_level
		config["goals"] = 5
		config["size"] = 12 + game.current_level
		config["hazards"] = 5 + game.current_level
		config["obstacles"] = 10 + game.current_level
		config["zone"] = "ash"

		var current_hp: int = player.get_hp()
		var current_type: String = player.get_type()
		game.player = CharacterFactory.create_character(current_type)
		game.player.set_hp(current_hp)

		print("[LegacyVictory] After player creation: ", {
			"alive": game.player.is_alive(),
			"hp": game.player.get_hp(),
			"type": game.player.get_type()
		})

		# Load hardcore keychains into new player
		game.keychain_manager.load_hardcore_keychains(game.player)
	else:
		# Normal Legacy
		game.keychain_manager.save_legacy_keychains(player)
		game.current_level += 1
		SaveManager.set_legacy_level(game.current_level)

		var current_type: String = player.get_type()
		game.player = CharacterFactory.create_character(current_type)

		# Load legacy keychains into new player
		game.keychain_manager.load_legacy_keychains(game.player)

	# Re-roll seed if one was set
	if config.get("seed", null) != null:
		config["seed"] = randi_range(1, 999999999)

	# Recreate controllers
	game.board_ctrl = BoardController.new(game.player)
	game.char_ctrl = CharacterController.new(game.player, game.board_ctrl, game)

	# Reconfigure the level
	var level_configurator = game.level_configurator
	level_configurator.configure(game)

	# Recreate spikes
	if game.spike_controller != null:
		game.spike_controller.destroy()
	game.spike_controller = SpikeController.new(game)
	game.spike_controller.register_spikes(game.board)

	game.turn_manager.reset()
	game.set_player_flags_from_board()
	game.game_input_locked = false

	print("[LegacyVictory] END - final state: ", {
		"alive": game.player.is_alive(),
		"hp": game.player.get_hp(),
		"flags": game.player.get_flags()
	})


# Called when the player loses in Legacy (normal or Hardcore).
# Clears progress and optionally saves Stuffed keychains.
func handle_legacy_lose(game) -> void:
	print("Game over: Record %d" % game.current_level)

	var is_hardcore: bool = game.is_hardcore_enabled()
	var player = game.player

	# Stuffed: Save keychains before clearing (separated by mode)
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
		game.keychain_manager.clear_hardcore_keychains()
		SaveManager.clear_hardcore_all()
		SaveManager.clear_hardcore_progress()
		game.current_level = 1
	else:
		game.keychain_manager.clear_legacy_keychains()
		SaveManager.clear_legacy_progress()
		game.current_level = 1


# ======================= GENERIC =======================

# Called by GameManager.handle_game_over.
# Dispatches to mode-specific lose logic.
func handle_game_over(game) -> void:
	# Scores are computed here for side effects (Discord presence,
	# last score, etc.) — the scoreboard itself handles display.
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

	# Close scoreboard overlay
	game.get_tree().call_group("scoreboard_overlay", "close")
	game.start_game(game.config)
