# ==============================================================
# ==================== DISCORD RPC =============================
# ==============================================================
# Handles Discord Rich Presence integration.
#
# ⚠️ PENDING ADDON:
# This is a wrapper around a Godot Discord RPC addon. The addon
# has not been chosen yet. Until then, `update_presence` and
# `reset_timestamp` are no-ops (they just print a warning).
#
# The presence-building functions (build_presence, build_id_card_presence)
# are fully implemented and do not depend on the addon.
#
# AUTOLOAD: Available as `DiscordRPC` from any scene.

extends Node

# ======================= PRESENCE UPDATE =======================

# Updates Discord Rich Presence with the given state.
# Returns true if the update was sent, false if the addon is missing.
func update_presence(details: String, state: String, extra: Dictionary = {}) -> bool:
	# TODO: Replace with the chosen addon's API.
	# Example (Discord RPC addon):
	#   DiscordRPC.set_activity({"details": details, "state": state, ...})
	push_warning("[RPC] Discord bridge unavailable (addon not installed)")
	return false


# Returns true if the Discord RPC addon is ready.
func is_ready() -> bool:
	# TODO: Replace with the chosen addon's ready check.
	return false


# Resets the Discord activity timer.
func reset_timestamp() -> void:
	# TODO: Replace with the chosen addon's reset API.
	pass


# ======================= FORMATTING HELPERS =======================

# Capitalizes the character name.
func _format_character(name: String) -> String:
	if name == "":
		return "Unknown"
	return name.substr(0, 1).to_upper() + name.substr(1)


# Returns an emoji for the given character.
func _get_character_emoji(character: String) -> String:
	var emojis: Dictionary = {
		"chef": "👨‍🍳",
		"mosquito": "🦟",
		"mommy": "🛡️",
		"scout": "🏔️"
	}
	return emojis.get(character.to_lower(), "🎮")


# Returns the display name for a hazard intensity value.
func _get_hazard_name(value: int) -> String:
	if value <= 2: return "Low"
	if value <= 7: return "Medium"
	if value <= 11: return "High"
	if value <= 17: return "Xtrahigh"
	if value <= 20: return "Ultrahigh"
	return "Insanely High"


# Returns the display name for an obstacle intensity value.
func _get_obstacle_name(value: int) -> String:
	if value <= 2: return "Low"
	if value <= 4: return "Medium"
	if value <= 9: return "High"
	if value <= 14: return "Xtrahigh"
	if value <= 19: return "Ultrahigh"
	return "Insanely High"


# ======================= BUILD PRESENCE =======================

# Builds the Discord presence Dictionary from the game config.
# Returns: {details: String, state: String, largeImageKey: String}
func build_presence(game_config: Dictionary) -> Dictionary:
	var mode: String = game_config.get("mode", "menu")
	var is_legacy: bool = mode == "legacy" or mode == "hardcore"
	var seed_value: String = str(game_config.get("seed", "---"))

	# Menu: simple presence
	if mode == "menu":
		return {
			"details": "In the menu",
			"state": "Preparing for adventure",
			"largeImageKey": "nuclearstic_logo"
		}

	# Tutorial mode
	if mode == "tutorial":
		return {
			"details": "📚 Learning the ropes",
			"state": "Playing the tutorial",
			"largeImageKey": "nuclearstic_logo"
		}

	# Test mode
	if mode == "test":
		return {
			"details": "🧪 Testing mode",
			"state": "Debugging the game",
			"largeImageKey": "nuclearstic_logo"
		}

	# Legacy / Hardcore: show level
	if is_legacy:
		var level: int = game_config.get("level", 1)
		var mode_display: String = "Hardcore" if mode == "hardcore" else "Legacy"
		var char_emoji: String = _get_character_emoji(game_config.get("character", ""))
		var char_name: String = _format_character(game_config.get("character", ""))

		return {
			"details": "%s - Level %d" % [mode_display, level],
			"state": "%s %s 🌱 %s" % [char_emoji, char_name, seed_value],
			"largeImageKey": game_config.get("zone", "desert")
		}

	# Daily / Custom: show mode name
	var mode_display: String = "Daily" if mode == "daily" else "Custom"
	var char_emoji: String = _get_character_emoji(game_config.get("character", ""))
	var char_name: String = _format_character(game_config.get("character", ""))
	var size: int = game_config.get("size", 0)

	return {
		"details": "%s Mission" % mode_display,
		"state": "%s %s 🗺️ %dx%d ☢️ %s 🧱 %s 🎯 %d 🌱 %s" % [
			char_emoji, char_name, size, size,
			_get_hazard_name(game_config.get("hazards", 0)),
			_get_obstacle_name(game_config.get("obstacles", 0)),
			game_config.get("pals", 0),
			seed_value
		],
		"largeImageKey": game_config.get("zone", "desert")
	}


# Builds the ID Card presence Dictionary.
func build_id_card_presence(username: String, total_points: int, is_hardcore: bool, legacy_record: int, daily_streak: int, hardcore_record: int) -> Dictionary:
	var rank_data: Dictionary = _get_rank_data_for_display(total_points, is_hardcore)

	# Truncate username if too long
	var display_name: String = username
	if username.length() > 15:
		display_name = username.substr(0, 15) + "..."

	return {
		"details": "🪪 %s's ID Card" % display_name,
		"state": "🏅Rank %s 🏆 %d 🔥 %d 😈 %d" % [
			rank_data.get("rank", "F-"),
			legacy_record, daily_streak, hardcore_record
		],
		"largeImageKey": "nuclearstic_logo"
	}


# ======================= RANK DATA =======================

# Returns the rank Dictionary for the given points.
# Matches the logic in RankManager (future .gd).
func _get_rank_data_for_display(points: int, is_hardcore: bool) -> Dictionary:
	var normal_ranks: Array = [
		{"rank": "F-", "min": 0, "max": 200000},
		{"rank": "F", "min": 200001, "max": 500000},
		{"rank": "F+", "min": 500001, "max": 900000},
		{"rank": "E-", "min": 900001, "max": 1400000},
		{"rank": "E", "min": 1400001, "max": 2000000},
		{"rank": "E+", "min": 2000001, "max": 2700000},
		{"rank": "D-", "min": 2700001, "max": 3500000},
		{"rank": "D", "min": 3500001, "max": 4600000},
		{"rank": "D+", "min": 4600001, "max": 6000000},
		{"rank": "C-", "min": 6000001, "max": 7700000},
		{"rank": "C", "min": 7700001, "max": 9700000},
		{"rank": "C+", "min": 9700001, "max": 12000000},
		{"rank": "B-", "min": 12000001, "max": 14600000},
		{"rank": "B", "min": 14600001, "max": 17500000},
		{"rank": "B+", "min": 17500001, "max": 20700000},
		{"rank": "A-", "min": 20700001, "max": 24200000},
		{"rank": "A", "min": 24200001, "max": 28000000},
		{"rank": "A+", "min": 28000001, "max": 32100000},
		{"rank": "S-", "min": 32100001, "max": 36500000},
		{"rank": "S", "min": 36500001, "max": 50000000},
		{"rank": "S+", "min": 50000001, "max": 2147483647}  # int max
	]

	var hardcore_ranks: Array = [
		{"rank": "ζ", "min": 0, "max": 500000},
		{"rank": "ε", "min": 500001, "max": 1000000},
		{"rank": "δ", "min": 1000001, "max": 2000000},
		{"rank": "γ", "min": 2000001, "max": 3500000},
		{"rank": "β", "min": 3500001, "max": 5000000},
		{"rank": "Ω", "min": 5000001, "max": 2147483647}
	]

	var ranks: Array = hardcore_ranks if is_hardcore else normal_ranks

	for r in ranks:
		if points >= r["min"] and points <= r["max"]:
			return r

	return {"rank": "ζ"} if is_hardcore else {"rank": "F-"}
