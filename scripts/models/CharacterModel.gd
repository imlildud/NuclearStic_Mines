# ==============================================================
# ===================== CHARACTER MODEL ========================
# ==============================================================
# Manages the state and properties of the player character.

class_name CharacterModel
extends RefCounted

# ========== INJECTED DEPENDENCIES ==========
var _game_manager = null       # GameManager
var _save_manager = null       # SaveManager

# ========== POSITION COORDINATES ==========
var pos_x: int = 0             # X coordinate on game grid
var pos_y: int = 0             # Y coordinate on game grid

# ========== BASE STATS ==========
var hp: int = 0                # Health points
var ap: int = 0                # Armor points
var flags: int = 0             # Available flag count
var inventory: Array = []      # Array of inventory items (Keychain IDs)
var max_inventory_size: int = 5
var force: int = 0             # Force/power stat
var ability_id: int = 0        # Active ability identifier
var vision: int = 0            # Vision range (tiles visible)
var damage_flash: bool = false # Damage flash property

# ========== STATUS TRACKING ==========
var alive: bool = true         # Alive status flag
var criticized: bool = false   # Nest effect
var criticker_goal: int = 0
var criticker_progress: int = 0
var damage_taken: int = 0      # Damage tracker
var regen: bool = false        # Health regeneration flag
var rescued: int = 0           # Currently rescued count (current mission)
var total_rescued: int = 0     # Total rescued across all missions
var dead_pals: int = 0         # Dead pals across all missions
var failed_flags: int = 0      # Failed flag attempts
var failed_jump_flags: int = 0 # Failed jump flag attempts

# ========== CHARACTER IDENTITY ==========
var type: String = "none"      # Character type identifier

# ========== KEYCHAIN USAGE TRACKING ==========
# Dictionary<KeychainID: String, RemainingUses: int>
var keychain_uses: Dictionary = {}


# ======================= SETUP =======================
# Injects external managers so the model can save state without owning them.
func setup(game_manager = null, save_manager = null) -> void:
	_game_manager = game_manager
	_save_manager = save_manager


# ======================= POSITION =======================

func get_pos_x() -> int:
	return pos_x

func set_pos_x(v: int) -> void:
	pos_x = v

func get_pos_y() -> int:
	return pos_y

func set_pos_y(v: int) -> void:
	pos_y = v


# ======================= HEALTH POINTS (HP) =======================

func get_hp() -> int:
	return hp

func set_hp(v: int) -> void:
	hp = v

func increment_hp(v: int) -> void:
	hp += v

func decrement_hp(v: int) -> void:
	hp -= v


# ======================= ARMOR POINTS (AP) =======================

func get_ap() -> int:
	return ap

func set_ap(v: int) -> void:
	ap = v

func increment_ap(v: int) -> void:
	ap += v

func decrement_ap(v: int) -> void:
	ap -= v


# ======================= FLAGS =======================

func get_flags() -> int:
	return flags

func set_flags(v: int) -> void:
	flags = v

func increment_flags() -> void:
	flags += 1

func decrement_flags() -> void:
	flags -= 1


# ======================= FAILED FLAGS =======================

func get_failed_flags() -> int:
	return failed_flags

func set_failed_flags(v: int) -> void:
	failed_flags = v

func increment_failed_flags(v: int) -> void:
	failed_flags += v

func reset_failed_flags() -> void:
	failed_flags = 0


# ======================= FAILED JUMP FLAGS =======================

func get_failed_jump_flags() -> int:
	return failed_jump_flags

func set_failed_jump_flags(v: int) -> void:
	failed_jump_flags = v

func increment_jump_failed_flags(v: int) -> void:
	failed_jump_flags += v

func reset_jump_failed_flags() -> void:
	failed_jump_flags = 0


# ======================= INVENTORY =======================

func set_inventory_size(size: int) -> void:
	max_inventory_size = size

func get_inventory_size() -> int:
	return inventory.size()

func get_max_inventory_size() -> int:
	return max_inventory_size if max_inventory_size > 0 else 5

func has_keychain(id: String) -> bool:
	return inventory.has(id)


# ======================= FORCE =======================

func get_force() -> int:
	return force

func set_force(v: int) -> void:
	force = v

func increment_force(v: int) -> void:
	force += v

func decrement_force(v: int) -> void:
	force -= v


# ======================= ABILITY =======================

func get_ability_id() -> int:
	return ability_id

func set_ability_id(v: int) -> void:
	ability_id = v


# ======================= VISION =======================

func get_vision() -> int:
	return vision

func set_vision(v: int) -> void:
	vision = v


# ======================= ALIVE STATUS =======================

func is_alive() -> bool:
	return alive

func set_alive(v: bool) -> void:
	alive = v


# ======================= DAMAGE FLASH =======================

func is_damage_flash() -> bool:
	return damage_flash

func set_damage_flash(v: bool) -> void:
	damage_flash = v


# ======================= CRITICIZED STATUS =======================

func is_criticized() -> bool:
	return criticized

func set_criticized(v: bool) -> void:
	criticized = v

func get_criticker_goal() -> int:
	return criticker_goal

func set_criticker_goal(v: int) -> void:
	criticker_goal = v

func get_criticker_progress() -> int:
	return criticker_progress

func set_criticker_progress(v: int) -> void:
	criticker_progress = v

func increment_criticker_progress() -> void:
	criticker_progress += 1


# ======================= DAMAGE TRACKER =======================

func get_damage_taken() -> int:
	return damage_taken

func set_damage_taken(v: int) -> void:
	damage_taken = v

func increment_damage_taken(v: int) -> void:
	damage_taken += v

func reset_damage_taken() -> void:
	damage_taken = 0


# ======================= REGENERATION =======================

func is_regen() -> bool:
	return regen

func set_regen(v: bool) -> void:
	regen = v


# ======================= RESCUED COUNT =======================

func get_rescued() -> int:
	return rescued

func set_rescued(v: int) -> void:
	rescued = v

func increment_rescue() -> void:
	rescued += 1

func decrement_rescue(v: int) -> void:
	rescued -= v

func get_total_rescued() -> int:
	return total_rescued

func increment_total_rescued(v: int) -> void:
	total_rescued += v

func get_dead_pals() -> int:
	return dead_pals

func set_dead_pals(v: int) -> void:
	dead_pals = v

func increment_dead_pals() -> void:
	dead_pals += 1

func reset_dead_pals() -> void:
	dead_pals = 0


# ======================= CHARACTER TYPE =======================

func get_type() -> String:
	return type

func set_type(v: String) -> void:
	type = v


# ======================= KEYCHAIN USAGE =======================

# Initialize a keychain with max uses.
# Only initializes if the keychain exists in inventory.
func init_keychain_uses(id: String, max_uses: int) -> bool:
	if inventory.has(id):
		keychain_uses[id] = max_uses
		return true
	return false


# Get remaining uses for a keychain.
func get_keychain_uses(id: String) -> int:
	return keychain_uses.get(id, 0)


# Check if keychain has uses left.
func has_keychain_uses(id: String) -> bool:
	return keychain_uses.get(id, 0) > 0


# Check if keychain is active (has uses left, or is a passive keychain).
func is_keychain_active(id: String) -> bool:
	# If it's not in inventory, it's not active
	if not inventory.has(id):
		return false
	# If it has uses tracked, check if > 0
	if keychain_uses.has(id):
		return keychain_uses[id] > 0
	# No uses tracked = always active (passive keychain)
	return true


# Use one charge of a keychain. Returns true if a use was consumed.
# Safekeeping (+ Fortune) can save the charge with a % chance.
func use_keychain(id: String) -> bool:
	if keychain_uses.get(id, 0) <= 0:
		return false

	# ===== Safekeeping: Chance to not consume use =====
	var has_safekeeping := has_keychain("safekeeping")
	var has_fortune := has_keychain("fortune")

	var save_chance := 0.0
	if has_safekeeping:
		save_chance = 0.40 if has_fortune else 0.20

	var should_consume := randf() > save_chance

	if should_consume:
		keychain_uses[id] -= 1
		if keychain_uses[id] == 0:
			# Remove from inventory when depleted
			var index := inventory.find(id)
			if index > -1:
				inventory.remove_at(index)
			keychain_uses.erase(id)

		save_keychain_uses()
	else:
		print("[Safekeeping] Saved a use of %s!" % id)

	return true


# ===== SAVE KEYCHAIN USES (for Legacy mode) =====
func save_keychain_uses() -> void:
	if _game_manager == null:
		return

	# Only save if in Legacy mode
	var config = _game_manager.get("config")
	if config == null:
		return
	if config.get("mode") != "legacy":
		return

	if _save_manager == null:
		return

	# Save current uses
	_save_manager.set_legacy_keychain_uses(keychain_uses)
	print("[SaveManager] Keychain uses saved after use: ", keychain_uses)
