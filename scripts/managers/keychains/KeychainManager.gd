# ==============================================================
# ==================== KEYCHAIN MANAGER =========================
# ==============================================================
# Manages keychain loading and initialization across all game modes:
# - Legacy: load/save from SaveManager, handle Stuffed death saves.
# - Hardcore: same as Legacy but with separate keys.
# - Daily: give keychains from a seeded bundle.
# - Custom: load from saved custom selection.
#
# Also applies passive effects (Resistance) and provides Destiny
# target selection.
#
# DEPENDS ON: KeychainConfig (pending .gd)

extends RefCounted

var game_manager = null


func _init(gm = null) -> void:
	game_manager = gm


# ===== LEGACY MODE =====

# Saves the player's current keychains and uses for Legacy mode.
func save_legacy_keychains(player) -> void:
	var keychains: Array = player.inventory
	SaveManager.set_legacy_keychains(keychains)

	var uses: Dictionary = player.keychain_uses
	SaveManager.set_legacy_keychain_uses(uses)

	print("[Legacy] Saved keychains: ", keychains)
	print("[Legacy] Saved uses: ", uses)


# Loads keychains for Legacy mode.
# First checks for Stuffed keychains (saved on death), then falls
# back to the regular saved keychains.
func load_legacy_keychains(player) -> void:
	# ===== CHECK FOR LEGACY STUFFED FIRST =====
	var stuffed_keychains: Array = SaveManager.get_legacy_stuffed_keychains()

	if not stuffed_keychains.is_empty():
		print("[Stuffed Legacy] Found saved keychains: ", stuffed_keychains)

		var max_size: int = player.max_inventory_size if player.max_inventory_size > 0 else 5
		player.inventory = []

		for keychain_id in stuffed_keychains:
			if player.inventory.size() >= max_size:
				break
			if keychain_id != "" and not player.inventory.has(keychain_id):
				player.inventory.append(keychain_id)

		SaveManager.clear_legacy_stuffed_keychains()
		KeychainConfig.init_keychain_uses_for_player(player)
		game_manager.get_flag_mode_manager().update_swamp_button_ui()
		game_manager.reversion_manager.update_button_ui()

		print("[Stuffed Legacy] Loaded into inventory: ", player.inventory)
		return

	# ===== Normal legacy loading (no stuffed) =====
	var saved_keychains: Array = SaveManager.get_legacy_keychains()
	var saved_uses: Dictionary = SaveManager.get_legacy_keychain_uses()

	if saved_keychains.is_empty():
		print("[Legacy] No saved keychains found, using empty inventory")
		player.inventory = []
		player.keychain_uses = {}
		return

	var max_size: int = player.max_inventory_size if player.max_inventory_size > 0 else 5
	player.inventory = []

	var loaded_count: int = 0
	for keychain_id in saved_keychains:
		if player.inventory.size() >= max_size:
			break
		if keychain_id != "" and not player.inventory.has(keychain_id):
			player.inventory.append(keychain_id)
			loaded_count += 1

	# Load saved uses
	player.keychain_uses = saved_uses.duplicate(true)

	# Clean up uses for keychains no longer in inventory
	var ids_to_remove: Array = []
	for id in player.keychain_uses.keys():
		if not player.inventory.has(id):
			ids_to_remove.append(id)
	for id in ids_to_remove:
		player.keychain_uses.erase(id)

	# Initialize uses for keychains that have no saved uses (first time or new keychain)
	for keychain_id in player.inventory:
		if KeychainConfig.has_uses(keychain_id):
			if not player.keychain_uses.has(keychain_id) or player.keychain_uses[keychain_id] == 0:
				var max_uses: int = KeychainConfig.get_max_uses(keychain_id)
				player.init_keychain_uses(keychain_id, max_uses)
				print("[Legacy] Initialized %s with %d uses (first time)" % [keychain_id, max_uses])

	print("[Legacy] Loaded %d keychains: %s" % [loaded_count, ", ".join(player.inventory)])
	print("[Legacy] Loaded uses: ", player.keychain_uses)


# Clears Legacy keychains and uses from SaveManager.
func clear_legacy_keychains() -> void:
	SaveManager.clear_legacy_keychains()
	SaveManager.clear_legacy_keychain_uses()
	print("[Legacy] Keychains and uses cleared")


# ===== HARDCORE MODE =====

# Saves the player's current keychains and uses for Hardcore mode.
func save_hardcore_keychains(player) -> void:
	var keychains: Array = player.inventory
	SaveManager.set_hardcore_keychains(keychains)

	var uses: Dictionary = player.keychain_uses
	SaveManager.set_hardcore_keychain_uses(uses)

	print("[Hardcore] Saved keychains: ", keychains)
	print("[Hardcore] Saved uses: ", uses)


# Loads keychains for Hardcore mode.
# First checks for Stuffed keychains, then falls back to saved.
func load_hardcore_keychains(player) -> void:
	# ===== CHECK FOR HARDCORE STUFFED FIRST =====
	var stuffed_keychains: Array = SaveManager.get_hardcore_stuffed_keychains()

	if not stuffed_keychains.is_empty():
		print("[Stuffed Hardcore] Found saved keychains: ", stuffed_keychains)

		var max_size: int = player.max_inventory_size if player.max_inventory_size > 0 else 5
		player.inventory = []

		for keychain_id in stuffed_keychains:
			if player.inventory.size() >= max_size:
				break
			if keychain_id != "" and not player.inventory.has(keychain_id):
				player.inventory.append(keychain_id)

		SaveManager.clear_hardcore_stuffed_keychains()
		KeychainConfig.init_keychain_uses_for_player(player)
		game_manager.get_flag_mode_manager().update_swamp_button_ui()
		game_manager.reversion_manager.update_button_ui()

		print("[Stuffed Hardcore] Loaded into inventory: ", player.inventory)
		return

	# ===== Hardcore legacy loading (no stuffed) =====
	var saved_keychains: Array = SaveManager.get_hardcore_keychains()
	var saved_uses: Dictionary = SaveManager.get_hardcore_keychain_uses()

	if saved_keychains.is_empty():
		print("[Hardcore] No saved keychains found, using empty inventory")
		player.inventory = []
		player.keychain_uses = {}
		return

	var max_size: int = player.max_inventory_size if player.max_inventory_size > 0 else 5
	player.inventory = []

	var loaded_count: int = 0
	for keychain_id in saved_keychains:
		if player.inventory.size() >= max_size:
			break
		if keychain_id != "" and not player.inventory.has(keychain_id):
			player.inventory.append(keychain_id)
			loaded_count += 1

	player.keychain_uses = saved_uses.duplicate(true)

	# Clean up uses for keychains no longer in inventory
	var ids_to_remove: Array = []
	for id in player.keychain_uses.keys():
		if not player.inventory.has(id):
			ids_to_remove.append(id)
	for id in ids_to_remove:
		player.keychain_uses.erase(id)

	print("[Hardcore] Loaded %d keychains: %s" % [loaded_count, ", ".join(player.inventory)])
	print("[Hardcore] Loaded uses: ", player.keychain_uses)


# Clears Hardcore keychains and uses from SaveManager.
func clear_hardcore_keychains() -> void:
	SaveManager.clear_hardcore_keychains()
	SaveManager.clear_hardcore_keychain_uses()
	print("[Hardcore] Keychains and uses cleared")


# ===== DAILY MODE =====

# Gives the player the keychains for today's Daily seed.
func give_daily_keychains(bundle_manager, player, seed: int) -> void:
	if bundle_manager == null:
		push_warning("[Daily] BundleManager not available")
		return

	var keychains: Array = bundle_manager.get_daily_keychains(seed)
	var max_size: int = player.max_inventory_size if player.max_inventory_size > 0 else 5

	var added_count: int = 0
	for keychain in keychains:
		if player.inventory.size() >= max_size:
			break
		if not player.inventory.has(keychain["id"]):
			player.inventory.append(keychain["id"])
			added_count += 1

	KeychainConfig.init_keychain_uses_for_player(player)
	game_manager.get_flag_mode_manager().update_swamp_button_ui()
	game_manager.reversion_manager.update_button_ui()

	print("[Daily] Gave %d keychains from seed %d" % [added_count, seed])
	print("[Daily] Keychains: ", ", ".join(player.inventory))


# ===== CUSTOM MODE =====

# Loads the keychains selected in Custom mode.
func load_custom_keychains(save_manager, player) -> void:
	var saved_keychains: Array = save_manager.get_custom_keychains()

	if saved_keychains.is_empty():
		print("[Custom] No saved keychains found, using default empty inventory")
		return

	var max_size: int = player.max_inventory_size if player.max_inventory_size > 0 else 5
	player.inventory = []

	var added_count: int = 0
	for keychain_id in saved_keychains:
		if player.inventory.size() >= max_size:
			break
		if keychain_id != "" and not player.inventory.has(keychain_id):
			player.inventory.append(keychain_id)
			added_count += 1

	KeychainConfig.init_keychain_uses_for_player(player)
	game_manager.get_flag_mode_manager().update_swamp_button_ui()
	game_manager.reversion_manager.update_button_ui()

	print("[Custom] Loaded %d saved keychains: %s" % [added_count, ", ".join(player.inventory)])


# ===== RESISTANCE =====

# Applies the Resistance keychain passive.
# Mommy (Ability 3) gets +1 AP, everyone else gets AP = 1.
func apply_resistance(player) -> void:
	if not player.has_keychain("resistance"):
		return

	if player.get_ability_id() == 3:
		player.increment_ap(1)
		print("[Resistance] Mommy +1 AP (total: %d)" % player.get_ap())
	else:
		player.set_ap(1)
		print("[Resistance] AP set to 1")


# ===== DESTINY =====

# Returns the current Destiny target if it is still a valid pal,
# or picks a new random alive pal (excluding Joni).
# Returns a Dictionary {"x": int, "y": int} or null.
func get_destiny_target(board: Array, current_target):
	if current_target != null:
		var tile = board[current_target["x"]][current_target["y"]]
		if tile != null and tile.get_pal_type() != "none" and tile.get_pal_type() != "joni":
			return current_target

	var pals: Array = []
	for i in range(board.size()):
		for j in range(board.size()):
			var pal_type: String = board[i][j].get_pal_type()
			if pal_type != "none" and pal_type != "joni":
				pals.append({"x": i, "y": j})

	if pals.is_empty():
		return null

	var random_index: int = randi_range(0, pals.size() - 1)
	var target = pals[random_index]
	print("[Destiny] Target set to: ", target)
	return target
