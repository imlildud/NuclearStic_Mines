# ==============================================================
# ======================== MAIN MENU ===========================
# ==============================================================
# Main menu scene. Handles navigation to game modes and menus.
#
# Mode buttons (Legacy / Daily / Custom) open the PunchcardPanel
# overlay in the corresponding mode. Close button inside the
# punchcard closes it.
#
# Options, Diary and ID Card are placeholders for now.

extends Control

const PUNCHCARD_SCENE := "res://scenes/menu/PunchcardPanel.tscn"

var _punchcard: Control = null


# ======================= LIFECYCLE =======================

func _ready() -> void:
	# Play menu music when the menu loads.
	AudioManager.play_menu_music(true)

	# Instance the punchcard as a hidden child.
	_punchcard = load(PUNCHCARD_SCENE).instantiate()
	add_child(_punchcard)
	_punchcard.visible = false

	# Connect the punchcard's close signal.
	if _punchcard.has_signal("closed"):
		_punchcard.closed.connect(_on_punchcard_closed)

	# Wire every main-menu button.
	_connect_button($MenuButtons/LegacyButton, _on_legacy_pressed)
	_connect_button($MenuButtons/DailyButton, _on_daily_pressed)
	_connect_button($MenuButtons2/CustomButton, _on_custom_pressed)
	_connect_button($BottomRow/DiaryButton, _on_diary_pressed)
	_connect_button($BottomRow/OptionsButton, _on_options_pressed)
	_connect_button($IdCardButton, _on_id_card_pressed)


# ======================= BUTTON FEEDBACK =======================

# Connects a button to its handler and adds hover/click feedback.
func _connect_button(button: TextureButton, handler: Callable) -> void:
	button.pressed.connect(handler)
	button.mouse_entered.connect(func():
		AudioManager.play_hover_sfx()
		_tween_button(button, 1.05, 1.15)
	)
	button.mouse_exited.connect(func():
		_tween_button(button, 1.0, 1.0)
	)
	button.button_down.connect(func():
		_tween_button(button, 0.95, 0.85)
	)
	button.button_up.connect(func():
		_tween_button(button, 1.05, 1.15)
	)


# Animates a button's scale and brightness.
func _tween_button(button: TextureButton, scale_value: float, brightness: float) -> void:
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(button, "scale", Vector2(scale_value, scale_value), 0.12)
	button.modulate = Color(brightness, brightness, brightness, 1.0)


# ======================= PUNCHCARD =======================

# Opens the punchcard in the given mode.
func _open_punchcard(mode: String) -> void:
	if _punchcard == null:
		push_error("[MainMenu] Punchcard not instanced")
		return
	_punchcard.open(mode)


# Called when the punchcard emits its "closed" signal.
func _on_punchcard_closed() -> void:
	AudioManager.play_click_sfx()


# ======================= BUTTON HANDLERS =======================

func _on_legacy_pressed() -> void:
	AudioManager.play_click_sfx()
	_open_punchcard("legacy")


func _on_daily_pressed() -> void:
	AudioManager.play_click_sfx()
	_open_punchcard("daily")


func _on_custom_pressed() -> void:
	AudioManager.play_click_sfx()
	_open_punchcard("custom")


func _on_diary_pressed() -> void:
	AudioManager.play_click_sfx()
	push_warning("[MainMenu] Diary: not implemented yet (Phase 3.4)")


func _on_options_pressed() -> void:
	AudioManager.play_click_sfx()
	push_warning("[MainMenu] Options: not implemented yet (Phase 3.4)")


func _on_id_card_pressed() -> void:
	AudioManager.play_click_sfx()
	push_warning("[MainMenu] ID Card: not implemented yet (Phase 3.4)")
