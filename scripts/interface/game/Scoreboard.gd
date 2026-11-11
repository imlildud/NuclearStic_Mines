# ==============================================================
# ======================== SCOREBOARD ==========================
# ==============================================================
# End-of-level scoreboard. Shows the breakdown of the score and
# the final grade, with action buttons (continue / retry / home /
# random) based on the game mode.

extends CanvasLayer

signal continue_pressed
signal retry_pressed
signal home_pressed
signal random_pressed

const GRADES_PATH := "res://assets/hud/game/gameover/%s.png"

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


func _ready() -> void:
	visible = false
	continue_button.pressed.connect(func(): continue_pressed.emit())
	retry_button.pressed.connect(func(): retry_pressed.emit())
	home_button.pressed.connect(func(): home_pressed.emit())
	random_button.pressed.connect(func(): random_pressed.emit())


func show_scoreboard(is_victory: bool) -> void:
	var scoreboard_manager = GameManager.scoreboard
	if scoreboard_manager == null:
		push_error("[Scoreboard] No ScoreboardManager in GameManager")
		return

	var scores: Dictionary = scoreboard_manager.calculate_scores()

	rescued_value.text = scores.get("rescuedDisplay", "0/0")
	marked_value.text = scores.get("markedDisplay", "0/0")
	difficulty_value.text = scores.get("sizeDisplay", "x1.00")
	deaths_value.text = scores.get("deaths", "0")
	failed_value.text = scores.get("failed", "0")
	damage_value.text = scores.get("hurtDisplay", "0")
	total_label.text = scores.get("totalDisplay", "0/0")

	# Grade icon.
	var grade_file: String = scoreboard_manager.get_grade_file(
		scores.get("total", 0),
		scores.get("maxTotal", 1)
	)
	var grade_path: String = GRADES_PATH % grade_file.replace(".png", "")
	if ResourceLoader.exists(grade_path):
		grade_icon.texture = load(grade_path)

	# Button visibility based on mode and victory.
	_update_buttons(is_victory)

	visible = true


func _update_buttons(is_victory: bool) -> void:
	var mode: String = GameManager.config.get("mode", "legacy")

	# Default: all hidden, home visible.
	continue_button.visible = false
	retry_button.visible = false
	random_button.visible = false
	home_button.visible = true

	if mode == "legacy" and is_victory:
		var next_level: int = GameManager.current_level + 1
		var is_biome_transition: bool = next_level % 10 == 0
		if is_biome_transition:
			continue_button.visible = false
			home_button.visible = true
		else:
			continue_button.visible = true
	elif mode == "custom":
		retry_button.visible = true
		random_button.visible = true
	elif mode == "tutorial":
		continue_button.visible = false
		retry_button.visible = false
		random_button.visible = false
		home_button.visible = false


func hide_scoreboard() -> void:
	visible = false
