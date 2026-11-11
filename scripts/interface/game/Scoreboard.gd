# ==============================================================
# ======================== SCOREBOARD ==========================
# ==============================================================
# End-of-level scoreboard. Shows the breakdown of the score and
# the final grade, with action buttons (continue / retry / home /
# random) based on the game mode.
#
# The payload is sent directly from Game.gd via `display_scores()`.
# No signal connection needed.
#
# Animations match the JS ScoreboardManager:
#   - Each value counts from 0 to its final value over 1.5s.
#   - Each value fades in + scales in (200ms stagger).
#   - Grade pops in after all values (scale 2.5 -> 1.0).
#   - Score loop SFX plays during the animation.
#   - Grade SFX plays when the grade appears.

extends CanvasLayer

signal continue_pressed
signal retry_pressed
signal home_pressed
signal random_pressed

const GRADES_PATH := "res://assets/hud/game/gameover/%s.png"

# Animation timing (matches JS ScoreboardManager).
const STEP_DELAY: float = 0.2
const NUMBER_DURATION: float = 1.5
const GRADE_POP_DURATION: float = 0.3
const GRADE_FADE_DURATION: float = 0.5

@onready var rescued_value: Label = $Root/Card/ValuesCol/RescuedValue
@onready var marked_value: Label = $Root/Card/ValuesCol/MarkedValue
@onready var difficulty_value: Label = $Root/Card/ValuesCol/DifficultyValue
@onready var deaths_value: Label = $Root/Card/ValuesCol/DeathsValue
@onready var failed_value: Label = $Root/Card/ValuesCol/FailedValue
@onready var damage_value: Label = $Root/Card/ValuesCol/DamageValue
@onready var total_label: Label = $Root/Card/TotalLabel
@onready var grade_icon: TextureRect = $Root/Card/GradeIcon

@onready var random_button: TextureButton = $Root/Card/ButtonsRow/RandomButton
@onready var continue_button: TextureButton = $Root/Card/ButtonsRow/ContinueButton
@onready var retry_button: TextureButton = $Root/Card/ButtonsRow/RetryButton
@onready var home_button: TextureButton = $Root/Card/ButtonsRow/HomeButton

var _final_values: Dictionary = {}


func _ready() -> void:
	visible = false
	continue_button.pressed.connect(func(): continue_pressed.emit())
	retry_button.pressed.connect(func(): retry_pressed.emit())
	home_button.pressed.connect(func(): home_pressed.emit())
	random_button.pressed.connect(func(): random_pressed.emit())
	ButtonFeedback.attach_all(self)


# ======================= PUBLIC API =======================

# Called by Game.gd when the player wins or loses.
# Receives the payload and starts the animation.
func display_scores(data: Dictionary) -> void:
	_final_values = {
		"rescued": data.get("rescued", "0/0"),
		"marked": data.get("marked", "0/0"),
		"size": data.get("size", "x1.00"),
		"deaths": data.get("deaths", "0"),
		"failed": data.get("failed", "0"),
		"hurt": data.get("hurt", "0"),
		"total": data.get("total", "0/0"),
		"grade_file": data.get("grade_file", "f.png"),
		"is_victory": data.get("is_victory", false),
		"buttons": data.get("buttons", {}),
	}

	_reset_labels_to_zero()
	_update_buttons(_final_values["buttons"])
	visible = true

	var sfx_enabled: bool = SaveManager.is_sfx_enabled()
	var sfx_volume: int = SaveManager.get_sfx_volume()
	var play_sound: bool = sfx_enabled and sfx_volume > 0

	if play_sound:
		AudioManager.start_score_animation_sfx()

	_animate_all_values(play_sound)


# ======================= LABEL RESET =======================

func _reset_labels_to_zero() -> void:
	rescued_value.text = "0/0"
	marked_value.text = "0/0"
	difficulty_value.text = "x0.00"
	deaths_value.text = "0"
	failed_value.text = "0"
	damage_value.text = "0"
	total_label.text = "0/0"

	rescued_value.modulate = Color(1, 1, 1, 0)
	marked_value.modulate = Color(1, 1, 1, 0)
	difficulty_value.modulate = Color(1, 1, 1, 0)
	deaths_value.modulate = Color(1, 1, 1, 0)
	failed_value.modulate = Color(1, 1, 1, 0)
	damage_value.modulate = Color(1, 1, 1, 0)
	total_label.modulate = Color(1, 1, 1, 0)

	grade_icon.modulate = Color(1, 1, 1, 0)
	grade_icon.scale = Vector2.ONE


# ======================= ANIMATION =======================

func _animate_all_values(with_sound: bool) -> void:
	var elements: Array = [
		{"node": rescued_value, "kind": "fraction", "final": _final_values["rescued"], "animate_transform": true},
		{"node": marked_value, "kind": "fraction", "final": _final_values["marked"], "animate_transform": true},
		{"node": difficulty_value, "kind": "string", "final": _final_values["size"], "animate_transform": true},
		{"node": deaths_value, "kind": "number", "final": _final_values["deaths"], "animate_transform": true},
		{"node": failed_value, "kind": "number", "final": _final_values["failed"], "animate_transform": true},
		{"node": damage_value, "kind": "number", "final": _final_values["hurt"], "animate_transform": true},
		{"node": total_label, "kind": "fraction", "final": _final_values["total"], "animate_transform": false},
	]

	var delay: float = 0.0
	for element in elements:
		var e = element
		var d: float = delay
		var tween := create_tween()
		tween.tween_interval(d)
		tween.tween_callback(func():
			_animate_single_value(e["node"], e["final"], e["kind"], e["animate_transform"])
		)
		delay += STEP_DELAY

	var total_duration: float = delay + NUMBER_DURATION + 0.1
	var grade_tween := create_tween()
	grade_tween.tween_interval(total_duration)
	grade_tween.tween_callback(func():
		if with_sound:
			AudioManager.stop_score_animation_sfx()
			AudioManager.play_grade_sfx()
		_reveal_grade()
	)


func _animate_single_value(node: Control, final_text: String, kind: String, animate_transform: bool) -> void:
	var fade_tween := create_tween()
	fade_tween.tween_property(node, "modulate", Color(1, 1, 1, 1), 0.3)

	if animate_transform:
		node.pivot_offset = node.size / 2.0
		node.scale = Vector2(0.9, 0.9)
		var scale_tween := create_tween()
		scale_tween.tween_property(node, "scale", Vector2.ONE, 0.3)

	match kind:
		"fraction":
			_animate_fraction(node, final_text)
		"number":
			_animate_integer(node, final_text)
		"string":
			node.text = final_text


func _animate_fraction(node: Label, final_text: String) -> void:
	var parts: PackedStringArray = final_text.split("/")
	if parts.size() != 2:
		node.text = final_text
		return

	var final_num: int = int(parts[0])
	var final_max: int = int(parts[1])

	var tween := create_tween()
	tween.tween_method(func(progress: float):
		var current_num: int = int(floor(float(final_num) * progress))
		var current_max: int = int(floor(float(final_max) * progress))
		node.text = "%d/%d" % [current_num, current_max]
	, 0.0, 1.0, NUMBER_DURATION)


func _animate_integer(node: Label, final_text: String) -> void:
	var digits: String = ""
	var negative: bool = final_text.begins_with("-")
	for c in final_text:
		if c >= "0" and c <= "9":
			digits += c

	if digits == "":
		node.text = final_text
		return

	var final_num: int = int(digits)
	if negative:
		final_num = -final_num

	var tween := create_tween()
	tween.tween_method(func(progress: float):
		var current: int = int(floor(float(final_num) * progress))
		if current < 0:
			node.text = "- %d" % absi(current)
		else:
			node.text = str(current)
	, 0.0, 1.0, NUMBER_DURATION)


func _reveal_grade() -> void:
	var grade_file: String = _final_values.get("grade_file", "f.png")
	var grade_path: String = GRADES_PATH % grade_file.replace(".png", "")
	if ResourceLoader.exists(grade_path):
		grade_icon.texture = load(grade_path)

	grade_icon.scale = Vector2(2.5, 2.5)
	grade_icon.modulate = Color(1, 1, 1, 1)

	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(grade_icon, "scale", Vector2.ONE, GRADE_POP_DURATION)
	tween.tween_property(grade_icon, "modulate", Color(1, 1, 1, 1), GRADE_FADE_DURATION)


# ======================= BUTTONS =======================

func _update_buttons(buttons: Dictionary) -> void:
	continue_button.visible = buttons.get("continue", false)
	retry_button.visible = buttons.get("retry", false)
	random_button.visible = buttons.get("random", false)
	home_button.visible = buttons.get("home", true)


func hide_scoreboard() -> void:
	AudioManager.stop_score_animation_sfx()
	visible = false
