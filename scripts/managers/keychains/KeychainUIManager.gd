# ==============================================================
# ==================== KEYCHAIN UI MANAGER =====================
# ==============================================================
# Orchestrator for the info popup. Instantiates KeychainInfoPopup,
# passes the keychain data, and handles open/close state.
#
# Replaces the previous stub version. The public API is unchanged:
#   - show_keychain_info(keychain_id)
#   - close_popup()

extends RefCounted
class_name KeychainUIManager

const INFO_POPUP_SCENE := "res://scenes/menu/bundle/KeychainInfoPopup.tscn"

var game_manager = null
var audio_manager = null
var locale_manager = null
var is_open: bool = false

# Rarity -> asset / color mapping (used by external callers that
# need to display rarity data, e.g. the HUD). The popup scene
# itself uses KeychainCard's own RARITY_ASSET table.
var rareza_map: Dictionary = {
	"typical":     {"bg": "typical",     "color": "#8B7355", "borderColor": "#8B7355"},
	"abnormal":    {"bg": "abnormal",    "color": "#E8762D", "borderColor": "#E8762D"},
	"extravagant": {"bg": "extravagant", "color": "#9B59B6", "borderColor": "#9B59B6"},
	"unheard":     {"bg": "outrageous",  "color": "#C0392B", "borderColor": "#C0392B"},
	"cursed":      {"bg": "cursed",      "color": "#1A1A1A", "borderColor": "#1A1A1A"}
}

var _popup: CanvasLayer = null


func _init(gm = null, audio = null) -> void:
	game_manager = gm
	audio_manager = audio


func set_locale_manager(lm) -> void:
	locale_manager = lm


func get_text(key: String) -> String:
	if locale_manager != null:
		var r = locale_manager.get_translation(key)
		if r is String and r != "":
			return r
	return key


# ======================= SHOW INFO =======================

func show_keychain_info(keychain_id: String) -> void:
	var bundle_manager = game_manager.bundle_manager
	if bundle_manager == null:
		push_warning("BundleManager not available")
		return

	var keychain_data: Dictionary = {}
	for k in bundle_manager.get_all_keychains():
		if k["id"] == keychain_id:
			keychain_data = k
			break

	if keychain_data.is_empty():
		push_warning("Keychain not found: " + keychain_id)
		return

	# Toggle: if already open, close.
	if is_open:
		close_popup()
		return

	game_manager.set_game_input_locked(true)

	_popup = load(INFO_POPUP_SCENE).instantiate()
	game_manager.add_child(_popup)
	_popup.show_info(keychain_data, locale_manager)
	_popup.visibility_changed.connect(_on_popup_visibility_changed)

	is_open = true


func _on_popup_visibility_changed() -> void:
	if _popup != null and not _popup.visible:
		if _popup != null:
			_popup.queue_free()
			_popup = null
		is_open = false
		game_manager.set_game_input_locked(false)


func close_popup() -> void:
	if _popup != null:
		_popup.close()
		_popup.queue_free()
		_popup = null
	is_open = false
	game_manager.set_game_input_locked(false)
