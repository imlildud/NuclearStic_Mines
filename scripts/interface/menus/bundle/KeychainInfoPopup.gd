# ==============================================================
# ================== KEYCHAIN INFO POPUP =======================
# ==============================================================
# Shows a large KeychainCard plus the description below it.
# Click outside or press ESC to close.
# Mirrors KeychainUIManager.js layout.

extends CanvasLayer

const CARD_SCENE := "res://scenes/menu/bundle/KeychainCard.tscn"
const FONT_PATH := "res://assets/font/Shampoos-Regular.ttf"

@onready var _overlay: ColorRect = $Overlay
@onready var _card_host: Control = $Center/VBox/CardHost
@onready var _desc_label: Label = $Center/VBox/DescriptionLabel

var _card: Control = null


func _ready() -> void:
	visible = false
	_overlay.gui_input.connect(_on_overlay_gui_input)

	var font: FontFile = load(FONT_PATH)
	_desc_label.add_theme_font_override("font", font)
	_desc_label.add_theme_font_size_override("font_size", 24)
	_desc_label.add_theme_color_override("font_color", Color(0.75, 0.75, 0.75, 1))


func show_info(keychain_data: Dictionary, locale_manager) -> void:
	# Rebuild the card each time (simplest and matches JS rebuilds).
	if _card != null:
		_card.queue_free()
		_card = null

	_card = load(CARD_SCENE).instantiate()
	_card_host.add_child(_card)
	_card.setup(keychain_data, locale_manager, "info")

	var description: String = ""
	if locale_manager != null:
		var d = locale_manager.get_translation("keychain.%s.description" % keychain_data["id"])
		if d is String:
			description = d
	_desc_label.text = description

	visible = true
	AudioManager.play_click_sfx()


func close() -> void:
	visible = false
	if _card != null:
		_card.queue_free()
		_card = null


func _on_overlay_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		close()


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		close()
		get_viewport().set_input_as_handled()
