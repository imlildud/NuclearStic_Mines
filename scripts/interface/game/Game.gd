# ==============================================================
# ========================= GAME ===============================
# ==============================================================
# Game scene. Orchestrates the entire game session.
#
# Responsibilities:
#   - Start the game via GameManager.start_game(config).
#   - Hand the board to the Board scene for rendering.
#   - Place and animate the character sprite.
#   - Load the character sprite based on the chosen character.
#   - Handle input (WASD / arrows).
#   - Update the HUD each frame.
#   - Wire HUD signals (touch controls, pause, back).
#   - Wire modal signals (scoreboard, level start, pause).
#   - Set the background wallpaper and play the music per biome.
#   - Refresh vision after moves and after pal rescues.
#
# MOVEMENT ANIMATION (ported from Renderer.js):
#   - Normal move: character arcs 40px up and tilts +0.3 rad.
#   - Scout jump:  character arcs 25px up and tilts -90° (quarter turn).
#   - Both use a parallel Tween (position + rotation).
#   - Damage flash is triggered by CharacterController.hurt_character().

extends Node2D

const MAIN_MENU_SCENE := "res://scenes/menu/MainMenu.tscn"
const WALLPAPER_PATH := "res://assets/hud/game/wallpaper/%s.png"
const CHARACTER_SPRITE_PATH := "res://assets/sprites/characters/%s.png"

# --- Character visual tuning ---
const HEIGHT_MULT: float = 1.25
const WIDTH_MULT: float = 1.15
const Y_LIFT: float = 5.0

# --- Movement animation ---
const MOVE_DURATION: float = 0.2
const NORMAL_ARC_HEIGHT: float = 40.0
const NORMAL_TILT: float = 0.3
const SCOUT_ARC_HEIGHT: float = 25.0
const SCOUT_TILT: float = -PI / 2.0

# --- Damage flash ---
const DAMAGE_FLASH_DURATION: float = 0.15

@onready var board_node: Node2D = $Board
@onready var character_sprite: Sprite2D = $Character/Sprite
@onready var camera: Camera2D = $Camera
@onready var hud = $HUD
@onready var background: TextureRect = $Background

# Whether the current move is a Scout jump (affects animation).
var _is_scout_jump: bool = false

# Whether an animation is currently running (prevents input spam).
var _is_animating: bool = false

# Current biome zone (used to detect changes when advancing levels).
var _current_zone: String = ""


# ======================= LIFECYCLE =======================

func _ready() -> void:
	var config: Dictionary = GameManager.config
	if config.is_empty():
		push_error("[Game] No config found. Returning to menu.")
		get_tree().change_scene_to_file(MAIN_MENU_SCENE)
		return

	GameManager.start_game(config)

	board_node.set_board(GameManager.board)
	_place_character()

	camera.position = character_sprite.global_position
	camera.make_current()

	# HUD setup.
	hud.set_game(self)
	hud.move_requested.connect(_move)
	hud.flag_requested.connect(_handle_flag)
	hud.swamp_requested.connect(_cycle_flag_mode)
	hud.restart_requested.connect(_reversion)
	hud.pause_requested.connect(_pause)
	hud.back_requested.connect(_on_back_pressed)

	# Scoreboard.
	hud.scoreboard.continue_pressed.connect(_on_scoreboard_continue)
	hud.scoreboard.retry_pressed.connect(_on_scoreboard_retry)
	hud.scoreboard.home_pressed.connect(_on_scoreboard_home)
	hud.scoreboard.random_pressed.connect(_on_scoreboard_random)

	# Pause modal.
	hud.pause_modal.continue_pressed.connect(_on_pause_continue)
	hud.pause_modal.exit_pressed.connect(_on_pause_exit)

	# Level start modal.
	hud.level_start_modal.dismissed.connect(_on_level_start_dismissed)

	# Connect GameManager signals.
	GameManager.scoreboard_requested.connect(_on_scoreboard_requested)
	GameManager.level_start_requested.connect(_on_level_start_requested)

	# Connect CharacterController signals (pal rescue -> vision refresh).
	if GameManager.char_ctrl != null:
		GameManager.char_ctrl.pal_rescued.connect(refresh_vision_after_rescue)

	# Background + music per biome.
	var zone: String = config.get("zone", "backyard")
	_apply_zone_visuals(zone)


func _process(_delta: float) -> void:
	if hud != null:
		hud.update()


# ======================= ZONE VISUALS =======================

# Applies the background wallpaper and starts the music for the
# given biome. Safe to call multiple times.
func _apply_zone_visuals(zone: String) -> void:
	_set_background(zone)
	AudioManager.play_music(zone, true)
	_current_zone = zone


# Sets the background wallpaper for the current biome.
func _set_background(zone: String) -> void:
	var wallpaper_path: String = WALLPAPER_PATH % zone
	print("[Game] Setting background: ", wallpaper_path)

	if not ResourceLoader.exists(wallpaper_path):
		push_warning("[Game] Wallpaper not found: " + wallpaper_path)
		return

	background.texture = load(wallpaper_path)
	print("[Game] Background texture set: ", background.texture)


# ======================= CHARACTER SPRITE =======================

# Loads the sprite for the player's character type.
func _update_character_sprite() -> void:
	if GameManager.player == null:
		push_warning("[Game] Cannot update character sprite: player is null")
		return

	var char_type: String = GameManager.player.get_type()
	var path: String = CHARACTER_SPRITE_PATH % char_type

	print("[Game] Loading character sprite: ", path)

	if not ResourceLoader.exists(path):
		push_warning("[Game] Character sprite not found: " + path)
		return

	character_sprite.texture = load(path)
	print("[Game] Character sprite set: ", character_sprite.texture)


# ======================= VISION REFRESH =======================

# Refreshes the vision around the player after a move.
# Uses update_vision_around_player (reveals without hiding).
func refresh_vision_after_move() -> void:
	if GameManager.board_ctrl == null or GameManager.player == null:
		return
	GameManager.board_ctrl.update_vision_around_player(GameManager.board, GameManager.player)
	board_node.queue_redraw()


# Refreshes the full vision after a pal is rescued.
# Uses update_vision (hides non-secure tiles and re-reveals around player).
func refresh_vision_after_rescue() -> void:
	if GameManager.board_ctrl == null or GameManager.player == null:
		return
	GameManager.board_ctrl.update_vision(GameManager.board, GameManager.player)
	board_node.queue_redraw()


# ======================= INPUT =======================

func _unhandled_input(event: InputEvent) -> void:
	if GameManager.game_input_locked:
		return

	if not (event is InputEventKey and event.pressed and not event.echo):
		return

	var direction: String = ""
	match event.keycode:
		KEY_W, KEY_UP:    direction = "Up"
		KEY_S, KEY_DOWN:  direction = "Down"
		KEY_A, KEY_LEFT:  direction = "Left"
		KEY_D, KEY_RIGHT: direction = "Right"
		KEY_F:
			_cycle_flag_mode()
			return
		KEY_R:
			_reversion()
			return
		KEY_ESCAPE:
			_pause()
			return

	if direction != "":
		_move(direction)


# ======================= MOVEMENT =======================

# Moves the player in the given direction and plays the animation.
func _move(direction: String) -> void:
	if _is_animating or GameManager.game_input_locked:
		return

	var old_pos := Vector2i(
		GameManager.player.get_pos_x(),
		GameManager.player.get_pos_y()
	)

	GameManager.handle_input(direction)

	var new_pos := Vector2i(
		GameManager.player.get_pos_x(),
		GameManager.player.get_pos_y()
	)

	if old_pos == new_pos:
		return

	AudioManager.play_move_sfx()
	_animate_move(old_pos, new_pos)


# Animates the character from `from_pos` to `to_pos`:
#   - Arc up by NORMAL_ARC_HEIGHT (or SCOUT_ARC_HEIGHT for Scout jump).
#   - Tilt to NORMAL_TILT (or SCOUT_TILT for Scout jump).
#   - Return to the target tile with no tilt.
# Duration is MOVE_DURATION split into 2 halves (ascend + descend).
func _animate_move(from_pos: Vector2i, to_pos: Vector2i) -> void:
	_is_animating = true

	var start_world: Vector2 = _get_character_world_position(from_pos)
	var end_world: Vector2 = _get_character_world_position(to_pos)

	var arc_height: float = SCOUT_ARC_HEIGHT if _is_scout_jump else NORMAL_ARC_HEIGHT
	var tilt_amount: float = SCOUT_TILT if _is_scout_jump else NORMAL_TILT

	var mid_world: Vector2 = (start_world + end_world) / 2.0
	mid_world.y -= arc_height

	var tween := create_tween()
	tween.set_parallel(true)

	tween.tween_property(character_sprite, "global_position", mid_world, MOVE_DURATION / 2.0)
	tween.tween_property(character_sprite, "global_position", end_world, MOVE_DURATION / 2.0).set_delay(MOVE_DURATION / 2.0)

	tween.tween_property(character_sprite, "rotation", tilt_amount, MOVE_DURATION / 2.0)
	tween.tween_property(character_sprite, "rotation", 0.0, MOVE_DURATION / 2.0).set_delay(MOVE_DURATION / 2.0)

	tween.chain().tween_callback(func():
		_is_animating = false
		_is_scout_jump = false
		camera.position = end_world
		board_node.update_player()
		refresh_vision_after_move()
		board_node.queue_redraw()
	)


# Places the character sprite at the current player tile (no animation).
func _place_character() -> void:
	var tile_pos := Vector2i(
		GameManager.player.get_pos_x(),
		GameManager.player.get_pos_y()
	)

	_update_character_sprite()

	character_sprite.global_position = _get_character_world_position(tile_pos)
	character_sprite.rotation = 0.0


# Computes the world position for the character sprite at a given tile,
# applying the visual scale (HEIGHT_MULT / WIDTH_MULT) and Y_LIFT offset.
func _get_character_world_position(tile_pos: Vector2i) -> Vector2:
	var tile_world_pos: Vector2 = board_node.tile_to_world(tile_pos)

	var tex: Texture2D = character_sprite.texture
	if tex == null:
		return tile_world_pos

	var tex_size: Vector2 = tex.get_size()
	var tile_size: float = float(board_node.get_tile_size())

	var target_height: float = tile_size * HEIGHT_MULT
	var scale_y: float = target_height / tex_size.y
	var scale_x: float = scale_y * WIDTH_MULT

	character_sprite.scale = Vector2(scale_x, scale_y)

	var y_offset: float = (target_height - tile_size) * 1.5 + Y_LIFT
	return tile_world_pos + Vector2(0, -y_offset)


# ======================= FLAG HANDLING =======================

# Handles a flag action from a touch button.
func _handle_flag(direction: String) -> void:
	if GameManager.player == null or GameManager.game_input_locked:
		return
	GameManager.handle_flag_direction(direction)
	board_node.queue_redraw()


# ======================= FLAG MODE =======================

func _cycle_flag_mode() -> void:
	if GameManager.has_flag_mode_keychain():
		GameManager.cycle_flag_mode()
		AudioManager.play_rescue_sfx()


# ======================= REVERSION =======================

func _reversion() -> void:
	if GameManager.activate_reversion():
		board_node.queue_redraw()
		_place_character()


# ======================= DAMAGE FLASH =======================

# Called by CharacterController.hurt_character() when the player takes damage.
func play_damage_flash() -> void:
	if character_sprite == null:
		return

	var original_modulate: Color = character_sprite.modulate
	character_sprite.modulate = Color(2.0, 2.0, 2.0, 1.0)

	var tween := create_tween()
	tween.tween_interval(DAMAGE_FLASH_DURATION)
	tween.tween_callback(func():
		character_sprite.modulate = original_modulate
	)


# ======================= PAUSE =======================

func _pause() -> void:
	if GameManager.game_input_locked:
		return
	GameManager.set_game_input_locked(true)
	hud.show_pause(GameManager.char_ctrl, GameManager.config, GameManager.board)


func _on_pause_continue() -> void:
	hud.hide_pause()
	GameManager.set_game_input_locked(false)


func _on_pause_exit() -> void:
	hud.hide_pause()
	get_tree().change_scene_to_file(MAIN_MENU_SCENE)


# ======================= SCOREBOARD =======================

# Called when GameManager emits `scoreboard_requested`.
func _on_scoreboard_requested(is_victory: bool) -> void:
	hud.show_scoreboard(is_victory)


func _on_scoreboard_continue() -> void:
	hud.hide_scoreboard()
	GameManager.next_level()

	# After advancing to the next level, the board and biome may have
	# changed. Reload everything.
	board_node.set_board(GameManager.board)
	_place_character()
	board_node.queue_redraw()

	var new_zone: String = GameManager.config.get("zone", "backyard")
	if new_zone != _current_zone:
		_apply_zone_visuals(new_zone)


func _on_scoreboard_retry() -> void:
	hud.hide_scoreboard()
	GameManager.retry_level()

	# Reload the board after retry (the board was regenerated).
	board_node.set_board(GameManager.board)
	_place_character()
	board_node.queue_redraw()


func _on_scoreboard_home() -> void:
	hud.hide_scoreboard()
	get_tree().change_scene_to_file(MAIN_MENU_SCENE)


func _on_scoreboard_random() -> void:
	hud.hide_scoreboard()
	GameManager.randomize_new_game()

	# Reload the board after randomizing.
	board_node.set_board(GameManager.board)
	_place_character()
	board_node.queue_redraw()

	var new_zone: String = GameManager.config.get("zone", "backyard")
	if new_zone != _current_zone:
		_apply_zone_visuals(new_zone)


# ======================= LEVEL START MODAL =======================

# Called when GameManager emits `level_start_requested`.
func _on_level_start_requested(char_ctrl, config: Dictionary, board: Array) -> void:
	var title: String = ""
	var seed_text: String = ""
	var info: String = ""

	match config.get("mode", "legacy"):
		"legacy":
			title = "%s %d" % [LocaleManager.get_translation("game.level"), GameManager.current_level]
			seed_text = "%s%s" % [LocaleManager.get_translation("menu.punchcard.seed"), str(config.get("seed", "---"))]
			info = "%s: %d" % [LocaleManager.get_translation("game.wanted"), char_ctrl.get_total_pals()]
		"daily":
			title = Time.get_date_string_from_system()
			seed_text = "%s%s" % [LocaleManager.get_translation("menu.punchcard.seed"), str(config.get("seed", "---"))]
			info = "%s: %d" % [LocaleManager.get_translation("game.wanted"), char_ctrl.get_total_pals()]
		_:
			title = LocaleManager.get_translation("game.customMission")
			seed_text = "%s%s" % [LocaleManager.get_translation("menu.punchcard.seed"), str(config.get("seed", "---"))]
			info = "%s: %d" % [LocaleManager.get_translation("game.wanted"), char_ctrl.get_total_pals()]

	# Get distinct child types from the board.
	var child_types: Array = []
	for i in range(board.size()):
		for j in range(board.size()):
			var pal_type: String = board[i][j].get_pal_type()
			if pal_type != "none" and not child_types.has(pal_type):
				child_types.append(pal_type)

	GameManager.set_game_input_locked(true)
	hud.show_level_start(title, seed_text, info, child_types)


func _on_level_start_dismissed() -> void:
	GameManager.set_game_input_locked(false)


# ======================= BACK =======================

func _on_back_pressed() -> void:
	AudioManager.play_click_sfx()
	get_tree().change_scene_to_file(MAIN_MENU_SCENE)
