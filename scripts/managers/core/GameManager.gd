# ==============================================================
# ====================== GAME MANAGER ==========================
# ==============================================================
# Core game logic controller - orchestrates all subsystems.
#
# AUTOLOAD: This script runs as a singleton. Access it from any
# scene via `GameManager` (e.g. `GameManager.get_player()`).

extends Node

# ======================= SIGNALS =======================

# Emitted when a generic message modal must be shown.
signal show_message(message: String, on_close: Callable)

# Emitted when the scoreboard should be displayed.
signal scoreboard_requested(is_victory: bool)

# Emitted when the level-start modal should be shown.
signal level_start_requested(character_controller, config: Dictionary, board: Array)

# Emitted when the pause modal should be shown.
signal pause_requested(character_controller, config: Dictionary, board: Array, game_manager)

# Emitted by ReversionManager when a rewind finishes (manual or on
# death). Game.gd listens to re-sync the board and snap the camera.
signal reversion_activated

# Emitted by ReversionManager.update_button_ui() with "active"/"disabled".
# HUD.gd listens to enable/disable the restart (Reversion) button.
signal reversion_button_state_changed(state_class: String, tooltip: String)

# Emitted when GameManager.board is replaced by a new Array (e.g. the
# tutorial regenerates the board on phase change). TileRenderer
# keeps the old Array by reference, so Game.gd must re-set the board.
signal board_changed

# Emitted when the tutorial wants the Yes/No wiki prompt to be shown.
# Game.gd relays this into a modal; the tutorial exposes
# confirm_manual_yes()/confirm_manual_no() for the buttons.
signal tutorial_manual_prompt(question_text: String)

# Emitted when some code changed tile visibility without replacing
# the board array (e.g. reveal_all_tiles / hide_all_tiles). Game.gd
# listens and calls board_node.refresh().
signal board_refresh_requested

# ======================= STATE =======================

var config: Dictionary = {}
var current_level: int = 1
var game_input_locked: bool = false

var player = null                  # CharacterModel
var board_ctrl = null              # BaseBoardController
var char_ctrl = null               # CharacterController
var board: Array = []              # Array[Array[TileModel]]
var last_move_time: int = 0
var MOVE_DELAY: int = 200          # Milliseconds between moves
var renderer = null                # Renderer
var last_result = null             # "victory" | "gameover" | null
var tutorial_manager = null        # TutorialManager
var bubble_text = null             # BubbleText scene instance (tutorial + criticker)
var damage_effects = null          # DamageEffects layer (fullscreen shader + sparks)
var criticker = null               # CritickerController
var spike_controller = null        # SpikeController
var destiny_target = null

# Managers (autoloads referenced by name)
# AudioManager, SaveManager, LocaleManager, DiscordRPC -> autoloads

# Sub-managers (instantiated)
var bundle_manager = null
var bundle_ui_manager = null
var keychain_ui_manager = null
var turn_manager = null
var scoreboard = null

var _keychain_manager = null
var _reversion_manager = null
var _link_manager = null
var _flag_manager = null
var _ui_manager = null
var _level_configurator = null
var _game_mode_manager = null
var _hazard_manager = null
var _flag_mode_manager = null

# Fix for undeclared JS fields (were assigned without `var` in the original)
var _locale_manager = null         # LocaleManager
var memory_markers: int = 3


# ======================= INITIALIZATION =======================

# Called once when the autoload enters the scene tree.
# Sub-managers are created here because they need `self` as reference.
func _ready() -> void:
	turn_manager = TurnManager.new()
	_keychain_manager = KeychainManager.new(self)
	_reversion_manager = ReversionManager.new(self)
	_link_manager = LinkManager.new(self)
	_flag_manager = FlagManager.new(self)
	_ui_manager = UIManager.new(self)
	_level_configurator = LevelConfigurator.new(self)
	_game_mode_manager = GameModeManager.new(self)
	_hazard_manager = HazardManager.new(self)
	_flag_mode_manager = FlagModeManager.new(self)


# ======================= GAME INITIALIZATION =======================

# Starts a new game with the given configuration.
func start_game(cfg: Dictionary) -> void:
	config = cfg
	game_input_locked = false

	var is_hardcore: bool = is_hardcore_enabled() and config.get("mode") == "legacy"

	if is_hardcore:
		current_level = SaveManager.get_hardcore_level()
	else:
		current_level = SaveManager.get_legacy_level()

	# Safety: current_level must be at least 1.
	if current_level < 1:
		current_level = 1
		if is_hardcore:
			SaveManager.set_hardcore_level(1)
		else:
			SaveManager.set_legacy_level(1)

	# Create player
	player = CharacterFactory.create_character(config.get("character", "chef"))
	player.reset_dead_pals()
	turn_manager.reset()

	# Board controller — depends on mode
	match config.get("mode", "legacy"):
		"tutorial":
			board_ctrl = TutorialController.new(player)
		"test":
			board_ctrl = TestController.new(player)
			print("[GameManager] Test mode activated")
		_:
			board_ctrl = BoardController.new(player)

	# Character controller and scoreboard
	char_ctrl = CharacterController.new(player, board_ctrl, self)
	add_child(char_ctrl)
	scoreboard = ScoreboardManager.new(self)
	add_child(scoreboard)

	# Configure level (difficulty, hazards, etc.)
	_level_configurator.configure(self)

	# Initialize bundle system
	bundle_manager = BundleManager.new(self, _locale_manager)
	bundle_ui_manager = BundleUIManager.new(self, bundle_manager, AudioManager)
	bundle_ui_manager.set_locale_manager(_locale_manager)
	keychain_ui_manager = KeychainUIManager.new(self, AudioManager)
	keychain_ui_manager.set_locale_manager(_locale_manager)

	# Load keychains depending on mode
	match config.get("mode", "legacy"):
		"legacy":
			if is_hardcore_enabled():
				_keychain_manager.load_hardcore_keychains(player)
				var saved_char = SaveManager.get_hardcore_character()
				var saved_health = SaveManager.get_hardcore_health()
				if saved_char != null and saved_char == config.get("character") and saved_health != null:
					player.set_hp(saved_health)
					print("[Hardcore] Restored health: ", saved_health)
			else:
				_keychain_manager.load_legacy_keychains(player)

		"daily":
			var daily_seed: int = config.get("seed", Time.get_ticks_msec())
			_keychain_manager.give_daily_keychains(bundle_manager, player, daily_seed)
			KeychainConfig.init_keychain_uses_for_player(player)

		"custom":
			_keychain_manager.load_custom_keychains(SaveManager, player)
			KeychainConfig.init_keychain_uses_for_player(player)

	# Apply keychain passive effects
	_keychain_manager.apply_resistance(player)
	if player.has_keychain("judgment"):
		player.set_criticized(true)
		player.set_criticker_goal(9999)

	_flag_mode_manager.update_swamp_button_ui()
	_reversion_manager.update_button_ui()
	set_linked_pal(board)

	memory_markers = 3

	# Spike controller
	if spike_controller != null:
		spike_controller.destroy()
	spike_controller = SpikeController.new(self)
	spike_controller.register_spikes(board)

	set_player_flags_from_board()

	# Criticker (tutorial dialogs)
	if _locale_manager != null and criticker == null:
		criticker = CritickerController.new(self, _locale_manager, AudioManager)
		await criticker.init()
	if criticker != null:
		# Bind the shared bubble so nest dialogs actually show. The
		# bind guards double-connections, so this is safe every game.
		var bubble = _get_bubble_text()
		if bubble != null and criticker.dialogs != null and criticker.dialogs.dialog_manager != null:
			bubble.bind_criticker_dialog(criticker.dialogs.dialog_manager)

	board_ctrl.update_vision(board, player)
	board_ctrl.set_game_manager(self)

	# Tutorial: create the manager (nobody else does — it was always
	# null) and bind the shared bubble to its dialog manager, then
	# start phase 1. Without this, start_phase_* only emit
	# start_dialogue_sequence into the void and nothing shows.
	if config.get("mode") == "tutorial":
		if tutorial_manager == null:
			tutorial_manager = TutorialManager.new(self, AudioManager, _locale_manager)
		tutorial_manager.current_phase = 1
		var bubble_tut = _get_bubble_text()
		if bubble_tut != null and tutorial_manager.dialog_manager != null:
			bubble_tut.bind_tutorial_dialog(tutorial_manager.dialog_manager)
		# Relay the tutorial's manual-prompt signal through the
		# GameManager so Game.gd can show the Yes/No modal (parity
		# with the JS `showManualButtons` overlay).
		if not tutorial_manager.manual_prompt_requested.is_connected(_on_tutorial_manual_prompt):
			tutorial_manager.manual_prompt_requested.connect(_on_tutorial_manual_prompt)
		tutorial_manager.init()

	# Show level start modal (skipped for tutorial)
	if config.get("mode") != "tutorial":
		await _show_level_start_modal()

	# Update Discord presence
	var presence: Dictionary = DiscordRPC.build_presence(config)
	DiscordRPC.update_presence(presence["details"], presence["state"], {
		"largeImageKey": presence["largeImageKey"]
	})

	game_input_locked = false


# Sets the player's available flags equal to the number of
# hazards currently on the board.
func set_player_flags_from_board() -> void:
	var total_hazards: int = get_total_hazards_on_board()
	player.set_flags(total_hazards)
	print("[GameManager] Set flags to ", total_hazards)


# ======================= INPUT =======================

# Handles a directional move from the player.
func handle_input(direction: String) -> void:
	if game_input_locked:
		return
	if Time.get_ticks_msec() - last_move_time < MOVE_DELAY:
		return
	last_move_time = Time.get_ticks_msec()

	turn_manager.increment_turn()
	char_ctrl.move_character(direction, board)
	char_ctrl.verify_tile(board)
	board_ctrl.update_vision_around_player(board, player)

	if player.is_regen():
		_hazard_manager.regenerate(self)

	check_treasure_tile()
	check_tutorial_progress()
	check_victory()
	check_defeat()


# Checks if the player is standing on a treasure tile.
func check_treasure_tile() -> void:
	var px: int = player.get_pos_x()
	var py: int = player.get_pos_y()
	var tile = board[px][py]

	if tile.have_treasure():
		tile.set_treasure(false)
		if bundle_ui_manager != null:
			bundle_ui_manager.show_bundle_popup(px, py)


# Tutorial-only: advances to the next phase.
func check_tutorial_progress() -> void:
	if config.get("mode") != "tutorial" or tutorial_manager == null:
		return
	var tile = board[player.get_pos_x()][player.get_pos_y()]
	if tile != null and tile.is_flaggoal():
		var phase: int = board_ctrl.current_phase
		if phase < 2 or phase > 4:
			tutorial_manager.next_phase()
		elif tutorial_manager.has_method("has_flagged_correctly") and tutorial_manager.has_flagged_correctly():
			# Phases 2-4: the flaggoal step only advances once the
			# player marked the required hazards (the flag-check poll
			# shows the success message; the step itself advances,
			# like phase 1). Stepping on it without the marks is
			# handled by the poll with the "haven't marked" reset.
			tutorial_manager.next_phase()


# Checks if the player has won.
func check_victory() -> void:
	if config.get("mode") == "tutorial":
		if board_ctrl.current_phase == 5 and char_ctrl.win_condition(board):
			return
	else:
		if char_ctrl.win_condition(board):
			handle_victory()
			return


# Checks if the player has died.
func check_defeat() -> void:
	if not player.is_alive():
		game_input_locked = true
		handle_game_over()


# Activates the Reversion keychain.
func activate_reversion() -> bool:
	return _reversion_manager.activate()


func set_linked_pal(b: Array) -> void:
	_link_manager.set_linked_pal(b)


func get_linked_pal():
	return _link_manager.get_linked_pal()


func on_player_damage() -> void:
	_link_manager.on_player_damage()


# ======================= FLAG SYSTEM =======================

func handle_flag_direction(direction: String) -> void:
	if board.is_empty():
		return
	var result = _flag_manager.handle_flag_direction(
		direction, board, player, criticker
	)

	if result != null and result.get("jumped", false):
		char_ctrl.verify_tile(board)
		board_ctrl.update_vision_around_player(board, player)


# ======================= FLAG MODE SYSTEM =======================

func get_flag_mode_manager():
	return _flag_mode_manager

func get_flag_mode() -> int:
	return _flag_mode_manager.get_flag_mode()

func set_flag_mode(mode: int) -> void:
	_flag_mode_manager.set_flag_mode(mode)

func cycle_flag_mode() -> void:
	_flag_mode_manager.cycle_mode()

func get_available_flag_modes() -> Array:
	return _flag_mode_manager.get_available_modes()

func has_flag_mode_keychain() -> bool:
	return _flag_mode_manager.has_any_mode()

func update_flag_ui() -> void:
	_flag_mode_manager.update_ui()

func reset_memory_markers() -> void:
	_flag_mode_manager.reset_memory_markers()


# ======================= SUB-MANAGER GETTERS =======================

func get_keychain_manager():
	return _keychain_manager

func get_reversion_manager():
	return _reversion_manager

func get_link_manager():
	return _link_manager

func get_flag_manager():
	return _flag_manager

func get_ui_manager():
	return _ui_manager

func get_level_configurator():
	return _level_configurator

func get_game_mode_manager():
	return _game_mode_manager

func get_hazard_manager():
	return _hazard_manager


# ======================= GETTERS =======================

func get_board() -> Array:
	return board

func get_player():
	return player

func get_zone() -> String:
	return config.get("zone", "")

func get_destiny_target(b: Array):
	destiny_target = _keychain_manager.get_destiny_target(b, destiny_target)
	return destiny_target

func reset_destiny_target() -> void:
	destiny_target = null


# ======================= SETTERS =======================

func set_renderer(r) -> void:
	renderer = r

func set_tutorial_manager(tm) -> void:
	tutorial_manager = tm


# Instances the shared BubbleText scene once (child of this autoload,
# so it survives scene changes) and returns it. Returns null with a
# warning when the scene file is missing — dialogs then stay silent.
func _get_bubble_text():
	if bubble_text != null:
		return bubble_text
	if not ResourceLoader.exists("res://scenes/game/BubbleText.tscn"):
		push_warning("[GameManager] BubbleText.tscn not found at res://scenes/game/, dialogs will not show")
		return null
	bubble_text = load("res://scenes/game/BubbleText.tscn").instantiate()
	add_child(bubble_text)
	return bubble_text


# Instances the shared DamageEffects layer once (child of this autoload,
# so it survives scene changes) and returns it. Same pattern as BubbleText.
func get_damage_effects():
	if damage_effects != null:
		return damage_effects
	if not ResourceLoader.exists("res://scripts/interface/game/DamageEffects.gd"):
		push_warning("[GameManager] DamageEffects.gd not found at res://scripts/interface/game/, damage effects will not show")
		return null
	damage_effects = load("res://scripts/interface/game/DamageEffects.gd").new()
	add_child(damage_effects)
	return damage_effects

func set_game_input_locked(locked: bool) -> void:
	game_input_locked = locked

func set_locale_manager(lm) -> void:
	_locale_manager = lm

func is_fall_damage_enabled() -> bool:
	return SaveManager.is_fall_damage_enabled()

func is_hardcore_enabled() -> bool:
	return SaveManager.is_hardcore_enabled()

func get_text(key: String) -> String:
	if _locale_manager != null:
		return _locale_manager.get_translation(key)
	return key


# ======================= DELEGATED METHODS =======================

# Handles a victory: marks daily, saves Legacy progress, shows scoreboard.
#
# IMPORTANT: In Legacy mode, the level is advanced HERE (not on
# Continue). This makes Home and Continue both work correctly.
# `prepare_next_level()` (called on Continue) only rebuilds the board.
func handle_victory() -> void:
	game_input_locked = true

	if config.get("mode") == "daily":
		SaveManager.mark_daily_completed()

	# In Legacy mode, advance the level and save keychains NOW.
	# This does NOT rebuild the board (that happens on Continue).
	if config.get("mode") == "legacy":
		_game_mode_manager.save_legacy_victory_progress(self)

	scoreboard.show(true)
	last_result = "victory"
	scoreboard_requested.emit(true)


# Handles a game over: marks daily failed, plays SFX, shows scoreboard.
# In Legacy mode, clears progress (level resets to 1, keychains cleared).
func handle_game_over() -> void:
	game_input_locked = true

	if config.get("mode") == "daily":
		SaveManager.mark_daily_failed()

	AudioManager.play_death_sfx()
	_game_mode_manager.handle_game_over(self)
	scoreboard.show(false)
	last_result = "gameover"
	scoreboard_requested.emit(false)


# Advances to the next level (Legacy mode only).
# Called by the "Continue" button on the scoreboard.
# The level was ALREADY incremented in handle_victory(). Here we
# only rebuild the player, board, and controllers for the new level.
func next_level() -> void:
	print("[NextLevel] START - Current state: ", {
		"mode": config.get("mode"),
		"level": current_level,
		"inputLocked": game_input_locked
	})

	if config.get("mode") == "legacy":
		_game_mode_manager.prepare_next_level(self)

		get_tree().call_group("scoreboard_overlay", "close")

		if config.get("mode") != "tutorial":
			await _show_level_start_modal()
		game_input_locked = false

		print("[NextLevel] END - Final state: ", {
			"inputLocked": game_input_locked,
			"level": current_level
		})

		# Update Discord presence.
		var updated_config: Dictionary = config.duplicate()
		updated_config["level"] = current_level if current_level > 0 else 1
		var presence: Dictionary = DiscordRPC.build_presence(updated_config)
		DiscordRPC.update_presence(presence["details"], presence["state"], {
			"largeImageKey": presence["largeImageKey"]
		})


# Retries the current level.
func retry_level() -> void:
	if config.get("mode") == "custom":
		start_game(config)
	else:
		_level_configurator.configure(self)
		set_player_flags_from_board()
		_keychain_manager.apply_resistance(player)
		if spike_controller != null:
			spike_controller.destroy()
		spike_controller = SpikeController.new(self)
		spike_controller.register_spikes(board)
		turn_manager.reset()

	get_tree().call_group("scoreboard_overlay", "close")
	if config.get("mode") != "tutorial":
		await _show_level_start_modal()
	game_input_locked = false


# Randomizes a new game (used in sandbox/custom mode).
func randomize_new_game() -> void:
	_game_mode_manager.randomize_new_game(self)

	var updated_config: Dictionary = config.duplicate()
	updated_config["level"] = current_level if current_level > 0 else 1
	var presence: Dictionary = DiscordRPC.build_presence(updated_config)
	DiscordRPC.update_presence(presence["details"], presence["state"], {
		"largeImageKey": presence["largeImageKey"]
	})


# Returns to the main menu.
# In Legacy mode, the level was already incremented in handle_victory(),
# so we don't increment it again here.
func return_to_menu() -> void:
	get_tree().change_scene_to_file("res://scenes/menu/MainMenu.tscn")


# Shows a generic message modal (via signal).
func show_message_modal(message: String, on_close: Callable = Callable()) -> void:
	show_message.emit(message, on_close)


# Pauses the game and shows the pause modal.
func pause_game() -> void:
	if game_input_locked:
		return
	game_input_locked = true
	pause_requested.emit(char_ctrl, config, board, self)


# Called by the tutorial manager when the player falls into a pit.
func on_tutorial_pit_fall() -> void:
	if tutorial_manager != null:
		tutorial_manager.on_pit_fall()


# Counts how many hazards exist on the board.
func get_total_hazards_on_board() -> int:
	if board.is_empty():
		return 0
	var total: int = 0
	for i in range(board.size()):
		for j in range(board.size()):
			if board[i][j].get_hazardtype() != "none":
				total += 1
	return total


# ======================= UTILITY METHODS =======================

func create_seeded_random(seed_value: int) -> Callable:
	var state: Dictionary = {"seed": seed_value}
	return func() -> float:
		state["seed"] = (state["seed"] * 9301 + 49297) % 233280
		return float(state["seed"]) / 233280.0


# ======================= INTERNAL HELPERS =======================

func _show_level_start_modal() -> void:
	# Flag-mode reset at EVERY level start
	set_flag_mode(0)
	reset_memory_markers()
	level_start_requested.emit(char_ctrl, config, board)
	await get_tree().process_frame


# Asks the renderer to redraw without replacing the board array.
func request_refresh() -> void:
	board_refresh_requested.emit()


# Relay: TutorialManager's manual_prompt_requested -> GameManager
# signal consumed by Game.gd to build the Yes/No modal.
func _on_tutorial_manual_prompt(question_text: String) -> void:
	tutorial_manual_prompt.emit(question_text)
