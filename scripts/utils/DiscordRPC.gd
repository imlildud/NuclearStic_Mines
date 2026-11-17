# ==============================================================
# ==================== DISCORD RPC =============================
# ==============================================================
# Handles Discord Rich Presence integration (desktop only).
#
# Backend: the vaporvee "Discord RPC" addon (Asset Library 1.3.2,
# Godot 4.4+). It registers an engine singleton called DiscordRPC
# (GDExtension) plus a DiscordRPCLoader autoload that runs the SDK
# callbacks in the background.

extends Node

const APP_ID: int = 1532240298930077728

# The addon's engine singleton (null when the addon is not loaded:
# mobile/web exports, plugin disabled, or APP_ID not set).
var _sdk = null


# ======================= LIFECYCLE =======================

func _ready() -> void:
	# No addon, no singleton (mobile/web, plugin disabled): no-op.
	if not Engine.has_singleton("DiscordRPC"):
		push_warning("[RPC] Discord addon not loaded (desktop only), presence disabled")
		return
	if APP_ID == 0:
		push_warning("[RPC] APP_ID is 0: paste your Discord Application ID in DiscordRCP.gd")
		return
	_sdk = Engine.get_singleton("DiscordRPC")
	_sdk.app_id = APP_ID
	# Elapsed-time counter starts at launch.
	_sdk.start_timestamp = int(Time.get_unix_time_from_system())
	update_presence("In the menu", "Preparing for adventure", {"largeImageKey": "nuclearstic_logo"})


# ======================= PRESENCE UPDATE =======================

# Updates Discord Rich Presence with the given state.
# Returns true if Discord is connected and the update was sent.
func update_presence(details: String, state: String, extra: Dictionary = {}) -> bool:
	if _sdk == null:
		return false
	_sdk.details = details
	_sdk.state = state
	_sdk.large_image = str(extra.get("largeImageKey", "nuclearstic_logo"))
	_sdk.large_image_text = str(extra.get("largeImageText", ""))
	_sdk.small_image = str(extra.get("smallImageKey", ""))
	_sdk.small_image_text = str(extra.get("smallImageText", ""))
	_sdk.refresh()
	# Values are staged even if Discord is not running yet; the next
	# refresh sends them once it connects.
	return bool(_sdk.get_is_discord_working())


# Returns true if the Discord RPC addon is ready (live connection).
func is_ready() -> bool:
	if _sdk == null:
		return false
	return bool(_sdk.get_is_discord_working())


# Resets the Discord activity timer (call on level start).
func reset_timestamp() -> void:
	if _sdk == null:
		return
	_sdk.start_timestamp = int(Time.get_unix_time_from_system())
	_sdk.refresh()


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
