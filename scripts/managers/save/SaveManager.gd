# ==============================================================
# ====================== SAVE MANAGER ==========================
# ==============================================================
# Handles all persistence operations for game configuration,
# progress saving, and automatic cleanup of old daily entries.
#
# All SaveManager-controlled keys and values are encrypted before
# being written to disk.
#
# Old plaintext saves are still readable and are automatically
# migrated to the encrypted format when they are saved again.
#
# AUTOLOAD: Available as `SaveManager` from any scene.
# Storage file: user://save_data.cfg

extends Node

# ======================= CONSTANTS =======================

const SAVE_PATH: String = "user://save_data.cfg"
const SAVE_SECTION: String = "data"


# ======================= STORAGE HELPERS =======================

# Returns the encrypted storage key for a logical key.
func get_storage_key(key: String) -> String:
	return CryptoManager.encrypt_key(key)


# Get a value from storage.
# The encrypted key is checked first.
# The plaintext key is checked second for backwards compatibility.
func get_value(key: String) -> String:
	var config := ConfigFile.new()
	var err: int = config.load(SAVE_PATH)
	if err != OK:
		return ""

	var encrypted_key: String = get_storage_key(key)
	if config.has_section_key(SAVE_SECTION, encrypted_key):
		var encrypted_value: String = config.get_value(SAVE_SECTION, encrypted_key)
		var decrypted: String = CryptoManager.decrypt_string(encrypted_value)
		if decrypted != "":
			return decrypted
		push_warning("Failed to decrypt key: " + key)
		return ""

	# Backwards compatibility with old unencrypted saves
	if config.has_section_key(SAVE_SECTION, key):
		return str(config.get_value(SAVE_SECTION, key))

	return ""


# Save a string value using an encrypted key and encrypted value.
func set_value(key: String, value) -> void:
	var config := ConfigFile.new()
	config.load(SAVE_PATH)

	var encrypted_key: String = get_storage_key(key)
	var encrypted_value: String = CryptoManager.encrypt_string(str(value))

	config.set_value(SAVE_SECTION, encrypted_key, encrypted_value)

	# Remove the old plaintext entry after successful migration
	if encrypted_key != key:
		if config.has_section_key(SAVE_SECTION, key):
			config.erase_section_key(SAVE_SECTION, key)

	config.save(SAVE_PATH)


# Remove a value using both encrypted and legacy keys.
func remove_value(key: String) -> void:
	var config := ConfigFile.new()
	config.load(SAVE_PATH)

	var encrypted_key: String = get_storage_key(key)
	if config.has_section_key(SAVE_SECTION, encrypted_key):
		config.erase_section_key(SAVE_SECTION, encrypted_key)
	if config.has_section_key(SAVE_SECTION, key):
		config.erase_section_key(SAVE_SECTION, key)

	config.save(SAVE_PATH)


# Get a JSON value.
func get_json(key: String, default_value = null):
	var value: String = get_value(key)
	if value == "":
		return default_value

	var parsed = JSON.parse_string(value)
	if parsed == null:
		push_error("Failed to parse JSON for: " + key)
		return default_value
	return parsed


# Save a JSON value.
func set_json(key: String, value) -> void:
	set_value(key, JSON.stringify(value))


# ======================= GAME CONFIGURATION =======================

# Load game configuration.
# Returns the config Dictionary, or an empty Dictionary if missing.
func load_config() -> Dictionary:
	var config_json: String = get_value("gameConfig")
	if config_json == "":
		return {}
	var parsed = JSON.parse_string(config_json)
	if parsed == null:
		return {}
	return parsed


# Save game configuration.
func save_config(config: Dictionary) -> void:
	set_value("gameConfig", JSON.stringify(config))


# ======================= USERNAME =======================

# Get the saved username.
func get_username() -> String:
	return get_value("username")


# Set the username.
func set_username(name: String) -> void:
	set_value("username", name)


# ======================= TOTAL POINTS =======================

# Get total accumulated points across all games.
func get_total_points() -> int:
	var points: String = get_value("totalPoints")
	return int(points) if points != "" else 0


# Add points to total (can be negative). Returns the new total.
func add_points(points: int) -> int:
	var current: int = get_total_points()
	var new_total: int = current + points
	set_value("totalPoints", new_total)
	print("[SaveManager] Points added: %d | Total: %d" % [points, new_total])
	return new_total


# Set total points directly.
func set_total_points(points: int) -> void:
	set_value("totalPoints", points)
	print("[SaveManager] Total points set to: %d" % points)


# Get last score from the last game.
func get_last_score() -> int:
	var score: String = get_value("lastScore")
	return int(score) if score != "" else 0


# Set last score.
func set_last_score(score: int) -> void:
	set_value("lastScore", score)


# Get old total points (saved before starting a game).
func get_old_total_points() -> int:
	var points: String = get_value("oldTotalPoints")
	return int(points) if points != "" else 0


# Set old total points (call when starting a game).
func set_old_total_points(points: int) -> void:
	set_value("oldTotalPoints", points)
	print("[SaveManager] Old total points saved: %d" % points)


# Sync old total points with current total points.
func sync_old_total_points() -> int:
	var current: int = get_total_points()
	set_old_total_points(current)
	return current


# ======================= HARDCORE TOTAL POINTS =======================

# Get hardcore total accumulated points.
func get_hardcore_total_points() -> int:
	var points: String = get_value("hardcoreTotalPoints")
	return int(points) if points != "" else 0


# Add points to hardcore total (can be negative).
func add_hardcore_points(points: int) -> int:
	var current: int = get_hardcore_total_points()
	var new_total: int = current + points
	set_value("hardcoreTotalPoints", new_total)
	print("[SaveManager] Hardcore points added: %d | Total: %d" % [points, new_total])
	return new_total


# Set hardcore total points directly.
func set_hardcore_total_points(points: int) -> void:
	set_value("hardcoreTotalPoints", points)
	print("[SaveManager] Hardcore total points set to: %d" % points)


# Get old hardcore total points.
func get_old_hardcore_total_points() -> int:
	var points: String = get_value("oldHardcoreTotalPoints")
	return int(points) if points != "" else 0


# Set old hardcore total points.
func set_old_hardcore_total_points(points: int) -> void:
	set_value("oldHardcoreTotalPoints", points)
	print("[SaveManager] Old hardcore total points saved: %d" % points)


# Sync old hardcore total points with current.
func sync_old_hardcore_total_points() -> int:
	var current: int = get_hardcore_total_points()
	set_old_hardcore_total_points(current)
	return current


# ======================= LEGACY MODE PROGRESS =======================

# Get current legacy level.
func get_legacy_level() -> int:
	var level: String = get_value("legacy_level")
	return int(level) if level != "" else 1


# Set legacy level. Also updates the high score.
func set_legacy_level(level: int) -> void:
	set_value("legacy_level", level)
	update_legacy_high_score(level)


# Get legacy high score (highest level ever reached).
func get_legacy_high_score() -> int:
	var high_score: String = get_value("legacy_highscore")
	return int(high_score) if high_score != "" else 1


# Update legacy high score if the new level is higher.
func update_legacy_high_score(level: int) -> void:
	var current_high: int = get_legacy_high_score()
	if level > current_high:
		set_value("legacy_highscore", level)
		print("[SaveManager] New legacy high score: %d" % level)


# Clear legacy progress (when losing).
func clear_legacy_progress() -> void:
	remove_value("legacy_level")
	set_value("legacy_level", 1)


# Reset legacy high score.
func reset_legacy_high_score() -> void:
	remove_value("legacy_highscore")
	print("[SaveManager] Legacy high score reset")


# ======================= HARDCORE MODE PROGRESS =======================

# Get current hardcore level.
func get_hardcore_level() -> int:
	var level: String = get_value("hardcore_level")
	return int(level) if level != "" else 1


# Set hardcore level. Also updates the high score.
func set_hardcore_level(level: int) -> void:
	set_value("hardcore_level", level)
	update_hardcore_high_score(level)


# Get hardcore high score (highest level ever reached).
func get_hardcore_high_score() -> int:
	var high_score: String = get_value("hardcore_highscore")
	return int(high_score) if high_score != "" else 1


# Update hardcore high score if the new level is higher.
func update_hardcore_high_score(level: int) -> void:
	var current_high: int = get_hardcore_high_score()
	if level > current_high:
		set_value("hardcore_highscore", level)
		print("[SaveManager] New hardcore high score: %d" % level)


# Clear hardcore progress (when losing).
func clear_hardcore_progress() -> void:
	remove_value("hardcore_level")
	set_value("hardcore_level", 1)


# Reset hardcore high score.
func reset_hardcore_high_score() -> void:
	remove_value("hardcore_highscore")
	print("[SaveManager] Hardcore high score reset")


# ======================= HARDCORE CHARACTER =======================

# Get saved hardcore character.
func get_hardcore_character() -> String:
	return get_value("hardcoreCharacter")


# Set hardcore character.
func set_hardcore_character(char: String) -> void:
	set_value("hardcoreCharacter", char)
	print("[SaveManager] Hardcore character saved: " + char)


# Clear hardcore character.
func clear_hardcore_character() -> void:
	remove_value("hardcoreCharacter")
	print("[SaveManager] Hardcore character cleared")


# ======================= HARDCORE HEALTH =======================

# Get saved hardcore health. Returns -1 if not set.
func get_hardcore_health() -> int:
	var hp: String = get_value("hardcoreHealth")
	return int(hp) if hp != "" else -1


# Set hardcore health.
func set_hardcore_health(hp: int) -> void:
	set_value("hardcoreHealth", hp)
	print("[SaveManager] Hardcore health saved: %d" % hp)


# Clear hardcore health.
func clear_hardcore_health() -> void:
	remove_value("hardcoreHealth")
	print("[SaveManager] Hardcore health cleared")


# Clear ALL hardcore data.
func clear_hardcore_all() -> void:
	clear_hardcore_keychains()
	clear_hardcore_keychain_uses()
	clear_hardcore_character()
	clear_hardcore_health()
	print("[SaveManager] All hardcore data cleared")


# ======================= DAILY MODE =======================

# Get today's date string (YYYY-MM-DD).
func get_today_string() -> String:
	return Time.get_date_string_from_system()


# Check if daily was attempted today.
func is_daily_attempted_today() -> bool:
	var today: String = get_today_string()
	var last_played: String = get_value("lastDailyPlayed")
	return last_played == today


# Mark daily as completed today.
func mark_daily_completed() -> void:
	var today: String = get_today_string()
	set_value("lastDailyPlayed", today)
	update_daily_streak(true)
	print("[SaveManager] Daily marked as completed for: " + today)


# Mark daily as failed today.
func mark_daily_failed() -> void:
	var today: String = get_today_string()
	set_value("lastDailyPlayed", today)
	update_daily_streak(false)
	print("[SaveManager] Daily marked as failed for: " + today)


# ======================= DAILY STREAK =======================

# Get current daily streak (consecutive wins).
func get_daily_streak() -> int:
	var streak: String = get_value("daily_streak")
	return int(streak) if streak != "" else 0


# Set daily streak.
func set_daily_streak(streak: int) -> void:
	set_value("daily_streak", streak)
	print("[SaveManager] Daily streak updated: %d" % streak)


# Update streak based on today's result.
func update_daily_streak(completed: bool) -> void:
	print("[SaveManager] updateDailyStreak - completed: %s" % completed)

	if completed:
		var current_streak: int = get_daily_streak()
		var new_streak: int = current_streak + 1
		set_daily_streak(new_streak)
		update_daily_record()
		print("[SaveManager] Streak increased from %d to %d" % [current_streak, new_streak])
	else:
		set_daily_streak(0)
		print("[SaveManager] Streak reset to 0 due to loss")


# Get the highest daily streak ever achieved.
func get_daily_record() -> int:
	var record: String = get_value("dailyRecord")
	return int(record) if record != "" else 0


# Set daily record (only if higher). Returns true if updated.
func set_daily_record(streak: int) -> bool:
	var current: int = get_daily_record()
	if streak > current:
		set_value("dailyRecord", streak)
		print("[SaveManager] New daily record: %d" % streak)
		return true
	return false


# Update the daily record based on the current streak.
func update_daily_record() -> bool:
	return set_daily_record(get_daily_streak())


# ======================= AVATAR =======================

# Get the saved avatar ID (1-6).
func get_avatar() -> int:
	var avatar: String = get_value("avatar")
	return int(avatar) if avatar != "" else 1


# Set avatar ID.
func set_avatar(id: int) -> void:
	set_value("avatar", id)


# ======================= SECRET CODES =======================

# Check if a secret code is activated.
func is_secret_code_activated(code: String) -> bool:
	return get_value("secret_%s" % code) == "true"


# Activate a secret code.
func activate_secret_code(code: String) -> void:
	set_value("secret_%s" % code, "true")
	print("[SaveManager] Secret code activated: " + code)


# Deactivate a secret code.
func deactivate_secret_code(code: String) -> void:
	remove_value("secret_%s" % code)


# Get all activated codes.
func get_activated_codes() -> Array:
	var codes: Array = []
	if is_secret_code_activated("back2school"):
		codes.append("back2school")
	if is_secret_code_activated("masiosare"):
		codes.append("masiosare")
	if is_secret_code_activated("debugthis"):
		codes.append("debugthis")
	return codes


# ======================= DEBUG MODE =======================

func is_debug_mode_enabled() -> bool:
	return get_value("debug_mode") == "true"


func set_debug_mode(enabled: bool) -> void:
	set_value("debug_mode", "true" if enabled else "false")


# ======================= TUTORIAL =======================

# Check if the tutorial has been completed.
func is_tutorial_completed() -> bool:
	return get_value("tutorialCompleted") == "true"


# Mark the tutorial as completed (or not).
func set_tutorial_completed(completed: bool = true) -> void:
	set_value("tutorialCompleted", "true" if completed else "false")


# Reset the tutorial (so it shows again).
func reset_tutorial() -> void:
	remove_value("tutorialCompleted")


# ======================= LEGACY KEYCHAINS =======================

# Get saved legacy keychains.
func get_legacy_keychains() -> Array:
	return get_json("legacyKeychains", [])


# Set legacy keychains.
func set_legacy_keychains(keychains: Array) -> void:
	set_json("legacyKeychains", keychains)
	print("[SaveManager] Legacy keychains saved: ", keychains)


# Clear legacy keychains (when dying).
func clear_legacy_keychains() -> void:
	remove_value("legacyKeychains")
	print("[SaveManager] Legacy keychains cleared")


# Get saved legacy keychain uses.
func get_legacy_keychain_uses() -> Dictionary:
	return get_json("legacyKeychainUses", {})


# Set legacy keychain uses.
func set_legacy_keychain_uses(uses: Dictionary) -> void:
	set_json("legacyKeychainUses", uses)
	print("[SaveManager] Legacy keychain uses saved: ", uses)


# Clear legacy keychain uses (when dying).
func clear_legacy_keychain_uses() -> void:
	remove_value("legacyKeychainUses")
	print("[SaveManager] Legacy keychain uses cleared")


# ======================= STUFFED KEYCHAINS =======================

# Get saved legacy stuffed keychains.
func get_legacy_stuffed_keychains() -> Array:
	return get_json("legacyStuffedKeychains", [])


# Set legacy stuffed keychains.
func set_legacy_stuffed_keychains(keychains: Array) -> void:
	set_json("legacyStuffedKeychains", keychains)
	print("[SaveManager] Legacy stuffed keychains saved: ", keychains)


# Clear legacy stuffed keychains.
func clear_legacy_stuffed_keychains() -> void:
	remove_value("legacyStuffedKeychains")
	print("[SaveManager] Legacy stuffed keychains cleared")


# Get hardcore stuffed keychains.
func get_hardcore_stuffed_keychains() -> Array:
	return get_json("hardcoreStuffedKeychains", [])


# Set hardcore stuffed keychains.
func set_hardcore_stuffed_keychains(keychains: Array) -> void:
	set_json("hardcoreStuffedKeychains", keychains)
	print("[SaveManager] Hardcore stuffed keychains saved: ", keychains)


# Clear hardcore stuffed keychains.
func clear_hardcore_stuffed_keychains() -> void:
	remove_value("hardcoreStuffedKeychains")
	print("[SaveManager] Hardcore stuffed keychains cleared")


# ======================= HARDCORE KEYCHAINS =======================

# Get saved hardcore keychains.
func get_hardcore_keychains() -> Array:
	return get_json("hardcoreKeychains", [])


# Set hardcore keychains.
func set_hardcore_keychains(keychains: Array) -> void:
	set_json("hardcoreKeychains", keychains)
	print("[SaveManager] Hardcore keychains saved: ", keychains)


# Clear hardcore keychains.
func clear_hardcore_keychains() -> void:
	remove_value("hardcoreKeychains")
	print("[SaveManager] Hardcore keychains cleared")


# Get saved hardcore keychain uses.
func get_hardcore_keychain_uses() -> Dictionary:
	return get_json("hardcoreKeychainUses", {})


# Set hardcore keychain uses.
func set_hardcore_keychain_uses(uses: Dictionary) -> void:
	set_json("hardcoreKeychainUses", uses)
	print("[SaveManager] Hardcore keychain uses saved: ", uses)


# Clear hardcore keychain uses.
func clear_hardcore_keychain_uses() -> void:
	remove_value("hardcoreKeychainUses")
	print("[SaveManager] Hardcore keychain uses cleared")


# ======================= CUSTOM KEYCHAINS =======================

# Get saved custom keychains.
func get_custom_keychains() -> Array:
	return get_json("customKeychains", [])


# Set custom keychains.
func set_custom_keychains(keychains: Array) -> void:
	set_json("customKeychains", keychains)
	print("[SaveManager] Custom keychains saved: ", keychains)


# ======================= SETTINGS =======================

# Get the saved language preference.
func get_language() -> String:
	var lang: String = get_value("language")
	return lang if lang != "" else "en"


# Set the language preference.
func set_language(lang: String) -> void:
	set_value("language", lang)


# Get the SFX enabled state.
func is_sfx_enabled() -> bool:
	var value: String = get_value("sfxEnabled")
	return value != "false" if value != "" else true


# Set the SFX enabled state.
func set_sfx_enabled(enabled: bool) -> void:
	set_value("sfxEnabled", "true" if enabled else "false")


# Get the music volume (0-100).
func get_music_volume() -> int:
	var volume: String = get_value("musicVolume")
	return int(volume) if volume != "" else 50


# Set the music volume.
func set_music_volume(volume: int) -> void:
	set_value("musicVolume", clampi(volume, 0, 100))


# Get the SFX volume (0-100).
func get_sfx_volume() -> int:
	var volume: String = get_value("sfxVolume")
	return int(volume) if volume != "" else 50


# Set the SFX volume.
func set_sfx_volume(volume: int) -> void:
	set_value("sfxVolume", clampi(volume, 0, 100))


# ======================= TOUCH BUTTONS =======================

# Get the touch button setting.
func get_touch_enabled() -> bool:
	var value: String = get_value("touchEnabled")
	return value != "false" if value != "" else true


# Set the touch button setting.
func set_touch_enabled(enabled: bool) -> void:
	set_value("touchEnabled", "true" if enabled else "false")


# ======================= FALL DAMAGE =======================

# Get the fall damage setting.
func is_fall_damage_enabled() -> bool:
	var value: String = get_value("fallDamageEnabled")
	return value == "true"


# Set the fall damage setting.
func set_fall_damage_enabled(enabled: bool) -> void:
	set_value("fallDamageEnabled", "true" if enabled else "false")


# ======================= HARDCORE =======================

# Get the hardcore mode setting.
func is_hardcore_enabled() -> bool:
	var value: String = get_value("hardcoreEnabled")
	return value == "true"


# Set the hardcore mode setting.
func set_hardcore_enabled(enabled: bool) -> void:
	set_value("hardcoreEnabled", "true" if enabled else "false")


# ======================= UTILITY =======================

# Clear EVERYTHING — nuclear option.
func clear_all_game_data() -> void:
	var dir := DirAccess.open("user://")
	if dir != null:
		for file in dir.get_files():
			dir.remove(file)
	print("[SaveManager] Complete storage wipe executed")


# Get the total size of storage (for debugging).
func get_storage_size() -> int:
	var dir := DirAccess.open("user://")
	if dir == null:
		return 0
	var total: int = 0
	for file in dir.get_files():
		total += FileAccess.get_file_as_string("user://" + file).length()
	return total


# Log all stored keys (for debugging).
func log_all_keys() -> void:
	print("=== Storage contents ===")
	var config := ConfigFile.new()
	var err: int = config.load(SAVE_PATH)
	if err != OK:
		print("(empty)")
		return
	for key in config.get_section_keys(SAVE_SECTION):
		var value = config.get_value(SAVE_SECTION, key)
		print("%s: %s" % [key, str(value)])
	print("Total size: ~%d KB" % int(get_storage_size() / 1024.0))
