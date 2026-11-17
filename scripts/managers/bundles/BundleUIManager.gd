# ==============================================================
# ==================== BUNDLE UI MANAGER =======================
# ==============================================================
# Orchestrator: instantiates BundlePopup / InventoryFullPopup /
# TrashSelectionPopup and wires their signals. No UI code here.
#
# Replaces the previous stub version. The public API is unchanged:
#   - show_bundle_popup(tile_x, tile_y)
#   - take_keychain (handled by the scene)
#   - close()
#
# Scene instances are parented to GameManager (a Node) so they can
# use get_tree() for timers and tweens.

extends RefCounted
class_name BundleUIManager

const BUNDLE_POPUP_SCENE := "res://scenes/menu/bundle/BundlePopup.tscn"
const INVENTORY_FULL_SCENE := "res://scenes/menu/bundle/InventoryFullPopup.tscn"
const TRASH_SELECTION_SCENE := "res://scenes/menu/bundle/TrashSelectionPopup.tscn"

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

# Active scene instances (parented to GameManager).
var _bundle_popup: CanvasLayer = null
var _inventory_full_popup: CanvasLayer = null
var _trash_popup: CanvasLayer = null


func _init(gm = null, bm = null, audio = null) -> void:
	game_manager = gm
	bundle_manager = bm
	audio_manager = audio


func set_locale_manager(lm) -> void:
	locale_manager = lm


func get_text(key: String) -> String:
	if locale_manager != null:
		var r = locale_manager.get_translation(key)
		if r is String and r != "":
			return r
	return key


# ======================= SHOW BUNDLE =======================

func show_bundle_popup(tile_x: int, tile_y: int) -> void:
	if is_open:
		return

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

	if is_inventory_full:
		_show_inventory_full()
	else:
		_show_bundle_scene(tier_key, keychains)


func _show_bundle_scene(tier_key: String, keychains: Array) -> void:
	_bundle_popup = load(BUNDLE_POPUP_SCENE).instantiate()
	game_manager.add_child(_bundle_popup)
	_bundle_popup.keychain_taken.connect(_on_keychain_taken)
	_bundle_popup.closed.connect(_on_bundle_closed)
	_bundle_popup.show_bundle(tier_key, keychains, locale_manager)


func _on_bundle_closed() -> void:
	if _bundle_popup != null:
		_bundle_popup.queue_free()
		_bundle_popup = null
	# Note: _on_keychain_taken already unlocked and set is_open=false.


func _on_keychain_taken(keychain: Dictionary) -> void:
	var player = game_manager.get_player()
	player.inventory.append(keychain["id"])

	KeychainConfig.init_keychain_uses_for_player(player)
	game_manager.get_flag_mode_manager().update_swamp_button_ui()
	game_manager.get_reversion_manager().update_button_ui()

	if audio_manager != null:
		audio_manager.play_rescue_sfx()

	selected_count += 1
	is_open = false
	game_manager.set_game_input_locked(false)


# ======================= INVENTORY FULL =======================

func _show_inventory_full() -> void:
	var roll: float = randf()
	var is_trash: bool = roll < 0.20
	is_trash_mode = is_trash

	_inventory_full_popup = load(INVENTORY_FULL_SCENE).instantiate()
	game_manager.add_child(_inventory_full_popup)
	_inventory_full_popup.trash_requested.connect(_on_trash_requested)
	_inventory_full_popup.cancelled.connect(_on_inventory_cancelled)
	_inventory_full_popup.acknowledged.connect(_on_inventory_cancelled)
	_inventory_full_popup.show_popup(is_trash, locale_manager)


func _on_trash_requested() -> void:
	if _inventory_full_popup != null:
		_inventory_full_popup.queue_free()
		_inventory_full_popup = null
	_show_trash_selection()


func _on_inventory_cancelled() -> void:
	if _inventory_full_popup != null:
		_inventory_full_popup.queue_free()
		_inventory_full_popup = null
	is_open = false
	is_trash_mode = false
	game_manager.set_game_input_locked(false)


# ======================= TRASH SELECTION =======================

func _show_trash_selection() -> void:
	var player = game_manager.get_player()
	if player.inventory.is_empty():
		close()
		return

	_trash_popup = load(TRASH_SELECTION_SCENE).instantiate()
	game_manager.add_child(_trash_popup)
	_trash_popup.keychain_selected.connect(_on_trash_keychain_selected)
	_trash_popup.cancelled.connect(_on_trash_cancelled)
	_trash_popup.show_popup(player.inventory.duplicate(), bundle_manager, locale_manager)


func _on_trash_keychain_selected(keychain_id: String) -> void:
	var player = game_manager.get_player()
	var idx: int = player.inventory.find(keychain_id)
	if idx > -1:
		player.inventory.remove_at(idx)

	if audio_manager != null:
		audio_manager.play_click_sfx()

	if _trash_popup != null:
		_trash_popup.queue_free()
		_trash_popup = null

	close()


func _on_trash_cancelled() -> void:
	if _trash_popup != null:
		_trash_popup.queue_free()
		_trash_popup = null
	close()


# ======================= CLOSE =======================

func close() -> void:
	if _bundle_popup != null:
		_bundle_popup.queue_free()
		_bundle_popup = null
	if _inventory_full_popup != null:
		_inventory_full_popup.queue_free()
		_inventory_full_popup = null
	if _trash_popup != null:
		_trash_popup.queue_free()
		_trash_popup = null

	is_open = false
	is_trash_mode = false
	game_manager.set_game_input_locked(false)
