# ==============================================================
# ========================= GAME ===============================
# ==============================================================
# Game scene. Orchestrates the entire game session.
#
# CHARACTER RENDERING (hybrid system):
#   - Static state: the player is drawn inside TileRenderer._draw(),
#     so mountains with a greater `y` correctly overlap the player.
#   - Animated state (during movement): a temporary Sprite2D with a
#     high z_index is used by Game.gd, so the player is rendered
#     ON TOP of everything while moving. When the animation finishes,
#     the Sprite2D is hidden and the static player is drawn again.
#   - The Sprite2D uses the same scale and offset as the static player
#     (via TileRenderer.get_player_visual_transform()), so there is no
#     "pop" between states.
#
# The camera follows the temporary Sprite2D during the animation.

extends Node2D

const MAIN_MENU_SCENE := "res://scenes/menu/MainMenu.tscn"
const WALLPAPER_PATH := "res://assets/hud/game/wallpaper/%s.png"

# --- Movement animation (matches Renderer.js timing) ---
const MOVE_DURATION: float = 0.2
const NORMAL_ARC_HEIGHT: float = 40.0
const NORMAL_TILT: float = 0.3
const SCOUT_ARC_HEIGHT: float = 25.0
const SCOUT_TILT: float = -PI / 2.0

# --- Input delays ---
const FLAG_DELAY: float = 0.15
const SWAMP_DELAY: float = 0.3

# --- Damage flash ---
const DAMAGE_FLASH_DURATION: float = 0.15

@onready var board_node: Node2D = $Board
@onready var camera: Camera2D = $Camera
@onready var hud = $HUD
@onready var background: TextureRect = $BackgroundLayer/Background
@onready var anim_sprite: Sprite2D = $AnimationLayer/AnimSprite
@onready var delirium_layer: CanvasLayer = $DeliriumLayer
@onready var delirium_rect: ColorRect = $DeliriumLayer/DeliriumRect
@onready var delirium_mat: ShaderMaterial = delirium_rect.material as ShaderMaterial

var _is_scout_jump: bool = false
var _is_animating: bool = false
var _last_flag_time: float = 0.0
var _last_swamp_time: float = 0.0
var _current_zone: String = ""
var _delirium_active: bool = false
var _delirium_tween: Tween = null


# ======================= LIFECYCLE =======================

func _ready() -> void:
	var config: Dictionary = GameManager.config
	if config.is_empty():
		push_error("[Game] No config found. Returning to menu.")
		get_tree().change_scene_to_file(MAIN_MENU_SCENE)
		return

	# Hide the animation sprite initially.
	anim_sprite.visible = false

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
	_setup_delirium_filter()

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

	# Connect CharacterController signals.
	if GameManager.char_ctrl != null:
		GameManager.char_ctrl.pal_rescued.connect(refresh_vision_after_rescue)

	# Background + music per biome.
	var zone: String = config.get("zone", "backyard")
	_apply_zone_visuals(zone)


func _process(_delta: float) -> void:
	if hud != null:
		hud.update()
		_update_delirium_filter()


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
		board_node.refresh()
		return

	AudioManager.play_move_sfx()
	_animate_character(old_pos, new_pos, false)


# Triggers the character movement animation using a temporary Sprite2D.
# The Sprite2D is rendered on top of everything (z_index = 1000) during
# the animation. When finished, it's hidden and the static player is
# drawn again by TileRenderer._draw().
func _animate_character(from_pos: Vector2i, to_pos: Vector2i, scout_jump: bool) -> void:
	_is_animating = true
	_is_scout_jump = scout_jump

	var tile_layer = board_node.tile_layer

	# 1. Hide the static player (drawn by TileRenderer).
	tile_layer.hide_static_player = true
	tile_layer.queue_redraw()

	# 2. Prepare the animation sprite.
	var tex: Texture2D = tile_layer.get_player_texture()
	if tex == null:
		tile_layer.hide_static_player = false
		_is_animating = false
		return

	anim_sprite.texture = tex
	anim_sprite.visible = true
	anim_sprite.rotation = 0.0

	# 3. Compute the start and end transforms (same as the static player).
	var start_transform: Dictionary = tile_layer.get_player_visual_transform(from_pos)
	var end_transform: Dictionary = tile_layer.get_player_visual_transform(to_pos)

	var start_world: Vector2 = start_transform["position"]
	var end_world: Vector2 = end_transform["position"]
	var start_scale: Vector2 = start_transform["scale"]
	var end_scale: Vector2 = end_transform["scale"]

	anim_sprite.global_position = start_world
	anim_sprite.scale = start_scale

	# 4. Build the arc + tilt parameters.
	var arc_height: float = SCOUT_ARC_HEIGHT if scout_jump else NORMAL_ARC_HEIGHT
	var tilt_amount: float = SCOUT_TILT if scout_jump else NORMAL_TILT

	# Midpoint of the arc (halfway between start and end, minus arc height).
	var mid_world: Vector2 = (start_world + end_world) / 2.0
	mid_world.y -= arc_height

	# 5. Animate with a Tween.
	var tween := create_tween()
	tween.set_parallel(true)

	# Position: start -> mid -> end (2 segments).
	tween.tween_property(anim_sprite, "global_position", mid_world, MOVE_DURATION / 2.0)
	tween.tween_property(anim_sprite, "global_position", end_world, MOVE_DURATION / 2.0).set_delay(MOVE_DURATION / 2.0)

	# Rotation: 0 -> tilt -> 0 (2 segments).
	tween.tween_property(anim_sprite, "rotation", tilt_amount, MOVE_DURATION / 2.0)
	tween.tween_property(anim_sprite, "rotation", 0.0, MOVE_DURATION / 2.0).set_delay(MOVE_DURATION / 2.0)

	# Scale: interpolate to the destination height scale.
	tween.tween_property(anim_sprite, "scale", end_scale, MOVE_DURATION)

	# Camera follows the animation sprite.
	tween.set_parallel(false)

	# Await the animation to finish.
	await tween.finished

	# 6. Animation done: hide the temp sprite, restore static player.
	anim_sprite.visible = false
	tile_layer.hide_static_player = false
	tile_layer.queue_redraw()

	camera.position = end_world

	_is_animating = false
	_is_scout_jump = false

	# Refresh the vision after the animation.
	refresh_vision_after_move()


# Places the character at the current position (no animation).
func _place_character() -> void:
	var tile_pos := Vector2i(
		GameManager.player.get_pos_x(),
		GameManager.player.get_pos_y()
	)

	# Make sure the temp sprite is hidden and the static player is visible.
	anim_sprite.visible = false
	var tile_layer = board_node.tile_layer
	if tile_layer != null:
		tile_layer.hide_static_player = false
		tile_layer.set_player(GameManager.player)
		tile_layer.queue_redraw()

	camera.position = board_node.tile_to_world(tile_pos)
	camera.reset_smoothing()


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

	AudioManager.play_flag_sfx()

	var new_pos := Vector2i(
		GameManager.player.get_pos_x(),
		GameManager.player.get_pos_y()
	)

	if is_scout and old_pos != new_pos:
		_animate_character(old_pos, new_pos, true)
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
	if board_node == null or board_node.tile_layer == null:
		return

	var tile_layer = board_node.tile_layer

	var original_modulate: Color = tile_layer.modulate
	tile_layer.modulate = Color(2.0, 2.0, 2.0, 1.0)
	tile_layer.queue_redraw()

	var tween := create_tween()
	tween.tween_interval(DAMAGE_FLASH_DURATION)
	tween.tween_callback(func():
		if tile_layer != null:
			tile_layer.modulate = original_modulate
			tile_layer.queue_redraw()
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

# ======================= DELIRIUM =======================

func _setup_delirium_filter() -> void:
	if delirium_mat == null:
		push_warning("[Delirium] ShaderMaterial missing on DeliriumRect")
		return
	delirium_mat.set_shader_parameter("grayscale", 0.0)
	delirium_mat.set_shader_parameter("brightness", 1.0)


func _update_delirium_filter() -> void:
	if delirium_mat == null or GameManager.player == null:
		return

	var has_delirium: bool = GameManager.player.has_keychain("delirium")
	if has_delirium == _delirium_active:
		return
	_delirium_active = has_delirium

	if _delirium_tween != null and _delirium_tween.is_valid():
		_delirium_tween.kill()

	_delirium_tween = create_tween()
	_delirium_tween.set_parallel(true)
	_delirium_tween.tween_method(
		func(v: float): delirium_mat.set_shader_parameter("grayscale", v),
		delirium_mat.get_shader_parameter("grayscale") as float,
		1.0 if has_delirium else 0.0,
		0.5
	)
	_delirium_tween.tween_method(
		func(v: float): delirium_mat.set_shader_parameter("brightness", v),
		delirium_mat.get_shader_parameter("brightness") as float,
		0.95 if has_delirium else 1.0,
		0.5
	)
