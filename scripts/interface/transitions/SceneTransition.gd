# ==============================================================
# ===================== SCENE TRANSITION =======================
# ==============================================================
# Circle-closing transition between scenes (phase 1 of effects).
# Lives outside the scenes: MainMenu adds it as a child of the
# SceneTree root, so it survives the scene change.
#
# Flow on Start:
#   1. The circle closes over the menu (0.5s).
#   2. The target scene loads in the background (threaded).
#   3. If loading takes longer than LOADING_GRACE, the loading
#      screen appears (cover art + radio tips, no effects).
#   4. When the scene is ready: change scene, open the circle.
#
# Usage (MainMenu._on_punchcard_start):
#   var transition = load("res://scripts/interface/transitions/SceneTransition.gd").new()
#   get_tree().root.add_child(transition)
#   transition.transition_to(GAME_SCENE)

extends CanvasLayer

const CIRCLE_SHADER_PATH := "res://shaders/circle_transition.gdshader"
const LOADING_SCREEN_SCENE := "res://scenes/menu/LoadingScreen.tscn"
const CLOSE_TIME: float = 0.5
const OPEN_TIME: float = 0.5
const LOADING_GRACE: float = 0.8
const OPEN_RADIUS: float = 1.3

var _circle_rect: ColorRect
var _material: ShaderMaterial
var _target_scene: String = ""
var _loading_screen: Control = null
var _state: int = 0  # 0 idle, 1 closing, 2 loading, 3 opening
var _grace_timer: float = 0.0
var _load_done: bool = false


func _ready() -> void:
	layer = 200
	_material = ShaderMaterial.new()
	_material.shader = load(CIRCLE_SHADER_PATH)
	_material.set_shader_parameter("radius", OPEN_RADIUS)
	_circle_rect = ColorRect.new()
	_circle_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_circle_rect.color = Color(1, 1, 1, 1)
	_circle_rect.material = _material
	# Block input while the transition covers the screen.
	_circle_rect.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_circle_rect)


func transition_to(scene_path: String, before_change: Callable = Callable()) -> void:
	_target_scene = scene_path
	_state = 1
	ResourceLoader.load_threaded_request(scene_path)
	var t := create_tween()
	t.tween_property(_material, "shader_parameter/radius", 0.0, CLOSE_TIME).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	await t.finished
	if _state != 1:
		return
	if before_change.is_valid():
		before_change.call()
	_state = 2
	_grace_timer = LOADING_GRACE


# Circle transition without changing scenes (Next/Retry/Randomize):
# close the circle, run the action, open the circle again.
func transition_in_place(action: Callable) -> void:
	var t := create_tween()
	t.tween_property(_material, "shader_parameter/radius", 0.0, CLOSE_TIME).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	await t.finished
	if action.is_valid():
		action.call()
	var t2 := create_tween()
	t2.tween_property(_material, "shader_parameter/radius", OPEN_RADIUS, OPEN_TIME).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	await t2.finished
	queue_free()


func _process(delta: float) -> void:
	if _state != 2:
		return
	if not _load_done:
		var status := ResourceLoader.load_threaded_get_status(_target_scene)
		if status == ResourceLoader.THREAD_LOAD_LOADED:
			_load_done = true
		elif status == ResourceLoader.THREAD_LOAD_FAILED:
			push_error("[SceneTransition] Failed to load: " + _target_scene)
			_state = 0
			queue_free()
			return
	if _load_done:
		_finish_transition()
		return
	_grace_timer -= delta
	if _grace_timer <= 0.0 and _loading_screen == null:
		_show_loading_screen()


func _show_loading_screen() -> void:
	if not ResourceLoader.exists(LOADING_SCREEN_SCENE):
		return
	_loading_screen = load(LOADING_SCREEN_SCENE).instantiate()
	add_child(_loading_screen)


func _finish_transition() -> void:
	_state = 3
	if _loading_screen != null:
		_loading_screen.queue_free()
		_loading_screen = null
	var scene: PackedScene = ResourceLoader.load_threaded_get(_target_scene)
	get_tree().change_scene_to_packed(scene)
	var t := create_tween()
	t.tween_property(_material, "shader_parameter/radius", OPEN_RADIUS, OPEN_TIME).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	await t.finished
	queue_free()
