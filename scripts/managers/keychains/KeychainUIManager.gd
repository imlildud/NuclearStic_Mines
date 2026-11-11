# ==============================================================
# ==================== KEYCHAIN UI MANAGER ======================
# ==============================================================
# Handles keychain info popups, animations, and interactions.
#
# ⚠️ PHASE 3 STUB:
# This manager is 100% UI/DOM in the original JS. Its real
# implementation requires:
#   - A `KeychainInfoPopup.tscn` scene
#   - The aura/icon/badge/name/description elements
#   - Animations (appear, float, aura pulse)
#
# For now, this stub exposes the public API and emits signals so
# the rest of the code compiles. Full wiring in Phase 3.

extends RefCounted
class_name KeychainUIManager

# ======================= SIGNALS =======================

# Emitted when the popup should be shown.
signal show_keychain_popup(data: Dictionary)

# Emitted when the popup should be hidden.
signal hide_keychain_popup

# ======================= STATE =======================

var game_manager = null
var audio_manager = null
var locale_manager = null
var is_open: bool = false

# Rarity configuration (background name, text color, border color).
# Used by the UI scene to pick the correct aura and badge.
var rareza_map: Dictionary = {
	"typical":     {"bg": "typical",     "color": "#8B7355", "borderColor": "#8B7355"},
	"abnormal":    {"bg": "abnormal",    "color": "#E8762D", "borderColor": "#E8762D"},
	"extravagant": {"bg": "extravagant", "color": "#9B59B6", "borderColor": "#9B59B6"},
	"unheard":     {"bg": "outrageous",  "color": "#C0392B", "borderColor": "#C0392B"},
	"cursed":      {"bg": "cursed",      "color": "#1A1A1A", "borderColor": "#1A1A1A"}
}


func _init(gm = null, audio = null) -> void:
	game_manager = gm
	audio_manager = audio


func set_locale_manager(lm) -> void:
	locale_manager = lm


func get_text(key: String) -> String:
	if locale_manager != null:
		return locale_manager.get(key)
	return key


# ==============================================================
# ==================== SHOW KEYCHAIN INFO ======================
# ==============================================================

# Shows the info popup for the given keychain.
# If the popup is already open, closes it (toggle behavior).
func show_keychain_info(keychain_id: String) -> void:
	var bundle_manager = game_manager.bundle_manager
	if bundle_manager == null:
		push_warning("BundleManager not available")
		return

	var keychain_data = null
	for k in bundle_manager.get_all_keychains():
		if k["id"] == keychain_id:
			keychain_data = k
			break

	if keychain_data == null:
		push_warning("Keychain not found: " + keychain_id)
		return

	# If popup already open, close it
	if is_open:
		close_popup()
		return

	# Resolve locale data
	var name: String = get_text("keychain.%s.name" % keychain_id)
	if name == "":
		name = keychain_id
	var description: String = get_text("keychain.%s.description" % keychain_id)
	var rareza_key: String = keychain_data.get("rareza", "typical")
	var rareza_name: String = get_text("bundle.rareza.%s" % rareza_key)
	if rareza_name == "":
		rareza_name = rareza_key
	var rareza_info: Dictionary = rareza_map.get(rareza_key, rareza_map["typical"])

	is_open = true
	game_manager.set_game_input_locked(true)

	# Emit payload to the UI scene
	var payload: Dictionary = {
		"keychain_id": keychain_id,
		"name": name,
		"description": description,
		"rareza_name": rareza_name,
		"rareza_info": rareza_info
	}
	show_keychain_popup.emit(payload)

	# Play sound
	if audio_manager != null:
		audio_manager.play_click_sfx()


# ==============================================================
# ==================== CLOSE POPUP =============================
# ==============================================================

# Closes the info popup.
func close_popup() -> void:
	hide_keychain_popup.emit()

	is_open = false
	game_manager.set_game_input_locked(false)
