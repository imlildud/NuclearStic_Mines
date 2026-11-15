# ==============================================================
# ======================== BUBBLE TEXT =========================
# ==============================================================
# Shared dialog bubble used by the tutorial (radio) and the
# criticker (speaker avatar). One scene serves both: the tutorial
# layout is the scene itself (edited in the editor — _ready()
# snapshots it and set_mode("tutorial") restores it); the criticker
# gets its layout from code, and the mode switches the avatar and
# the pulse animation.
#
# Wiring: instance this scene once (e.g. as a child of Game.tscn)
# and bind the managers that will use it:
#     bubble.bind_tutorial_dialog(tutorial_dialog_manager)
#     bubble.bind_criticker_dialog(criticker_dialog_manager)
# The managers must be the _fixed versions: their
# wait_for_any_input() waits for this scene's input_received
# signal instead of firing the callback immediately.

extends CanvasLayer
class_name BubbleText

# ======================= SIGNALS =======================

# The player clicked / tapped / pressed a key while the bubble was
# visible and the text was fully typed. The bound manager turns
# this into its waiting callback (see on_any_input_received()).
signal input_received

# The player actually changed tile (movement poll). Fires even
# during move-only waits, where clicks/keys are ignored.
signal movement_detected

# ======================= CONSTANTS =======================

const WALKIE_PATH := "res://assets/hud/game/radio/walkie.png"
const BUBBLE_PATH := "res://assets/hud/game/radio/bubble.png"
const AVATAR_STATS_PATH := "res://assets/hud/game/stats/%s.png"
const FONT_PATH := "res://assets/font/Shampoos-Regular.ttf"

const TYPE_INTERVAL := 0.03
const MOVE_POLL_INTERVAL := 0.1

# Layouts in 1280x720 space (vmin = 7.2px). Values mirror the web CSS.
const LAYOUTS := {
	"tutorial": {
		"container_bottom": 36, "container_height": 216, "container_half_width": 349,
		"avatar_size": 180, "avatar_offset": Vector2(0, 0),
		"bubble_offset": Vector2(194, 58), "bubble_size": Vector2(504, 158),
		"label_offset": Vector2(58, 72), "label_margin": Vector2(36, 36),
		"font_size": 20,
		"pulse_interval": 0.05, "pulse_step": 0.05, "pulse_min": 0.85, "pulse_max": 1.15,
	},
	"criticker": {
		"container_bottom": 144, "container_height": 144, "container_half_width": 281,
		"avatar_size": 115, "avatar_offset": Vector2(0, 0),
		"bubble_offset": Vector2(129, 0), "bubble_size": Vector2(432, 144),
		"label_offset": Vector2(58, 43), "label_margin": Vector2(36, 36),
		"font_size": 18,
		"pulse_interval": 0.08, "pulse_step": 0.03, "pulse_min": 0.9, "pulse_max": 1.1,
	},
}

# ======================= NODES =======================

@onready var container: Control = $Container
@onready var avatar: TextureRect = $Container/Avatar
@onready var bubble: TextureRect = $Container/Bubble
@onready var text_label: Label = $Container/Bubble/Text
@onready var type_timer: Timer = $TypeTimer
@onready var pulse_timer: Timer = $PulseTimer
@onready var move_poll_timer: Timer = $MovePollTimer

# ======================= STATE =======================

var mode: String = "tutorial"
var _typing: bool = false
var _full_text: String = ""
var _on_complete: Callable = Callable()
var _pulse_scale: float = 1.0
var _pulse_dir: int = 1
var _watching_movement: bool = false
var _has_last_pos: bool = false
var _last_player_pos: Vector2i = Vector2i(-1, -1)

# Snapshot of the scene's own layout (BubbleText.tscn, edited in the
# editor), taken in _ready() before any mode is applied.
var _scene_layout: Dictionary = {}


func _ready() -> void:
	visible = false
	type_timer.wait_time = TYPE_INTERVAL
	type_timer.timeout.connect(_on_type_tick)
	pulse_timer.timeout.connect(_on_pulse_tick)
	move_poll_timer.wait_time = MOVE_POLL_INTERVAL
	move_poll_timer.timeout.connect(_on_move_poll_tick)
	# Snapshot the scene's own layout BEFORE any mode is applied:
	# set_mode("tutorial") restores it, so the criticker layout
	# never leaks into the tutorial (start_game binds the criticker
	# first, then the tutorial).
	_scene_layout = _capture_layout()
	set_mode("tutorial")


# ======================= MODE / LAYOUT =======================

func set_mode(new_mode: String) -> void:
	if not LAYOUTS.has(new_mode):
		return
	mode = new_mode
	var l: Dictionary = LAYOUTS[mode]

	# The tutorial layout IS the scene (BubbleText.tscn, edited in the
	# editor): restore the snapshot taken in _ready(). The criticker,
	# which has no scene of its own, gets its layout from code.
	# Restoring (not just "not touching") matters: start_game binds
	# the criticker first, and without the restore the tutorial would
	# keep the criticker offsets.
	if mode == "tutorial":
		_restore_scene_layout()
	else:
		_apply_layout(l)

	# The pulse scales the avatar around its center ("latir"), so the
	# pivot is the center of the avatar's own rect — the scene's rect
	# for the tutorial, the code layout's for the criticker.
	avatar.pivot_offset = Vector2(
		avatar.offset_right - avatar.offset_left,
		avatar.offset_bottom - avatar.offset_top
	) / 2.0
	avatar.scale = Vector2.ONE

	pulse_timer.wait_time = l["pulse_interval"]


# Reads the scene's own layout (offsets + font size) as loaded from
# the .tscn. Called once in _ready(), before any mode is applied.
func _capture_layout() -> Dictionary:
	return {
		"container": Vector4(container.offset_left, container.offset_top, container.offset_right, container.offset_bottom),
		"avatar": Vector4(avatar.offset_left, avatar.offset_top, avatar.offset_right, avatar.offset_bottom),
		"bubble": Vector4(bubble.offset_left, bubble.offset_top, bubble.offset_right, bubble.offset_bottom),
		"label": Vector4(text_label.offset_left, text_label.offset_top, text_label.offset_right, text_label.offset_bottom),
		"font_size": text_label.get_theme_font_size("font_size"),
	}


# Puts the scene's own layout back (tutorial mode).
func _restore_scene_layout() -> void:
	if _scene_layout.is_empty():
		return
	var c: Vector4 = _scene_layout["container"]
	container.offset_left = c.x
	container.offset_top = c.y
	container.offset_right = c.z
	container.offset_bottom = c.w
	var a: Vector4 = _scene_layout["avatar"]
	avatar.offset_left = a.x
	avatar.offset_top = a.y
	avatar.offset_right = a.z
	avatar.offset_bottom = a.w
	var b: Vector4 = _scene_layout["bubble"]
	bubble.offset_left = b.x
	bubble.offset_top = b.y
	bubble.offset_right = b.z
	bubble.offset_bottom = b.w
	var t: Vector4 = _scene_layout["label"]
	text_label.offset_left = t.x
	text_label.offset_top = t.y
	text_label.offset_right = t.z
	text_label.offset_bottom = t.w
	text_label.add_theme_font_size_override("font_size", int(_scene_layout["font_size"]))


# Applies a code layout (criticker only). The tutorial layout comes
# from the scene itself — see set_mode().
func _apply_layout(l: Dictionary) -> void:
	container.offset_left = -l["container_half_width"]
	container.offset_right = l["container_half_width"]
	container.offset_top = -l["container_bottom"] - l["container_height"]
	container.offset_bottom = -l["container_bottom"]

	var avatar_size: int = l["avatar_size"]
	avatar.offset_left = l["avatar_offset"].x
	avatar.offset_top = l["avatar_offset"].y
	avatar.offset_right = l["avatar_offset"].x + avatar_size
	avatar.offset_bottom = l["avatar_offset"].y + avatar_size

	bubble.offset_left = l["bubble_offset"].x
	bubble.offset_top = l["bubble_offset"].y
	bubble.offset_right = l["bubble_offset"].x + l["bubble_size"].x
	bubble.offset_bottom = l["bubble_offset"].y + l["bubble_size"].y

	text_label.offset_left = l["label_offset"].x
	text_label.offset_top = l["label_offset"].y
	text_label.offset_right = -l["label_margin"].x
	text_label.offset_bottom = -l["label_margin"].y
	text_label.add_theme_font_size_override("font_size", l["font_size"])


# ======================= BINDING =======================

# Connects this scene to a TutorialDialogManager.
func bind_tutorial_dialog(manager) -> void:
	set_mode("tutorial")
	avatar.texture = load(WALKIE_PATH)
	if not manager.show_radio.is_connected(_on_show):
		manager.show_radio.connect(_on_show)
	if not manager.hide_radio.is_connected(_on_hide):
		manager.hide_radio.connect(_on_hide)
	if not manager.display_text.is_connected(_on_display_text):
		manager.display_text.connect(_on_display_text)
	if not manager.stop_typing.is_connected(_on_stop_typing):
		manager.stop_typing.connect(_on_stop_typing)
	if not input_received.is_connected(manager.on_any_input_received):
		input_received.connect(manager.on_any_input_received)
	if manager.has_method("on_movement_detected") and not movement_detected.is_connected(manager.on_movement_detected):
		movement_detected.connect(manager.on_movement_detected)
	if manager.has_method("set_ui"):
		manager.set_ui(self)


# Connects this scene to a CritickerDialogManager.
func bind_criticker_dialog(manager) -> void:
	set_mode("criticker")
	if not manager.show_bubble.is_connected(_on_show_bubble):
		manager.show_bubble.connect(_on_show_bubble)
	if not manager.hide_bubble.is_connected(_on_hide):
		manager.hide_bubble.connect(_on_hide)
	if not manager.display_text.is_connected(_on_display_text):
		manager.display_text.connect(_on_display_text)
	if not manager.stop_typing.is_connected(_on_stop_typing):
		manager.stop_typing.connect(_on_stop_typing)
	if not input_received.is_connected(manager.on_any_input_received):
		input_received.connect(manager.on_any_input_received)
	if manager.has_method("on_movement_detected") and not movement_detected.is_connected(manager.on_movement_detected):
		movement_detected.connect(manager.on_movement_detected)
	if manager.has_method("set_ui"):
		manager.set_ui(self)


# ======================= SHOW / HIDE =======================

func _on_show() -> void:
	set_mode("tutorial")
	avatar.texture = load(WALKIE_PATH)
	visible = true
	_start_pulse()


func _on_show_bubble(avatar_file: String) -> void:
	set_mode("criticker")
	var path: String = AVATAR_STATS_PATH % avatar_file
	if ResourceLoader.exists(path):
		avatar.texture = load(path)
	visible = true
	_start_pulse()


func _on_hide() -> void:
	visible = false
	_stop_pulse()
	type_timer.stop()
	_typing = false
	_on_complete = Callable()
	set_watch_movement(false)


# ======================= TYPEWRITER =======================

func _on_display_text(text: String, on_complete: Callable) -> void:
	_full_text = text
	_on_complete = on_complete
	text_label.text = text
	text_label.visible_characters = 0
	_typing = true
	type_timer.start()


func _on_stop_typing() -> void:
	type_timer.stop()
	_typing = false


func _on_type_tick() -> void:
	if text_label.visible_characters < _full_text.length():
		text_label.visible_characters += 1
	if text_label.visible_characters >= _full_text.length():
		_finish_typing()


func _finish_typing() -> void:
	type_timer.stop()
	_typing = false
	# Web parity: the tutorial radio stops pulsing when the text is
	# done; the criticker avatar keeps pulsing.
	if mode == "tutorial":
		_stop_pulse()
	var cb: Callable = _on_complete
	_on_complete = Callable()
	if cb.is_valid():
		cb.call()


# ======================= AVATAR PULSE ("LATIR") =======================

func _start_pulse() -> void:
	_pulse_scale = 1.0
	_pulse_dir = 1
	avatar.scale = Vector2.ONE
	pulse_timer.start()


func _stop_pulse() -> void:
	pulse_timer.stop()
	avatar.scale = Vector2.ONE


func _on_pulse_tick() -> void:
	var l: Dictionary = LAYOUTS[mode]
	_pulse_scale += _pulse_dir * float(l["pulse_step"])
	if _pulse_scale >= float(l["pulse_max"]):
		_pulse_scale = float(l["pulse_max"])
		_pulse_dir = -1
	elif _pulse_scale <= float(l["pulse_min"]):
		_pulse_scale = float(l["pulse_min"])
		_pulse_dir = 1
	avatar.scale = Vector2(_pulse_scale, _pulse_scale)


# ======================= INPUT =======================

# Any click / tap / key press advances the dialog — but only once
# the text is fully typed (the web installs its listener after the
# typewriter finishes, so input during typing is ignored).
#
# NOTE: the JS listener is attached to `document` / `window`, so it
# does NOT require the bubble to be visible. We mirror that by only
# gating on `_typing` — the manager decides whether it is actually
# waiting for input. `visible` is intentionally NOT checked here:
# hiding the bubble from within `_fire_pending_input()` calls
# `_on_hide()` synchronously, and a second click in the same frame
# would otherwise be swallowed before the next dialog line starts.
func _input(event: InputEvent) -> void:
	if _typing:
		return
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT:
			input_received.emit()
	elif event is InputEventScreenTouch:
		var st := event as InputEventScreenTouch
		if st.pressed:
			input_received.emit()
	elif event is InputEventKey:
		var k := event as InputEventKey
		if k.pressed and not k.echo:
			input_received.emit()


# ======================= MOVEMENT WATCH (TUTORIAL) =======================

# The web tutorial also advances when the player moves. The manager
# enables this while it waits for input; the scene polls the player
# position through the GameManager autoload.
#
# Re-enabling while already watching re-captures the reference
# position, so a `wait_for_any_input` started mid-move does not
# miss the first tile change (JS parity: the interval is created
# fresh inside each `waitForAnyInput` call and captures the current
# position at that moment).
func set_watch_movement(enabled: bool) -> void:
	var was_watching: bool = _watching_movement
	_watching_movement = enabled
	if enabled:
		_record_player_pos()
		if not was_watching:
			move_poll_timer.start()
		else:
			# Already running: just re-arm the reference position.
			_has_last_pos = true
	else:
		move_poll_timer.stop()
		_has_last_pos = false


func _record_player_pos() -> void:
	var pos: Vector2i = _get_player_pos()
	if pos != Vector2i(-1, -1):
		_last_player_pos = pos
		_has_last_pos = true


func _on_move_poll_tick() -> void:
	if not _watching_movement or _typing:
		return
	var pos: Vector2i = _get_player_pos()
	if pos == Vector2i(-1, -1):
		return
	if _has_last_pos and pos != _last_player_pos:
		_last_player_pos = pos
		movement_detected.emit()
	else:
		_last_player_pos = pos
		_has_last_pos = true


func _get_player_pos() -> Vector2i:
	if not is_inside_tree():
		return Vector2i(-1, -1)
	if not GameManager.has_method("get_player"):
		return Vector2i(-1, -1)
	var player = GameManager.get_player()
	if player == null or not player.has_method("get_pos_x") or not player.has_method("get_pos_y"):
		return Vector2i(-1, -1)
	return Vector2i(player.get_pos_x(), player.get_pos_y())
