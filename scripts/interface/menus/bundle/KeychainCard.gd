# ==============================================================
# ===================== KEYCHAIN CARD ==========================
# ==============================================================
# Reusable keychain display: aura + icon + rarity badge + name.
#
# Used by BundlePopup, TrashSelectionPopup, and (optionally) the HUD.
# Plays idle animations (aura pulse + icon float) and hover/click
# feedback. Emits `pressed` when the player clicks the card.

extends Control

signal pressed

const FONT_PATH := "res://assets/font/Shampoos-Regular.ttf"
const AURA_PATH := "res://assets/hud/game/keychains/%s_aura.png"
const BADGE_PATH := "res://assets/hud/game/keychains/%s.png"
const ICON_PATH := "res://assets/hud/game/keychains/keychain_%s.png"

# Maps rarity to the asset name used for the aura and badge.
# Note: "unheard" uses "outrageous" as the file prefix (matches JS).
const RARITY_ASSET: Dictionary = {
	"typical":     {"bg": "typical",     "color": Color(0.545, 0.451, 0.333)},
	"abnormal":    {"bg": "abnormal",    "color": Color(0.910, 0.463, 0.176)},
	"extravagant": {"bg": "extravagant", "color": Color(0.608, 0.349, 0.714)},
	"unheard":     {"bg": "outrageous",  "color": Color(0.753, 0.224, 0.169)},
	"cursed":      {"bg": "cursed",      "color": Color(0.102, 0.102, 0.102)}
}

@onready var _icon_wrapper: Control = $IconWrapper
@onready var _aura: TextureRect = $IconWrapper/Aura
@onready var _icon: TextureRect = $IconWrapper/Icon
@onready var _badge_bg: TextureRect = $RarezaBadge/BadgeBg
@onready var _badge_label: Label = $RarezaBadge/BadgeLabel
@onready var _name_label: Label = $NameLabel

var keychain_id: String = ""
var keychain_rareza: String = "typical"

var _aura_tween: Tween = null
var _icon_tween: Tween = null
var _base_scale: Vector2 = Vector2.ONE
var _hovered: bool = false


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	mouse_entered.connect(_on_mouse_entered)
	mouse_exited.connect(_on_mouse_exited)
	_gui_input_handler()


func _gui_input_handler() -> void:
	# Set up a one-time connection for click.
	if not gui_input.is_connected(_on_gui_input):
		gui_input.connect(_on_gui_input)


# Public: sets up the card with the given keychain data.
# `locale_manager` is used to fetch translated name / rarity.
# `card_size` is "bundle" or "info" (affects font sizes and paddings).
func setup(data: Dictionary, locale_manager, card_size: String = "bundle") -> void:
	keychain_id = data.get("id", "")
	keychain_rareza = data.get("rareza", "typical")

	var rarity: Dictionary = RARITY_ASSET.get(keychain_rareza, RARITY_ASSET["typical"])
	var asset_bg: String = rarity["bg"]

	_aura.texture = load(AURA_PATH % asset_bg)
	_badge_bg.texture = load(BADGE_PATH % asset_bg)
	_icon.texture = load(ICON_PATH % keychain_id)

	var name_text: String = keychain_id
	var rarity_text: String = keychain_rareza
	if locale_manager != null:
		var n = locale_manager.get_translation("keychain.%s.name" % keychain_id)
		if n is String and n != "":
			name_text = n
		var r = locale_manager.get_translation("bundle.rareza.%s" % keychain_rareza)
		if r is String and r != "":
			rarity_text = r

	_name_label.text = name_text
	_badge_label.text = rarity_text

	_apply_sizes(card_size)
	_start_idle_animations()


func _apply_sizes(card_size: String) -> void:
	var font: FontFile = load(FONT_PATH)
	_name_label.add_theme_font_override("font", font)
	_badge_label.add_theme_font_override("font", font)

	if card_size == "info":
		custom_minimum_size = Vector2(220, 300)
		_icon_wrapper.offset_bottom = 200.0
		RarezaBadge_fix(80.0)
		_name_label.add_theme_font_size_override("font_size", 36)
		_badge_label.add_theme_font_size_override("font_size", 26)
		_name_label.offset_top = -52.0
		_name_label.offset_bottom = 0.0
	else:
		custom_minimum_size = Vector2(300, 320)
		_icon_wrapper.offset_bottom = 200.0
		RarezaBadge_fix(65.0, 75.0)
		_name_label.add_theme_font_size_override("font_size", 28)
		_badge_label.add_theme_font_size_override("font_size", 20)
		_name_label.offset_top = -70.0
		_name_label.offset_bottom = -25.0


# Adjusts the badge container's height from the bottom.
func RarezaBadge_fix(height: float, bottom_margin: float = 28.0) -> void:
	var badge: Control = $RarezaBadge
	badge.offset_top = -height - bottom_margin
	badge.offset_bottom = -bottom_margin


# ======================= ANIMATIONS =======================

func _start_idle_animations() -> void:
	_stop_idle_animations()

	_aura.pivot_offset = _aura.size / 2.0
	_aura.modulate.a = 0.5

	_aura_tween = create_tween().set_loops()
	_aura_tween.set_parallel(true)
	_aura_tween.tween_property(_aura, "scale", Vector2(1.15, 1.15), 1.5).set_trans(Tween.TRANS_SINE)
	_aura_tween.tween_property(_aura, "modulate:a", 0.8, 1.5).set_trans(Tween.TRANS_SINE)
	_aura_tween.chain().tween_property(_aura, "scale", Vector2.ONE, 1.5).set_trans(Tween.TRANS_SINE)
	_aura_tween.parallel().tween_property(_aura, "modulate:a", 0.5, 1.5).set_trans(Tween.TRANS_SINE)

	_icon.pivot_offset = _icon.size / 2.0
	_icon_tween = create_tween().set_loops()
	_icon_tween.set_parallel(true)
	_icon_tween.tween_property(_icon, "position:y", _icon.position.y - 8.0, 1.25).set_trans(Tween.TRANS_SINE)
	_icon_tween.tween_property(_icon, "rotation", deg_to_rad(3.0), 1.25).set_trans(Tween.TRANS_SINE)
	_icon_tween.chain().tween_property(_icon, "position:y", _icon.position.y, 1.25).set_trans(Tween.TRANS_SINE)
	_icon_tween.parallel().tween_property(_icon, "rotation", 0.0, 1.25).set_trans(Tween.TRANS_SINE)


func _stop_idle_animations() -> void:
	if _aura_tween != null and _aura_tween.is_valid():
		_aura_tween.kill()
		_aura_tween = null
	if _icon_tween != null and _icon_tween.is_valid():
		_icon_tween.kill()
		_icon_tween = null


# ======================= HOVER / CLICK =======================

func _on_mouse_entered() -> void:
	_hovered = true
	AudioManager.play_hover_sfx()
	_animate_scale(1.08)


func _on_mouse_exited() -> void:
	_hovered = false
	_animate_scale(1.0)


func _on_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		pressed.emit()


func _animate_scale(target: float) -> void:
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(self, "scale", Vector2(target, target), 0.12)
	var brightness: float = 1.25 if target > 1.0 else 1.0
	tween.tween_property(self, "modulate", Color(brightness, brightness, brightness, 1.0), 0.12)


# Public: plays the "taken" fade and disables input.
# `on_done` is called after the animation (used to close the popup).
func play_taken(on_done: Callable = Callable()) -> void:
	_stop_idle_animations()
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(self, "modulate:a", 0.3, 0.2)
	tween.tween_property(self, "scale", Vector2(0.8, 0.8), 0.2)
	tween.chain().tween_callback(func():
		if on_done.is_valid():
			on_done.call()
	)
