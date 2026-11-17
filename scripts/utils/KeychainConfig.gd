# ==============================================================
# =================== KEYCHAIN CONFIG ===========================
# ==============================================================
# Centralized configuration for all keychain properties.
#
# Two categories:
#   - LIMITED USES: keychains that have a max use count and are
#     consumed over time (revelation, descent, salvation, purity,
#     reversion).
#   - PASSIVE: keychains that are always active while in inventory.
#
# All methods are static: call as `KeychainConfig.has_uses("reversion")`.

class_name KeychainConfig
extends RefCounted

# ======================= DATA =======================

# Keychains with limited uses: id -> max_uses
const USES: Dictionary = {
	"revelation": 10,
	"descent": 9,
	"salvation": 3,
	"purity": 20,
	"reversion": 3,
}

# Keychains that are passive (no uses consumed).
const PASSIVE: Array = [
	"horizon",
	"home",
	"topography",
	"memory",
	"safekeeping",
	"destiny",
	"ascent",
	"protection",
	"greed",
	"resistance",
	"stealth",
	"concentration",
	"fortune",
	"vision",
	"continuity",
	"stuffed",
	"judgment",
	"link",
	"oblivion",
	"delirium"
]


# ======================= QUERIES =======================

# Returns true if the keychain has limited uses.
static func has_uses(id: String) -> bool:
	return USES.has(id)


# Returns the max uses for a keychain. Returns 0 if it has none.
static func get_max_uses(id: String) -> int:
	return int(USES.get(id, 0))


# Returns true if the keychain is passive.
static func is_passive(id: String) -> bool:
	return PASSIVE.has(id)


# ======================= PLAYER INITIALIZATION =======================

# Initializes the limited-use keychains in the player's inventory.
# Preserves uses already set (e.g. from a loaded save).
static func init_keychain_uses_for_player(player) -> void:
	if player == null:
		return

	for id in USES.keys():
		if player.inventory.has(id):
			# Only initialize if not already set (preserve saved uses)
			if not player.keychain_uses.has(id) or player.keychain_uses[id] == 0:
				player.init_keychain_uses(id, USES[id])
