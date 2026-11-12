# ==============================================================
# =============== INVENTORY FULL POPUP =========================
# ==============================================================
# Shown when the player's inventory is full at a treasure tile.
# 20% of the time the icon is "trash" and the player can choose to
# remove a keychain (opens TrashSelectionPopup) or cancel.
# Otherwise it's a "nothing found" message with a single OK button.
#
# Differs from the JS original by adding a Cancel button
# (per user request).

extends CanvasLayer

signal trash_requested
signal cancelled
signal acknowledged

const FONT_PATH := "res://assets/font/Shampoos-Regular.ttf"
const TRASH_ICON := "res://assets/hud/game/keychains/trash.png"
const NONE_ICON := "res://assets/hud/game/keychains/keychain_none.png"

@onready var _icon: TextureRect = $Center/VBox/Icon
@onready var _message: Label = $Center/VBox/MessageLabel
@onready var _trash_button: Button = $Center/VBox/Buttons/TrashButton
@onready var _cancel_button: Button = $Center/VBox/Buttons/CancelButton

var _is_trash: bool = false


func _ready() -> void:
	visible = false
	_trash_button.pressed.connect(_on_trash_pressed)
	_cancel_button.pressed.connect(_on_cancel_pressed)

	var font: FontFile = load(FONT_PATH)
	_message.add_theme_font_override("font", font)
	_message.add_theme_font_size_override("font_size", 28)
	_trash_button.add_theme_font_override("font", font)
	_trash_button.add_theme_font_size_override("font_size", 22)
	_cancel_button.add_theme_font_override("font", font)
	_cancel_button.add_theme_font_size_override("font_size", 22)


# Shows the popup in either "trash" or "none" mode.
func show_popup(is_trash: bool, locale_manager) -> void:
	_is_trash = is_trash

	if is_trash:
		_icon.texture = load(TRASH_ICON)
		_message.text = _get_text(locale_manager, "bundle.trashFound", "You found trash! Choose a keychain to throw away.")
		_trash_button.text = _get_text(locale_manager, "bundle.trashButton", "Throw a keychain")
		_trash_button.visible = true
		_cancel_button.text = _get_text(locale_manager, "ui.cancel", "Cancel")
	else:
		_icon.texture = load(NONE_ICON)
		_message.text = _get_text(locale_manager, "bundle.nothingFound", "You found nothing...")
		_trash_button.visible = false
		_cancel_button.text = _get_text(locale_manager, "ui.ok", "OK")

	visible = true


func close() -> void:
	visible = false


func _on_trash_pressed() -> void:
	AudioManager.play_click_sfx()
	trash_requested.emit()


func _on_cancel_pressed() -> void:
	AudioManager.play_click_sfx()
	cancelled.emit()
	close()


func _get_text(lm, key: String, fallback: String) -> String:
	if lm != null:
		var r = lm.get_translation(key)
		if r is String and r != "":
			return r
	return fallback
