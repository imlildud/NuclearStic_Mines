# ==============================================================
# ===================== BUNDLE MANAGER =========================
# ==============================================================
# Handles bundle generation, rareza rolls, and keychain rewards.
#
# FOUR BUNDLE TIERS:
#   bundle          60%  1-2 keychains  (typical-weighted)
#   stockedbundle   25%  2-3 keychains
#   saturatedbundle 10%  3-4 keychains
#   cursedbundle     5%  1-4 keychains  (all cursed)
#
# FORTUNE KEYCHAIN:
# When the player has "fortune", bundle probabilities shift toward
# better tiers and keychain rarity rolls shift toward rarer items.
#
# DAILY MODE:
# Uses a seeded RNG so every player gets the same keychains for
# the same day. Excludes 'fortune', 'greed', and 'stuffed'.

extends RefCounted

# ======================= STATE =======================

var game_manager = null
var locale_manager = null

# Bundle tier definitions with probabilities and rarity weights.
var bundle_tiers: Dictionary = {
	"bundle": {
		"name": "bundle",
		"probability": 0.60,
		"keychainCount": {"min": 1, "max": 2},
		"rarezas": {
			"typical": 0.65,
			"abnormal": 0.25,
			"extravagant": 0.08,
			"unheard": 0.02,
			"cursed": 0.0
		}
	},
	"stockedbundle": {
		"name": "stockedbundle",
		"probability": 0.25,
		"keychainCount": {"min": 2, "max": 3},
		"rarezas": {
			"typical": 0.35,
			"abnormal": 0.45,
			"extravagant": 0.15,
			"unheard": 0.05,
			"cursed": 0.10
		}
	},
	"saturatedbundle": {
		"name": "saturatedbundle",
		"probability": 0.10,
		"keychainCount": {"min": 3, "max": 4},
		"rarezas": {
			"typical": 0.0,
			"abnormal": 0.35,
			"extravagant": 0.30,
			"unheard": 0.15,
			"cursed": 0.20
		}
	},
	"cursedbundle": {
		"name": "cursedbundle",
		"probability": 0.05,
		"keychainCount": {"min": 1, "max": 4},
		"rarezas": {
			"typical": 0.0,
			"abnormal": 0.0,
			"extravagant": 0.0,
			"unheard": 0.0,
			"cursed": 1.0
		}
	}
}

# Full list of keychains with their rarity.
var keychain_list: Array = [
	{"id": "horizon", "rareza": "typical"},
	{"id": "home", "rareza": "typical"},
	{"id": "topography", "rareza": "typical"},
	{"id": "memory", "rareza": "typical"},
	{"id": "safekeeping", "rareza": "typical"},
	{"id": "purity", "rareza": "abnormal"},
	{"id": "destiny", "rareza": "abnormal"},
	{"id": "ascent", "rareza": "abnormal"},
	{"id": "protection", "rareza": "abnormal"},
	{"id": "descent", "rareza": "abnormal"},
	{"id": "greed", "rareza": "abnormal"},
	{"id": "revelation", "rareza": "extravagant"},
	{"id": "resistance", "rareza": "extravagant"},
	{"id": "salvation", "rareza": "extravagant"},
	{"id": "stealth", "rareza": "extravagant"},
	{"id": "concentration", "rareza": "extravagant"},
	{"id": "fortune", "rareza": "unheard"},
	{"id": "vision", "rareza": "unheard"},
	{"id": "continuity", "rareza": "unheard"},
	{"id": "reversion", "rareza": "unheard"},
	{"id": "stuffed", "rareza": "unheard"},
	{"id": "judgment", "rareza": "cursed"},
	{"id": "link", "rareza": "cursed"},
	{"id": "oblivion", "rareza": "cursed"},
	{"id": "delirium", "rareza": "cursed"}
]

# Keychains excluded from Daily mode.
var daily_excluded_ids: Array = ["fortune", "greed", "stuffed"]


func _init(gm = null, locale = null) -> void:
	game_manager = gm
	locale_manager = locale


# ======================= TIER SELECTION =======================

# Rolls a bundle tier based on the current probabilities.
# If the player has the Fortune keychain, the probabilities are
# shifted toward better tiers.
func get_tier() -> String:
	# ===== FORTUNE: Increases chance of better bundles =====
	var has_fortune: bool = false
	if game_manager != null and game_manager.get_player() != null:
		has_fortune = game_manager.get_player().has_keychain("fortune")

	var roll: float = randf()
	var cumulative: float = 0.0

	# Clone the tiers so we don't mutate the originals
	var tiers: Dictionary = bundle_tiers.duplicate(true)

	if has_fortune:
		tiers["bundle"]["probability"] = 0.45
		tiers["stockedbundle"]["probability"] = 0.25
		tiers["saturatedbundle"]["probability"] = 0.20
		tiers["cursedbundle"]["probability"] = 0.10
		print("[Fortune] Bundle probabilities boosted!")

	for key in tiers.keys():
		cumulative += tiers[key]["probability"]
		if roll <= cumulative:
			return key

	return "bundle"


# Returns the number of keychains for a given tier.
func get_keychain_count(tier_key: String) -> int:
	var tier: Dictionary = bundle_tiers[tier_key]
	var min_count: int = tier["keychainCount"]["min"]
	var max_count: int = tier["keychainCount"]["max"]
	return randi_range(min_count, max_count)


# ======================= RARITY ROLL =======================

# Rolls a rarity for a given tier.
# If the player has Fortune, the probabilities shift toward rarer.
func roll_keychain_type(tier_key: String) -> String:
	var tier: Dictionary = bundle_tiers[tier_key]
	var roll: float = randf()
	var cumulative: float = 0.0

	# ===== FORTUNE: Improves keychain quality =====
	var has_fortune: bool = false
	if game_manager != null and game_manager.get_player() != null:
		has_fortune = game_manager.get_player().has_keychain("fortune")

	var rareza_keys: Array = ["typical", "abnormal", "extravagant", "unheard", "cursed"]
	var rarezas: Dictionary = tier["rarezas"].duplicate(true)

	if has_fortune:
		# Reduce typical by 20%, redistribute to higher tiers
		var adjusted: Dictionary = rarezas.duplicate(true)

		if adjusted["typical"] > 0.0:
			var reduction: float = adjusted["typical"] * 0.20
			adjusted["typical"] = maxf(0.0, adjusted["typical"] - reduction)

			var bonus: float = reduction / 4.0
			adjusted["abnormal"] = minf(1.0, adjusted["abnormal"] + bonus)
			adjusted["extravagant"] = minf(1.0, adjusted["extravagant"] + bonus)
			adjusted["unheard"] = minf(1.0, adjusted["unheard"] + bonus)
			adjusted["cursed"] = minf(1.0, adjusted["cursed"] + bonus)

			# Normalize
			var total: float = adjusted["typical"] + adjusted["abnormal"] + adjusted["extravagant"] + adjusted["unheard"] + adjusted["cursed"]
			if total > 0.0:
				adjusted["typical"] /= total
				adjusted["abnormal"] /= total
				adjusted["extravagant"] /= total
				adjusted["unheard"] /= total
				adjusted["cursed"] /= total

			rarezas = adjusted
			print("[Fortune] Keychain quality boosted for tier: " + tier_key)

	for key in rareza_keys:
		var prob: float = rarezas.get(key, 0.0)
		cumulative += prob
		if roll <= cumulative:
			return key

	return "typical"


# ======================= BUNDLE GENERATION =======================

# Returns the list of keychains for a given tier.
# Filters out keychains the player already owns.
func get_bundle_keychains(tier_key: String) -> Array:
	var count: int = get_keychain_count(tier_key)
	var keychains: Array = []
	var used_ids: Dictionary = {}  # Set of used IDs
	var has_cursed: bool = false

	# Player's current inventory to avoid duplicates
	var owned_keychains: Array = []
	if game_manager != null and game_manager.get_player() != null:
		owned_keychains = game_manager.get_player().inventory

	# ===== CURSED BUNDLE: all keychains are cursed =====
	if tier_key == "cursedbundle":
		var cursed_available: Array = []
		for k in keychain_list:
			if k["rareza"] == "cursed" and not used_ids.has(k["id"]) and not owned_keychains.has(k["id"]):
				cursed_available.append(k)

		# Shuffle and take up to count
		cursed_available.shuffle()
		var selected: Array = cursed_available.slice(0, count)

		for k in selected:
			used_ids[k["id"]] = true
			keychains.append(k)

		if keychains.is_empty():
			var fallback = _find_keychain_by_rarity("typical", owned_keychains)
			if fallback != null:
				keychains.append(fallback)

		return keychains

	# ===== SATURATED BUNDLE: random keychains =====
	if tier_key == "saturatedbundle":
		for _i in range(count):
			var type: String = roll_keychain_type(tier_key)

			var available: Array = []
			for k in keychain_list:
				if k["rareza"] == type and not used_ids.has(k["id"]) and not owned_keychains.has(k["id"]):
					available.append(k)

			if not available.is_empty():
				var selected = available[randi_range(0, available.size() - 1)]
				used_ids[selected["id"]] = true
				keychains.append(selected)

		if keychains.is_empty():
			var fallback = _find_keychain_by_rarity("abnormal", owned_keychains)
			if fallback != null:
				keychains.append(fallback)

		return keychains

	# ===== NORMAL BUNDLES (bundle, stockedbundle) =====
	for _i in range(count):
		var type: String = roll_keychain_type(tier_key)

		# Only one cursed keychain per normal bundle
		if type == "cursed":
			if has_cursed:
				type = "typical"
			else:
				has_cursed = true

		var available: Array = []
		for k in keychain_list:
			if k["rareza"] == type and not used_ids.has(k["id"]) and not owned_keychains.has(k["id"]):
				available.append(k)

		if not available.is_empty():
			var selected = available[randi_range(0, available.size() - 1)]
			used_ids[selected["id"]] = true
			keychains.append(selected)

	if keychains.is_empty():
		var fallback = _find_keychain_by_rarity("typical", owned_keychains)
		if fallback != null:
			keychains.append(fallback)

	return keychains


# Returns a random keychain of the given rarity, or null.
func get_random_keychain_of_type(type: String):
	var filtered: Array = []
	for k in keychain_list:
		if k["rareza"] == type:
			filtered.append(k)
	if filtered.is_empty():
		return null
	return filtered[randi_range(0, filtered.size() - 1)]


# ======================= DAILY MODE =======================

# Creates a seeded pseudo-random generator (LCG).
# Returns a Callable that produces floats in [0, 1).
func create_seeded_random(seed_value: int) -> Callable:
	var state: Dictionary = {"seed": seed_value}
	return func() -> float:
		state["seed"] = (state["seed"] * 9301 + 49297) % 233280
		return float(state["seed"]) / 233280.0


# Returns the list of keychains for today's Daily seed.
# Uses a seeded RNG so all players get the same keychains.
func get_daily_keychains(seed_value: int) -> Array:
	var seeded_random: Callable = create_seeded_random(seed_value)

	# Filter out excluded keychains
	var valid_keychains: Array = []
	for k in keychain_list:
		if not daily_excluded_ids.has(k["id"]):
			valid_keychains.append(k)

	# Determine how many keychains (1-5)
	var count: int = floori(seeded_random.call() * 5.0) + 1

	var keychains: Array = []
	var used_ids: Dictionary = {}
	var rareza_keys: Array = ["typical", "abnormal", "extravagant", "unheard", "cursed"]

	# Group keychains by rarity
	var rareza_groups: Dictionary = {}
	for rareza in rareza_keys:
		var group: Array = []
		for k in valid_keychains:
			if k["rareza"] == rareza:
				group.append(k)
		rareza_groups[rareza] = group

	# Daily rarity weights
	var daily_weights: Dictionary = {
		"typical": 0.35,
		"abnormal": 0.32,
		"extravagant": 0.20,
		"unheard": 0.10,
		"cursed": 0.03
	}

	# Roll for each keychain
	for _i in range(count):
		var roll: float = seeded_random.call()
		var cumulative: float = 0.0
		var selected_rareza: String = "typical"

		for rareza in rareza_keys:
			cumulative += daily_weights[rareza]
			if roll <= cumulative:
				selected_rareza = rareza
				break

		# Get available keychains of that rarity
		var available: Array = []
		for k in rareza_groups.get(selected_rareza, []):
			if not used_ids.has(k["id"]):
				available.append(k)

		if not available.is_empty():
			var selected = available[floori(seeded_random.call() * available.size())]
			used_ids[selected["id"]] = true
			keychains.append(selected)

	# Ensure at least one keychain
	if keychains.is_empty():
		for k in valid_keychains:
			if k["rareza"] == "typical" and not used_ids.has(k["id"]):
				keychains.append(k)
				break

	return keychains


# Returns the full keychain list.
func get_all_keychains() -> Array:
	return keychain_list


# Returns the list of keychains valid for Daily mode.
func get_daily_valid_keychains() -> Array:
	var result: Array = []
	for k in keychain_list:
		if not daily_excluded_ids.has(k["id"]):
			result.append(k)
	return result


# ======================= INTERNAL HELPERS =======================

# Finds the first keychain of the given rarity that the player
# does not own. Returns null if none found.
func _find_keychain_by_rarity(rarity: String, owned: Array):
	for k in keychain_list:
		if k["rareza"] == rarity and not owned.has(k["id"]):
			return k
	return null
