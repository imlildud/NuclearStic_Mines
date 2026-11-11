# ==============================================================
# ================ WELCOME AVATAR PANEL ========================
# ==============================================================
# Panel for selecting the player's avatar.
# Emits `avatar_confirmed(avatar_id)` when the player confirms.

extends Control

signal avatar_confirmed(avatar_id: int)

@onready var prompt_label: Label = $Card/PromptLabel
@onready var avatar_grid: GridContainer = $Card/AvatarGrid
@onready var confirm_button: Button = $Card/ConfirmButton

var _selected_avatar: int = 1


func _ready() -> void:
	var buttons: Array = avatar_grid.get_children()
	for i in range(buttons.size()):
		var idx: int = i + 1
		buttons[i].pressed.connect(func(): _on_avatar_selected(idx))
		buttons[i].mouse_entered.connect(func(): AudioManager.play_hover_sfx())
	confirm_button.pressed.connect(_on_confirm)
	confirm_button.mouse_entered.connect(func(): AudioManager.play_hover_sfx())
	_highlight(_selected_avatar)


# Sets the localized prompt text.
func set_prompt(text: String) -> void:
	prompt_label.text = text


# Selects an avatar by ID (1-6).
func select_avatar(avatar_id: int) -> void:
	_selected_avatar = clampi(avatar_id, 1, 6)
	_highlight(_selected_avatar)


func _on_avatar_selected(idx: int) -> void:
	AudioManager.play_hover_sfx()
	_selected_avatar = idx
	_highlight(idx)


func _on_confirm() -> void:
	AudioManager.play_click_sfx()
	avatar_confirmed.emit(_selected_avatar)


func _highlight(avatar_id: int) -> void:
	var buttons: Array = avatar_grid.get_children()
	for i in range(buttons.size()):
		var idx: int = i + 1
		buttons[i].modulate = Color(1.2, 1.2, 1.2, 1.0) if idx == avatar_id else Color(1.0, 1.0, 1.0, 1.0)
