# ==============================================================
# ======================== MAIN MENU ===========================
# ==============================================================
# Main menu scene. Handles navigation to game modes and menus.
#
# For now, only Legacy mode navigates to a Game scene (placeholder
# until Phase 3.2). Daily, Custom, Diary, Options and ID Card print
# a warning.
#
# Visual feedback:
#   - Hover  → sound + scale 1.05
#   - Click  → sound + scale 0.95 → 1.05
#   - Release → back to normal

extends Control

const GAME_SCENE := "res://scenes/game/Game.tscn"


func _ready() -> void:
	# Play menu music when the menu loads.
	AudioManager.play_menu_music(true)

	# Wire every button with hover + click feedback.
	_connect_button($MenuButtons/LegacyButton, _on_legacy_pressed)
	_connect_button($MenuButtons/DailyButton, _on_daily_pressed)
	_connect_button($MenuButtons2/CustomButton, _on_custom_pressed)
	_connect_button($BottomRow/DiaryButton, _on_diary_pressed)
	_connect_button($BottomRow/OptionsButton, _on_options_pressed)
	_connect_button($IdCardButton, _on_id_card_pressed)


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


# ======================= BUTTON HANDLERS =======================

func _on_legacy_pressed() -> void:
	AudioManager.play_click_sfx()
	push_warning("[MainMenu] Legacy mode: Game scene not implemented yet (Phase 3.2)")


func _on_daily_pressed() -> void:
	AudioManager.play_click_sfx()
	push_warning("[MainMenu] Daily mode: not implemented yet (Phase 3.4)")


func _on_custom_pressed() -> void:
	AudioManager.play_click_sfx()
	push_warning("[MainMenu] Custom mode: not implemented yet (Phase 3.4)")


func _on_diary_pressed() -> void:
	AudioManager.play_click_sfx()
	push_warning("[MainMenu] Diary: not implemented yet (Phase 3.4)")


func _on_options_pressed() -> void:
	AudioManager.play_click_sfx()
	push_warning("[MainMenu] Options: not implemented yet (Phase 3.4)")


func _on_id_card_pressed() -> void:
	AudioManager.play_click_sfx()
	push_warning("[MainMenu] ID Card: not implemented yet (Phase 3.4)")
