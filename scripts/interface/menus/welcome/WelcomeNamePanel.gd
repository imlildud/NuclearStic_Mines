# ==============================================================
# ================== WELCOME NAME PANEL ========================
# ==============================================================
# Panel for entering the player's name.
# Emits `name_submitted(name)` when the player confirms.

extends Control

signal name_submitted(player_name: String)

@onready var prompt_label: Label = $Card/PromptLabel
@onready var name_input: LineEdit = $Card/NameInput
@onready var continue_button: Button = $Card/ContinueButton


func _ready() -> void:
	continue_button.pressed.connect(_on_continue)
	name_input.text_submitted.connect(_on_text_submitted)
	continue_button.mouse_entered.connect(func(): AudioManager.play_hover_sfx())
	ButtonFeedback.attach_all(self)


# Sets the localized prompt text.
func set_prompt(text: String) -> void:
	prompt_label.text = text


# Prefills the input with the current name (name-edit flow, mirroring
# the web editor: maxlength 20, text selected, focused).
func set_current_name(current_name: String) -> void:
	name_input.text = current_name
	name_input.max_length = 14
	name_input.grab_focus()
	name_input.select_all()


func _on_continue() -> void:
	var name: String = name_input.text.strip_edges()
	if name == "":
		return
	AudioManager.play_click_sfx()
	name_submitted.emit(name)


func _on_text_submitted(_text: String) -> void:
	_on_continue()
