# ==============================================================
# ================== KEYCHAIN SELECTOR =========================
# ==============================================================
# Custom mode keychain picker. Shows all keychains except the
# Daily-excluded ones (fortune, greed, stuffed). The player can
# select up to `max_selection` (default 5) and confirm the list.
#
# Uses KeychainCard for each entry. Selection feedback is rendered
# by a `Panel` overlay created per card (SelectionBorder), so the
# KeychainCard itself stays generic and reusable. The border is
# independent of the card's modulate/scale tweens (hover, float,
# aura pulse), which means it persists until the player toggles it.

extends CanvasLayer

signal confirmed(selected_ids: Array)
signal cancelled

const CARD_SCENE := "res://scenes/menu/bundle/KeychainCard.tscn"
const FONT_PATH := "res://assets/font/Shampoos-Regular.ttf"
const EXCLUDED_IDS: Array = ["fortune", "greed", "stuffed"]

@onready var _overlay: ColorRect = $Overlay
@onready var _title: Label = $Center/VBox/TitleLabel
@onready var _counter: Label = $Center/VBox/CounterLabel
@onready var _grid: GridContainer = $Center/VBox/ScrollContainer/Grid
@onready var _reset_button: Button = $Center/VBox/Buttons/ResetButton
@onready var _confirm_button: Button = $Center/VBox/Buttons/ConfirmButton

var _locale_manager = null
var _bundle_manager = null
var _selected: Array = []
var _max_selection: int = 5
var _cards: Dictionary = {}       # keychain_id -> KeychainCard node
var _borders: Dictionary = {}     # keychain_id -> SelectionBorder (Panel)


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
	_overlay.gui_input.connect(_on_overlay_gui_input)


# Public: shows the selector. `initial_selection` is the current
# custom keychain list. Requires a BundleManager reference to list
# all keychains, and a LocaleManager for translated strings.
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


# ======================= GRID =======================

func _build_grid() -> void:
	for child in _grid.get_children():
		child.queue_free()
	_cards.clear()
	_borders.clear()

	if _bundle_manager == null:
		return

	for k in _bundle_manager.get_all_keychains():
		var id: String = k["id"]
		if EXCLUDED_IDS.has(id):
			continue

		var card: Control = load(CARD_SCENE).instantiate()
		_grid.add_child(card)
		card.setup(k, _locale_manager, "bundle")
		card.pressed.connect(_on_card_pressed.bind(id))

		# The SelectionBorder lives in the selector, not the card.
		# It sits on top of the card and ignores mouse input so the
		# card still receives hover/click. It persists through all
		# card tweens because it only touches its own StyleBoxFlat.
		var border: Panel = _create_selection_border()
		card.add_child(border)
		border.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		border.offset_left = -6.0
		border.offset_top = -6.0
		border.offset_right = 6.0
		border.offset_bottom = 6.0

		_cards[id] = card
		_borders[id] = border
		_set_border_visible(border, _selected.has(id))


# Creates a Panel with a rounded, transparent StyleBoxFlat that we
# toggle between "selected" (white outline + green glow) and hidden.
func _create_selection_border() -> Panel:
	var panel := Panel.new()
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0, 0, 0, 0)
	style.border_width_left = 3
	style.border_width_top = 3
	style.border_width_right = 3
	style.border_width_bottom = 3
	style.border_color = Color(1, 1, 1, 0)
	style.corner_radius_top_left = 12
	style.corner_radius_top_right = 12
	style.corner_radius_bottom_right = 12
	style.corner_radius_bottom_left = 12
	style.shadow_size = 0
	style.shadow_color = Color(0, 0, 0, 0)
	style.shadow_offset = Vector2.ZERO

	panel.add_theme_stylebox_override("panel", style)
	return panel


func _set_border_visible(border: Panel, visible_state: bool) -> void:
	var style: StyleBoxFlat = border.get_theme_stylebox("panel")
	if style == null:
		return

	if visible_state:
		# Selected: white outline only, fully transparent interior.
		style.bg_color = Color(0, 0, 0, 0)
		style.border_color = Color(1, 1, 1, 0.9)
		style.border_width_left = 2
		style.border_width_top = 2
		style.border_width_right = 2
		style.border_width_bottom = 2
		style.shadow_color = Color(0, 0, 0, 0)
		style.shadow_size = 0
	else:
		# Unselected: everything transparent.
		style.bg_color = Color(0, 0, 0, 0)
		style.border_color = Color(1, 1, 1, 0)
		style.border_width_left = 2
		style.border_width_top = 2
		style.border_width_right = 2
		style.border_width_bottom = 2
		style.shadow_color = Color(0, 0, 0, 0)
		style.shadow_size = 0


# ======================= SELECTION =======================

func _on_card_pressed(keychain_id: String) -> void:
	var idx: int = _selected.find(keychain_id)
	if idx > -1:
		_selected.remove_at(idx)
		_set_border_visible(_borders[keychain_id], false)
	else:
		if _selected.size() >= _max_selection:
			return
		_selected.append(keychain_id)
		_set_border_visible(_borders[keychain_id], true)
	_update_counter()


func _update_counter() -> void:
	var template: String = _get_text("menu.punchcard.keychainSelected", "Selected: {count}")
	_counter.text = template.replace("{count}", str(_selected.size()))


# ======================= BUTTONS =======================

func _on_reset() -> void:
	AudioManager.play_click_sfx()
	_selected.clear()
	for id in _borders.keys():
		_set_border_visible(_borders[id], false)
	_update_counter()


func _on_confirm() -> void:
	AudioManager.play_click_sfx()
	visible = false
	confirmed.emit(_selected)


func _on_overlay_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		visible = false
		cancelled.emit()


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		visible = false
		cancelled.emit()
		get_viewport().set_input_as_handled()


# ======================= UTILS =======================

func _get_text(key: String, fallback: String) -> String:
	if _locale_manager != null:
		var r = _locale_manager.get_translation(key)
		if r is String and r != "":
			return r
	return fallback
