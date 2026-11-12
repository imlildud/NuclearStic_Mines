# ==============================================================
# ================== KEYCHAIN SELECTOR =========================
# ==============================================================
# Custom mode keychain picker. Shows all keychains except the
# Daily-excluded ones (fortune, greed, stuffed). The player can
# select up to `max_selection` (default 5) and confirm the list.
#
# Uses KeychainCard for each entry, with a selected/unselected
# visual state. Mirrors KeychainSelector.js.

extends CanvasLayer

signal confirmed(selected_ids: Array)
signal cancelled

const CARD_SCENE := "res://scenes/menu/bundle/KeychainCard.tscn"
const FONT_PATH := "res://assets/font/Shampoos-Regular.ttf"
const EXCLUDED_IDS: Array = ["fortune", "greed", "stuffed"]

@onready var _title: Label = $Center/VBox/TitleLabel
@onready var _counter: Label = $Center/VBox/CounterLabel
@onready var _grid: GridContainer = $Center/VBox/ScrollContainer/Grid
@onready var _reset_button: Button = $Center/VBox/Buttons/ResetButton
@onready var _confirm_button: Button = $Center/VBox/Buttons/ConfirmButton

var _locale_manager = null
var _bundle_manager = null
var _selected: Array = []
var _max_selection: int = 5
var _cards: Dictionary = {}  # keychain_id -> card node


func _ready() -> void:
	visible = false
	var font: FontFile = load(FONT_PATH)
	_title.add_theme_font_override("font", font)
	_title.add_theme_font_size_override("font_size", 32)
	_title.add_theme_color_override("font_color", Color(1, 1, 1, 1))
	_counter.add_theme_font_override("font", font)
	_counter.add_theme_font_size_override("font_size", 22)
	_counter.add_theme_color_override("font_color", Color(0.75, 0.75, 0.75, 1))
	_reset_button.add_theme_font_override("font", font)
	_reset_button.add_theme_font_size_override("font_size", 22)
	_confirm_button.add_theme_font_override("font", font)
	_confirm_button.add_theme_font_size_override("font_size", 22)

	_reset_button.pressed.connect(_on_reset)
	_confirm_button.pressed.connect(_on_confirm)


# Shows the selector. `initial_selection` is the current custom
# keychain list. `on_confirm` receives the new selected Array.
func show_selector(initial_selection: Array, bundle_manager, locale_manager) -> void:
	_bundle_manager = bundle_manager
	_locale_manager = locale_manager
	_selected = initial_selection.duplicate()

	_title.text = _get_text("menu.punchcard.selectKeychains", "Select your keychains:")
	_reset_button.text = _get_text("menu.punchcard.keychainReset", "Reset")
	_confirm_button.text = _get_text("menu.punchcard.keychainConfirm", "Confirm")
	_update_counter()

	_build_grid()
	visible = true


func _build_grid() -> void:
	for child in _grid.get_children():
		child.queue_free()
	_cards.clear()

	if _bundle_manager == null:
		return

	for k in _bundle_manager.get_all_keychains():
		var id: String = k["id"]
		if EXCLUDED_IDS.has(id):
			continue

		var card: Control = load(CARD_SCENE).instantiate()
		_grid.add_child(card)
		card.setup(k, _locale_manager, "bundle")
		# Start selected state from the current selection.
		var is_selected: bool = _selected.has(id)
		_apply_card_state(card, is_selected)
		card.pressed.connect(_on_card_pressed.bind(id))
		_cards[id] = card


func _on_card_pressed(keychain_id: String) -> void:
	var idx: int = _selected.find(keychain_id)
	if idx > -1:
		_selected.remove_at(idx)
		_apply_card_state(_cards[keychain_id], false)
	else:
		if _selected.size() >= _max_selection:
			return
		_selected.append(keychain_id)
		_apply_card_state(_cards[keychain_id], true)
	_update_counter()


# Visual state: selected = green tint + slightly larger card.
func _apply_card_state(card: Control, selected: bool) -> void:
	if selected:
		card.self_modulate = Color(0.75, 1.0, 0.75, 1.0)  # green tint
		card.scale = Vector2(1.02, 1.02)
	else:
		card.self_modulate = Color(1, 1, 1, 1)
		card.scale = Vector2.ONE


func _update_counter() -> void:
	var template: String = _get_text("menu.punchcard.keychainSelected", "Selected: {count}")
	_counter.text = template.replace("{count}", str(_selected.size()))


func _on_reset() -> void:
	_selected.clear()
	for id in _cards.keys():
		_apply_card_state(_cards[id], false)
	_update_counter()


func _on_confirm() -> void:
	visible = false
	confirmed.emit(_selected)


func _get_text(key: String, fallback: String) -> String:
	if _locale_manager != null:
		var r = _locale_manager.get_translation(key)
		if r is String and r != "":
			return r
	return fallback
