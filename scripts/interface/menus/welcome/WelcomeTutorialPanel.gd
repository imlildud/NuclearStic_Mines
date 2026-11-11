# ==============================================================
# =============== WELCOME TUTORIAL PANEL =======================
# ==============================================================
# Panel that asks if the player wants to play the tutorial.
# Emits `tutorial_choice(wants_tutorial: bool)`.

extends Control

signal tutorial_choice(wants_tutorial: bool)

@onready var question_label: Label = $Card/QuestionLabel
@onready var yes_button: Button = $Card/YesButton
@onready var no_button: Button = $Card/NoButton


func _ready() -> void:
	yes_button.pressed.connect(func(): _on_choice(true))
	no_button.pressed.connect(func(): _on_choice(false))
	yes_button.mouse_entered.connect(func(): AudioManager.play_hover_sfx())
	no_button.mouse_entered.connect(func(): AudioManager.play_hover_sfx())


# Sets the localized question text.
func set_question(text: String) -> void:
	question_label.text = text


func _on_choice(wants_tutorial: bool) -> void:
	AudioManager.play_click_sfx()
	tutorial_choice.emit(wants_tutorial)
