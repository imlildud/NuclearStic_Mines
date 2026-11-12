# ==============================================================
# ===================== SEED INPUT MODAL =======================
# ==============================================================
# Modal that asks the player for a seed number (Custom mode).
# Mirrors PunchcardPanel.showSeedInputModal from the JS original:
# the input is prefilled with the current seed, and pressing OK
# returns the parsed value (or a fresh random seed if invalid).

extends CanvasLayer

signal seed_confirmed(seed: int)
signal cancelled

const FONT_PATH := "res://assets/font/Shampoos-Regular.ttf"

@onready var _title: Label = $Center/VBox/TitleLabel
@onready var _input: LineEdit = $Center/VBox/SeedInput
@onready var _cancel_button: Button = $Center/VBox/Buttons/CancelButton
@onready var _ok_button: Button = $Center/VBox/Buttons/OkButton

var _locale_manager = null


func _ready() -> void:
	visible = false
	var font: FontFile = load(FONT_PATH)
	_title.add_theme_font_override("font", font)
	_title.add_theme_font_size_override("font_size", 32)
	_title.add_theme_color_override("font_color", Color(1, 1, 1, 1))
	_input.add_theme_font_override("font", font)
	_input.add_theme_font_size_override("font_size", 28)
	_cancel_button.add_theme_font_override("font", font)
	_cancel_button.add_theme_font_size_override("font_size", 24)
	_ok_button.add_theme_font_override("font", font)
	_ok_button.add_theme_font_size_override("font_size", 24)

	_cancel_button.pressed.connect(_on_cancel)
	_ok_button.pressed.connect(_on_ok)
	_input.text_submitted.connect(func(_t): _on_ok())


func show_modal(current_seed: int, locale_manager) -> void:
	_locale_manager = locale_manager
	var title_text: String = "Enter seed number:"
	if locale_manager != null:
		var t = locale_manager.get_translation("menu.punchcard.enterSeed")
		if t is String and t != "":
			title_text = t
	_title.text = title_text

	_cancel_button.text = _get_text("ui.cancel", "Cancel")
	_ok_button.text = _get_text("ui.ok", "OK")

	_input.text = str(current_seed)
	_input.max_length = 10
	visible = true
	_input.grab_focus()
	_input.select_all()


func _on_ok() -> void:
	var text: String = _input.text.strip_edges()
	var new_seed: int = 0
	if text.is_valid_int():
		new_seed = int(text)
	else:
		new_seed = randi_range(1, 999999999)
	visible = false
	seed_confirmed.emit(new_seed)


func _on_cancel() -> void:
	visible = false
	cancelled.emit()


func _get_text(key: String, fallback: String) -> String:
	if _locale_manager != null:
		var r = _locale_manager.get_translation(key)
		if r is String and r != "":
			return r
	return fallback
