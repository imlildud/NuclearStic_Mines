# ==============================================================
# =============== TRASH SELECTION POPUP ========================
# ==============================================================
# Grid of the player's current inventory. The player picks one
# keychain to remove (or cancels). Differs from the JS original
# by adding a Cancel button (per user request).

extends CanvasLayer

signal keychain_selected(keychain_id: String)
signal cancelled

const CARD_SCENE := "res://scenes/menu/bundle/KeychainCard.tscn"
const FONT_PATH := "res://assets/font/Shampoos-Regular.ttf"

@onready var _title: Label = $Center/VBox/TitleLabel
@onready var _grid: GridContainer = $Center/VBox/Grid
@onready var _cancel_button: Button = $Center/VBox/CancelButton

var _bundle_manager = null
var _locale_manager = null


func _ready() -> void:
	visible = false
	_cancel_button.pressed.connect(_on_cancel_pressed)

	var font: FontFile = load(FONT_PATH)
	_title.add_theme_font_override("font", font)
	_title.add_theme_font_size_override("font_size", 28)
	_cancel_button.add_theme_font_override("font", font)
	_cancel_button.add_theme_font_size_override("font_size", 22)


# Shows the grid for the given inventory IDs.
# Requires a BundleManager reference to look up rarity per keychain.
func show_popup(inventory: Array, bundle_manager, locale_manager) -> void:
	_bundle_manager = bundle_manager
	_locale_manager = locale_manager

	_title.text = _get_text(locale_manager, "bundle.trashTitle", "Choose a keychain to remove:")
	_cancel_button.text = _get_text(locale_manager, "ui.cancel", "Cancel")

	_clear_grid()
	var all_keychains: Array = bundle_manager.get_all_keychains() if bundle_manager != null else []

	for keychain_id in inventory:
		var data: Dictionary = _find_by_id(all_keychains, keychain_id)
		if data.is_empty():
			continue
		var card: Control = load(CARD_SCENE).instantiate()
		_grid.add_child(card)
		card.setup(data, locale_manager, "bundle")
		card.pressed.connect(_on_card_pressed.bind(keychain_id))

	visible = true


func close() -> void:
	visible = false
	_clear_grid()


func _on_card_pressed(keychain_id: String) -> void:
	AudioManager.play_click_sfx()
	keychain_selected.emit(keychain_id)
	close()


func _on_cancel_pressed() -> void:
	AudioManager.play_click_sfx()
	cancelled.emit()
	close()


func _find_by_id(list: Array, keychain_id: String) -> Dictionary:
	for k in list:
		if k.get("id", "") == keychain_id:
			return k
	return {}


func _clear_grid() -> void:
	for child in _grid.get_children():
		child.queue_free()


func _get_text(lm, key: String, fallback: String) -> String:
	if lm != null:
		var r = lm.get_translation(key)
		if r is String and r != "":
			return r
	return fallback
