# ==============================================================
# ==================== BUNDLE UI MANAGER =======================
# ==============================================================
# Handles bundle popup display, keychain selection, and animations.
#
# ⚠️ PHASE 3 STUB:
# This manager is 100% UI/DOM in the original JS. Its real
# implementation requires:
#   - A `BundlePopup.tscn` scene with the bundle image, the
#     keychain grid, and the rarity badges.
#   - An `InventoryFullPopup.tscn` for the "inventory full" case.
#   - A `TrashSelectionPopup.tscn` for the trash keychain removal.
#   - Animations (appear, float, aura pulse).
#
# For now, this stub exposes the public API and emits signals so
# the rest of the code compiles. Full wiring in Phase 3.

extends RefCounted

# ======================= SIGNALS =======================

# Emitted when the bundle popup should be shown.
# Payload: {tierKey: String, tier: Dictionary, keychains: Array}
signal show_bundle_popup(data: Dictionary)

# Emitted when the bundle should be opened (image swap).
signal open_bundle(tier_key: String)

# Emitted when the inventory is full (show trash/none popup).
signal show_inventory_full_popup(is_trash: bool)

# Emitted when the trash selection popup should be shown.
signal show_trash_selection(inventory: Array)

# Emitted when the popup should be closed.
signal close_popup

# ======================= STATE =======================

var game_manager = null
var bundle_manager = null
var audio_manager = null
var locale_manager = null
var is_open: bool = false
var current_bundle: Dictionary = {}
var current_keychains: Array = []
var selected_count: int = 0
var total_keychains: int = 0
var is_trash_mode: bool = false


func _init(gm = null, bm = null, audio = null) -> void:
	game_manager = gm
	bundle_manager = bm
	audio_manager = audio


func set_locale_manager(lm) -> void:
	locale_manager = lm


func get_text(key: String) -> String:
	if locale_manager != null:
		return locale_manager.get(key)
	return key


# ======================= SHOW BUNDLE POPUP =======================

# Shows the bundle popup for the given tile.
# If the player's inventory is full, shows the inventory-full popup
# instead of generating the bundle.
func show_bundle_popup(tile_x: int, tile_y: int) -> void:
	if is_open:
		return

	# Check if inventory is full BEFORE generating the bundle
	var player = game_manager.get_player()
	var max_size: int = player.max_inventory_size if player.max_inventory_size > 0 else 5
	var is_inventory_full: bool = player.inventory.size() >= max_size

	var tier_key: String = bundle_manager.get_tier()
	var tier: Dictionary = bundle_manager.bundle_tiers[tier_key]
	var keychains: Array = bundle_manager.get_bundle_keychains(tier_key)

	current_bundle = {"tierKey": tier_key, "tier": tier, "keychains": keychains}
	current_keychains = keychains
	is_open = true
	selected_count = 0
	total_keychains = keychains.size()

	game_manager.set_game_input_locked(true)

	# If inventory is full, show the inventory-full popup directly
	if is_inventory_full:
		show_inventory_full()
	else:
		var payload: Dictionary = {
			"tierKey": tier_key,
			"tier": tier,
			"keychains": keychains
		}
		show_bundle_popup.emit(payload)


# ======================= INVENTORY FULL =======================

# Shows the inventory-full popup.
# 20% of the time it's a "trash" popup (lets the player remove one
# keychain), otherwise it's a "nothing found" popup.
func show_inventory_full() -> void:
	var roll: float = randf()
	var is_trash: bool = roll < 0.20
	is_trash_mode = is_trash
	show_inventory_full_popup.emit(is_trash)


# Shows the trash selection popup.
# The player must choose a keychain to remove; cannot cancel.
func show_trash_selection() -> void:
	var player = game_manager.get_player()
	var inventory: Array = player.inventory

	if inventory.is_empty():
		close()
		return

	show_trash_selection.emit(inventory)


# Called by the UI when the player selects a keychain to remove.
func on_trash_keychain_selected(keychain_id: String) -> void:
	var player = game_manager.get_player()
	var idx: int = player.inventory.find(keychain_id)
	if idx > -1:
		player.inventory.remove_at(idx)

	if audio_manager != null:
		audio_manager.play_click_sfx()

	close()


# ======================= TAKE KEYCHAIN =======================

# Called by the UI when the player clicks a keychain in the bundle.
# Adds it to the inventory if there is space and it's not a duplicate.
func take_keychain(keychain: Dictionary, item_index: int) -> void:
	var player = game_manager.get_player()
	var max_size: int = player.max_inventory_size if player.max_inventory_size > 0 else 5

	if player.inventory.size() >= max_size:
		show_inventory_full()
		return

	if player.inventory.has(keychain["id"]):
		return

	player.inventory.append(keychain["id"])

	# Initialize uses if this keychain has them
	KeychainConfig.init_keychain_uses_for_player(player)
	game_manager.get_flag_mode_manager().update_swamp_button_ui()
	game_manager.reversion_manager.update_button_ui()

	if audio_manager != null:
		audio_manager.play_rescue_sfx()

	selected_count += 1

	# Close the popup after a short delay (the UI handles the
	# item fade-out animation and then calls close()).
	get_tree().create_timer(0.4).timeout.connect(close)


# ======================= CLOSE =======================

# Closes the popup and unlocks input.
func close() -> void:
	is_open = false
	is_trash_mode = false
	close_popup.emit()
	game_manager.set_game_input_locked(false)


# ======================= INTERNAL HELPERS =======================

# Returns the parent scene tree (for timers).
func get_tree():
	return game_manager.get_tree()
