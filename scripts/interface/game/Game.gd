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
#   - Handle input (WASD move / arrows flag).
#   - Update the HUD each frame.
#   - Wire HUD signals (touch controls, pause, back).
#   - Wire modal signals (scoreboard, level start, pause).
#   - Set the background wallpaper and play the music per biome.
#   - Refresh vision after moves and after pal rescues.
#   - Re-center the camera on new levels/retries/random games.
#
# INPUT ROUTING (matches JS InputManager.js):
#   - WASD: character movement.
#   - Arrows: flag placement in that direction (FLAG_DELAY = 150ms).
#   - F: cycle flag mode (SWAMP_DELAY = 300ms).
#   - R: reversion.
#   - ESC: pause.
#
# MOVEMENT ANIMATION (ported from Renderer.js):
#   - Normal move: character arcs 40px up and tilts +0.3 rad.
#   - Scout jump:  character arcs 25px up and tilts -90° (quarter turn).
#   - Height scaling from Renderer.js heightOffsetCache.
#   - Both use a parallel Tween (position + rotation + scale).
#   - Damage flash is triggered by CharacterController.hurt_character().
#
# SCOREBOARD (matches JS ScoreboardManager.js):
#   - The ScoreboardManager only calculates scores.
#   - Game.gd builds the payload and calls Scoreboard.display_scores().
#   - Scoreboard.gd handles the animation (count-up, fade, grade pop).
#   - No signal connection needed between the manager and the UI.

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

# --- Input delays (matching JS InputManager.js) ---
const FLAG_DELAY: float = 0.15
const SWAMP_DELAY: float = 0.3

# --- Damage flash ---
const DAMAGE_FLASH_DURATION: float = 0.15

# --- Height scale map (from Renderer.js heightOffsetCache) ---
const HEIGHT_SCALE_MAP: Dictionary = {1: 1.05, 2: 1.08, 3: 1.10, 4: 1.12}

@onready var board_node: Node2D = $Board
@onready var character_sprite: Sprite2D = $Character/Sprite
@onready var camera: Camera2D = $Camera
@onready var hud = $HUD
@onready var background: TextureRect = $Background

var _is_scout_jump: bool = false
var _is_animating: bool = false
var _last_flag_time: float = 0.0
var _last_swamp_time: float = 0.0
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
	camera.make_current()

	# HUD setup.
	hud.set_game(self)
	hud.move_requested.connect(_move)
	hud.flag_requested.connect(_handle_flag)
	hud.swamp_requested.connect(_cycle_flag_mode)
	hud.restart_requested.connect(_reversion)
	hud.pause_requested.connect(_pause)
	hud.back_requested.connect(_on_back_pressed)

	# Scoreboard button signals.
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

func _apply_zone_visuals(zone: String) -> void:
	_set_background(zone)
	AudioManager.play_music(zone, true)
	_current_zone = zone


func _set_background(zone: String) -> void:
	var wallpaper_path: String = WALLPAPER_PATH % zone
	print("[Game] Setting background: ", wallpaper_path)

	if not ResourceLoader.exists(wallpaper_path):
		push_warning("[Game] Wallpaper not found: " + wallpaper_path)
		return

	background.texture = load(wallpaper_path)
	print("[Game] Background texture set: ", background.texture)


# ======================= CHARACTER SPRITE =======================

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

func refresh_vision_after_move() -> void:
	if GameManager.board_ctrl == null or GameManager.player == null:
		return
	GameManager.board_ctrl.update_vision_around_player(GameManager.board, GameManager.player)
	board_node.refresh()


func refresh_vision_after_rescue() -> void:
	if GameManager.board_ctrl == null or GameManager.player == null:
		return
	GameManager.board_ctrl.update_vision(GameManager.board, GameManager.player)
	board_node.refresh()


# ======================= INPUT =======================

func _unhandled_input(event: InputEvent) -> void:
	if GameManager.game_input_locked:
		return

	if not (event is InputEventKey and event.pressed and not event.echo):
		return

	match event.keycode:
		KEY_W: _move("Up")
		KEY_S: _move("Down")
		KEY_A: _move("Left")
		KEY_D: _move("Right")
		KEY_UP:    _handle_flag_with_delay("Up")
		KEY_DOWN:  _handle_flag_with_delay("Down")
		KEY_LEFT:  _handle_flag_with_delay("Left")
		KEY_RIGHT: _handle_flag_with_delay("Right")
		KEY_F: _cycle_flag_mode_with_delay()
		KEY_R: _reversion()
		KEY_ESCAPE: _pause()


func _handle_flag_with_delay(direction: String) -> void:
	var now: float = Time.get_ticks_msec() / 1000.0
	if now - _last_flag_time < FLAG_DELAY:
		return
	_last_flag_time = now
	_handle_flag(direction)


func _cycle_flag_mode_with_delay() -> void:
	var now: float = Time.get_ticks_msec() / 1000.0
	if now - _last_swamp_time < SWAMP_DELAY:
		return
	_last_swamp_time = now
	_cycle_flag_mode()


# ======================= MOVEMENT =======================

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


func _animate_move(from_pos: Vector2i, to_pos: Vector2i) -> void:
	_is_animating = true

	var start_world: Vector2 = _get_character_world_position(from_pos)
	var end_world: Vector2 = _get_character_world_position(to_pos)
	var target_scale: Vector2 = _get_character_scale_at(to_pos)

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

	tween.tween_property(character_sprite, "scale", target_scale, MOVE_DURATION)

	tween.chain().tween_callback(func():
		_is_animating = false
		_is_scout_jump = false
		camera.position = end_world
		board_node.update_player()
		refresh_vision_after_move()
		board_node.refresh()
	)


func _place_character() -> void:
	var tile_pos := Vector2i(
		GameManager.player.get_pos_x(),
		GameManager.player.get_pos_y()
	)

	_update_character_sprite()

	character_sprite.global_position = _get_character_world_position(tile_pos)
	character_sprite.scale = _get_character_scale_at(tile_pos)
	character_sprite.rotation = 0.0

	camera.position = character_sprite.global_position
	camera.reset_smoothing()


func _get_character_world_position(tile_pos: Vector2i) -> Vector2:
	var tile_world_pos: Vector2 = board_node.tile_to_world(tile_pos)

	var tex: Texture2D = character_sprite.texture
	if tex == null:
		return tile_world_pos

	var tex_size: Vector2 = tex.get_size()
	var tile_size: float = float(board_node.get_tile_size())

	var height: int = _get_tile_height_at(tile_pos)
	var height_scale: float = HEIGHT_SCALE_MAP.get(height, 1.0)

	var target_height: float = tile_size * HEIGHT_MULT * height_scale
	var scale_y: float = target_height / tex_size.y
	var scale_x: float = scale_y * WIDTH_MULT

	character_sprite.scale = Vector2(scale_x, scale_y)

	var effective_tile_size: float = tile_size * height_scale
	var y_offset: float = (target_height - effective_tile_size) * 1.5 + Y_LIFT

	return tile_world_pos + Vector2(0, -y_offset)


func _get_character_scale_at(tile_pos: Vector2i) -> Vector2:
	var tex: Texture2D = character_sprite.texture
	if tex == null:
		return Vector2.ONE

	var tex_size: Vector2 = tex.get_size()
	var tile_size: float = float(board_node.get_tile_size())

	var height: int = _get_tile_height_at(tile_pos)
	var height_scale: float = HEIGHT_SCALE_MAP.get(height, 1.0)

	var target_height: float = tile_size * HEIGHT_MULT * height_scale
	var scale_y: float = target_height / tex_size.y
	var scale_x: float = scale_y * WIDTH_MULT

	return Vector2(scale_x, scale_y)


func _get_tile_height_at(tile_pos: Vector2i) -> int:
	if GameManager.board.is_empty():
		return 0
	if tile_pos.x < 0 or tile_pos.x >= GameManager.board.size():
		return 0
	if tile_pos.y < 0 or tile_pos.y >= GameManager.board.size():
		return 0
	return GameManager.board[tile_pos.x][tile_pos.y].get_tileheight()


# ======================= FLAG HANDLING =======================

func _handle_flag(direction: String) -> void:
	if GameManager.player == null or GameManager.game_input_locked:
		return

	var old_pos := Vector2i(
		GameManager.player.get_pos_x(),
		GameManager.player.get_pos_y()
	)
	var is_scout: bool = GameManager.player.get_ability_id() == 4

	GameManager.handle_flag_direction(direction)

	var new_pos := Vector2i(
		GameManager.player.get_pos_x(),
		GameManager.player.get_pos_y()
	)

	if is_scout and old_pos != new_pos:
		_is_scout_jump = true
		_animate_move(old_pos, new_pos)
		return

	board_node.refresh()
	refresh_vision_after_move()


# ======================= FLAG MODE =======================

func _cycle_flag_mode() -> void:
	if GameManager.has_flag_mode_keychain():
		GameManager.cycle_flag_mode()
		AudioManager.play_rescue_sfx()


# ======================= REVERSION =======================

func _reversion() -> void:
	if GameManager.activate_reversion():
		board_node.refresh()
		_place_character()


# ======================= DAMAGE FLASH =======================

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
# Builds the payload and calls Scoreboard.display_scores() directly.
func _on_scoreboard_requested(is_victory: bool) -> void:
	if GameManager.scoreboard == null or hud.scoreboard == null:
		push_error("[Game] Scoreboard or Manager missing")
		return

	var scores: Dictionary = GameManager.scoreboard.calculate_scores()

	var payload: Dictionary = {
		"rescued": scores["rescuedDisplay"],
		"marked": scores["markedDisplay"],
		"size": scores["sizeDisplay"],
		"deaths": scores["deaths"],
		"failed": scores["failed"],
		"hurt": scores["hurtDisplay"],
		"total": scores["totalDisplay"],
		"grade_file": GameManager.scoreboard.get_grade_file(
			scores["total"], scores["maxTotal"]
		),
		"is_victory": is_victory,
		"buttons": GameManager.scoreboard._build_button_config(is_victory),
	}

	hud.scoreboard.display_scores(payload)


func _on_scoreboard_continue() -> void:
	hud.hide_scoreboard()
	GameManager.next_level()

	board_node.set_board(GameManager.board)
	_place_character()
	board_node.refresh()

	var new_zone: String = GameManager.config.get("zone", "backyard")
	if new_zone != _current_zone:
		_apply_zone_visuals(new_zone)


func _on_scoreboard_retry() -> void:
	hud.hide_scoreboard()
	GameManager.retry_level()

	board_node.set_board(GameManager.board)
	_place_character()
	board_node.refresh()


func _on_scoreboard_home() -> void:
	hud.hide_scoreboard()
	get_tree().change_scene_to_file(MAIN_MENU_SCENE)


func _on_scoreboard_random() -> void:
	hud.hide_scoreboard()
	GameManager.randomize_new_game()

	board_node.set_board(GameManager.board)
	_place_character()
	board_node.refresh()

	var new_zone: String = GameManager.config.get("zone", "backyard")
	if new_zone != _current_zone:
		_apply_zone_visuals(new_zone)


# ======================= LEVEL START MODAL =======================

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
