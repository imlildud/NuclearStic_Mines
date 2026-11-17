# DamageEffects.gd — damage feedback: sprite flash + sparks + fullscreen
# shader (mine blur/dark, death blackout, low-HP vignette).
#
# The fullscreen damage flash is gone on purpose: flashing the whole screen
# on every hit is too much. The flash lives on the character sprite only
# now (modulate brightening); the fullscreen shader is only for the heavy
# stuff (mine blur/dark, death, low-HP vignette).
#
# Anti-stuck rule (fix for the web bug): this node owns ONE effect tween
# and ONE shader state. Every effect starts by killing the running tween
# and resetting every shader param to clean, and every recovery chain ends
# by resetting to exactly clean. In Renderer.js the mine flash and the
# rewind shared the same timeout list, the same overlay and the same canvas
# filter, so one effect's reset killed the other's recovery mid-way and the
# screen froze in a blurry/dark phase. Here nothing is shared and nothing
# can freeze.
#
# Layer 5: above the board, below the HUD (10), so the board blurs and
# darkens but the HUD stays readable — same as the web canvas filter.
extends CanvasLayer

const DAMAGE_SHADER := "res://shaders/damage_effects.gdshader"
const VIGNETTE_STRENGTH: float = 0.8
const MINE_RECOVERY_SLOW: float = 2.5

var _rect: ColorRect
var _mat: ShaderMaterial
var _char_sprite: Sprite2D = null
var _effect_tween: Tween = null
var _sprite_tween: Tween = null
var _sparks_left: GPUParticles2D
var _sparks_right: GPUParticles2D
var _effect_active: bool = false
var _vignette: float = 0.0
var _vignette_enabled: bool = false
var _last_vignette_param: float = -1.0


func _ready() -> void:
	layer = 5
	_mat = ShaderMaterial.new()
	var shader = load(DAMAGE_SHADER)
	if shader == null:
		push_error("[DamageEffects] Shader not found at " + DAMAGE_SHADER)
	_mat.shader = shader
	_rect = ColorRect.new()
	_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_rect.color = Color(1, 1, 1, 1)
	_rect.material = _mat
	_rect.visible = false
	add_child(_rect)
	_sparks_left = _make_sparks(Vector2(-1, 0))
	_sparks_right = _make_sparks(Vector2(1, 0))
	add_child(_sparks_left)
	add_child(_sparks_right)
	_reset_params()


func _process(delta: float) -> void:
	if not _vignette_enabled:
		return
	# Low HP: darkened edges, like squinting eyes. Fires at 1 HP left,
	# any character except Scout (his max HP is 1, so 1 HP is full life
	# for him). The old quarterlife rule never fired for Mosquito, Scout
	# or Student, so it looked like nothing happened. Polled every frame
	# from the real HP, so it can never desync or get stuck.
	var target := 0.0
	var player = GameManager.player
	if player != null and is_instance_valid(player):
		if player.get_hp() == 1 and player.get_type() != "scout":
			target = VIGNETTE_STRENGTH
	_vignette = lerpf(_vignette, target, clampf(delta * 3.0, 0.0, 1.0))
	if absf(_vignette - _last_vignette_param) > 0.001:
		_mat.set_shader_parameter("vignette_amount", _vignette)
		_last_vignette_param = _vignette
	_update_visibility()


func set_character_sprite(sprite: Sprite2D) -> void:
	_char_sprite = sprite


func set_vignette_enabled(enabled: bool) -> void:
	_vignette_enabled = enabled
	if not enabled:
		_vignette = 0.0
		_mat.set_shader_parameter("vignette_amount", 0.0)
		_last_vignette_param = 0.0
		_update_visibility()


# Normal damage (HP loss): white flash ON THE CHARACTER ONLY + blood
# red sparks to the sides (dark blood red, not the bright orange-red of
# the AP metal sparks). No fullscreen flash.
func play_damage() -> void:
	_flash_sprite(2.5)
	_burst_sparks(Color(0.7, 0.05, 0.08))


# AP damage (armor absorbs the hit, Mommy/Resistance): duller gray flash
# on the character + red sparks, like metal sparking.
func play_ap_damage() -> void:
	_flash_sprite(1.5)
	_burst_sparks(Color(1, 0.15, 0.1))


# Mine stepped on with AP: gray flash on the character + red sparks, then
# the screen goes blurry/dark and recovers little by little. Web
# triggerMineFlash timings x MINE_RECOVERY_SLOW (2.5): ~7.5s blackout,
# then blur 4/2/1 recovering over ~22s, ~30s total. It is a penalty.
func play_mine_ap() -> void:
	_flash_sprite(1.5)
	_burst_sparks(Color(1, 0.15, 0.1))
	_start_effect()
	var s := MINE_RECOVERY_SLOW
	_effect_tween = create_tween()
	_effect_tween.tween_property(_mat, "shader_parameter/dark_amount", 0.9, 0.3 * s)
	_effect_tween.parallel().tween_property(_mat, "shader_parameter/blur_amount", 8.0, 0.2 * s)
	_effect_tween.parallel().tween_property(_mat, "shader_parameter/brightness", 0.3, 0.2 * s)
	_effect_tween.tween_interval(2.7 * s)
	_effect_tween.tween_property(_mat, "shader_parameter/dark_amount", 0.0, 0.5 * s)
	_effect_tween.parallel().tween_property(_mat, "shader_parameter/blur_amount", 4.0, 0.5 * s)
	_effect_tween.parallel().tween_property(_mat, "shader_parameter/brightness", 0.5, 0.5 * s)
	_effect_tween.tween_interval(2.5 * s)
	_effect_tween.tween_property(_mat, "shader_parameter/blur_amount", 2.0, 0.5 * s)
	_effect_tween.parallel().tween_property(_mat, "shader_parameter/brightness", 0.7, 0.5 * s)
	_effect_tween.tween_interval(2.5 * s)
	_effect_tween.tween_property(_mat, "shader_parameter/blur_amount", 1.0, 0.5 * s)
	_effect_tween.parallel().tween_property(_mat, "shader_parameter/brightness", 0.9, 0.5 * s)
	_effect_tween.tween_interval(2.5 * s)
	_effect_tween.tween_property(_mat, "shader_parameter/blur_amount", 0.0, 0.5 * s)
	_effect_tween.parallel().tween_property(_mat, "shader_parameter/brightness", 1.0, 0.5 * s)
	_effect_tween.tween_callback(_reset_params)


# Real death: the screen darkens and stays dark, the game over screen
# takes it from here. reset_effects() (retry/home/new game) clears it.
func play_death() -> void:
	_start_effect()
	_effect_tween = create_tween()
	_effect_tween.tween_property(_mat, "shader_parameter/dark_amount", 1.0, 0.5)
	_effect_tween.parallel().tween_property(_mat, "shader_parameter/blur_amount", 4.0, 0.5)
	_effect_tween.parallel().tween_property(_mat, "shader_parameter/brightness", 0.4, 0.5)


# Public: instant clean state (retry/home/new game/rewind). Kills any
# effect mid-flight, so the screen can never freeze in a blurry/dark phase.
func reset_effects() -> void:
	_kill_tween()
	_kill_sprite_tween()
	_reset_params()


func _start_effect() -> void:
	_kill_tween()
	_reset_params()
	_rect.visible = true
	_effect_active = true


func _kill_tween() -> void:
	if _effect_tween != null and _effect_tween.is_valid():
		_effect_tween.kill()
	_effect_tween = null


func _kill_sprite_tween() -> void:
	if _sprite_tween != null and _sprite_tween.is_valid():
		_sprite_tween.kill()
	_sprite_tween = null
	if _char_sprite != null and is_instance_valid(_char_sprite):
		_char_sprite.modulate = Color(1, 1, 1)


func _reset_params() -> void:
	_mat.set_shader_parameter("blur_amount", 0.0)
	_mat.set_shader_parameter("brightness", 1.0)
	_mat.set_shader_parameter("dark_amount", 0.0)
	_effect_active = false
	_update_visibility()


func _update_visibility() -> void:
	_rect.visible = _effect_active or _vignette > 0.01


# Flash on the character sprite only (modulate brightening, not the whole
# screen). The sprite is the moving one during the step onto the tile, so
# the flash rides along with it.
func _flash_sprite(strength: float) -> void:
	if _char_sprite == null or not is_instance_valid(_char_sprite):
		return
	_kill_sprite_tween()
	_sprite_tween = create_tween()
	_sprite_tween.tween_property(_char_sprite, "modulate", Color(strength, strength, strength), 0.08)
	_sprite_tween.tween_property(_char_sprite, "modulate", Color(1, 1, 1), 0.2)


func _char_screen_pos() -> Vector2:
	# Destination tile: the character's logical position is already the
	# new tile when damage is verified (handle_input runs before the
	# movement animation), so the sparks burst where the character lands.
	var renderer = GameManager.renderer
	if renderer != null and renderer.tile_layer != null:
		var player = GameManager.player
		if player != null and is_instance_valid(player):
			var pos := Vector2i(player.get_pos_x(), player.get_pos_y())
			var t: Dictionary = renderer.tile_layer.get_player_visual_transform(pos)
			if t.has("position"):
				var world: Vector2 = t["position"]
				return renderer.tile_layer.get_canvas_transform() * world
	if _char_sprite != null and is_instance_valid(_char_sprite):
		return _char_sprite.get_global_transform_with_canvas().origin
	return get_viewport().get_visible_rect().size * 0.5


func _burst_sparks(color: Color) -> void:
	var pos := _char_screen_pos()
	for s in [_sparks_left, _sparks_right]:
		s.modulate = color
		s.global_position = pos
		s.restart()


func _make_sparks(direction: Vector2) -> GPUParticles2D:
	var p := GPUParticles2D.new()
	p.texture = _make_spark_texture()
	p.amount = 20
	p.lifetime = 0.6
	p.one_shot = true
	p.explosiveness = 0.9
	p.emitting = false
	var m := ParticleProcessMaterial.new()
	m.direction = Vector3(direction.x, direction.y, 0)
	m.spread = 60.0
	m.initial_velocity_min = 200.0
	m.initial_velocity_max = 350.0
	m.gravity = Vector3(0, 350, 0)
	m.damping_min = 40.0
	m.damping_max = 80.0
	m.scale_min = 0.25
	m.scale_max = 0.5
	p.process_material = m
	return p


func _make_spark_texture() -> Texture2D:
	var img := Image.create(16, 16, false, Image.FORMAT_RGBA8)
	for y in 16:
		for x in 16:
			var d := Vector2(x - 7.5, y - 7.5).length() / 7.5
			var a := clampf(1.0 - d, 0.0, 1.0)
			img.set_pixel(x, y, Color(1, 1, 1, a * a))
	return ImageTexture.create_from_image(img)
