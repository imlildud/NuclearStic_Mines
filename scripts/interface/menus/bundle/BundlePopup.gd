# ==============================================================
# ====================== BUNDLE POPUP ==========================
# ==============================================================
# Displays the bundle image and the keychain grid.
# Mirrors BundleUIManager.js: the player clicks the bundle image
# to open it, then picks ONE keychain to take. The popup closes
# when a keychain is taken (no cancel, matching the JS original).
#
# The BundleUIManager (RefCounted) owns this scene: it instantiates
# it, calls `show_bundle(...)`, and listens to `keychain_taken`.

extends CanvasLayer

signal keychain_taken(keychain: Dictionary)
signal closed

const CARD_SCENE := "res://scenes/menu/bundle/KeychainCard.tscn"
const BUNDLE_PATH := "res://assets/hud/game/bundles/%s.png"
const BUNDLE_OPEN_PATH := "res://assets/hud/game/bundles/%s_open.png"

@onready var _overlay: ColorRect = $Overlay
@onready var _bundle_image: TextureRect = $Center/VBox/BundleImage
@onready var _grid: GridContainer = $Center/VBox/KeychainGrid

var _tier_key: String = ""
var _keychains: Array = []
var _locale_manager = null
var _card_scene: PackedScene = null
var _is_open: bool = false


func _ready() -> void:
	_card_scene = load(CARD_SCENE)
	_bundle_image.gui_input.connect(_on_bundle_image_gui_input)
	_bundle_image.mouse_entered.connect(_on_bundle_hover)
	_bundle_image.mouse_exited.connect(_on_bundle_unhover)
	visible = false


# Shows the bundle in the "closed" state (image visible, grid hidden).
func show_bundle(tier_key: String, keychains: Array, locale_manager) -> void:
	_tier_key = tier_key
	_keychains = keychains
	_locale_manager = locale_manager
	_is_open = true

	_bundle_image.texture = load(BUNDLE_PATH % tier_key)
	_bundle_image.visible = true
	_bundle_image.modulate = Color(1, 1, 1, 1)
	_bundle_image.scale = Vector2.ONE
	_grid.visible = false
	_clear_grid()
	visible = true


# Called when the player clicks the bundle image.
func _on_bundle_image_gui_input(event: InputEvent) -> void:
	if not _is_open:
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_open_bundle()


func _open_bundle() -> void:
	_bundle_image.texture = load(BUNDLE_OPEN_PATH % _tier_key)
	AudioManager.play_click_sfx()

	# Wait 300ms (matching JS), then swap to the grid.
	await get_tree().create_timer(0.3).timeout
	if not _is_open:
		return
	_bundle_image.visible = false
	_show_keychains()


func _show_keychains() -> void:
	_clear_grid()
	_grid.columns = 2
	var count: int = _keychains.size()

	for i in range(count):
		var data: Dictionary = _keychains[i]
		var card: Control = _card_scene.instantiate()
		_grid.add_child(card)
		card.setup(data, _locale_manager, "bundle")
		card.pressed.connect(_on_card_pressed.bind(data, card))

	_grid.visible = true


func _clear_grid() -> void:
	for child in _grid.get_children():
		child.queue_free()


func _on_card_pressed(data: Dictionary, card: Control) -> void:
	if not _is_open:
		return
	# Mark the card as taken and emit the signal.
	card.play_taken(func():
		_is_open = false
		visible = false
		keychain_taken.emit(data)
		closed.emit()
	)


# ======================= HOVER FEEDBACK =======================

func _on_bundle_hover() -> void:
	AudioManager.play_hover_sfx()
	var tween := create_tween()
	tween.tween_property(_bundle_image, "scale", Vector2(1.05, 1.05), 0.12)
	tween.parallel().tween_property(_bundle_image, "modulate", Color(1.25, 1.25, 1.25, 1), 0.12)


func _on_bundle_unhover() -> void:
	var tween := create_tween()
	tween.tween_property(_bundle_image, "scale", Vector2.ONE, 0.12)
	tween.parallel().tween_property(_bundle_image, "modulate", Color(1, 1, 1, 1), 0.12)
