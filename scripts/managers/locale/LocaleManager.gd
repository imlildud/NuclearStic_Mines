# ==============================================================
# ====================== LOCALE MANAGER ========================
# ==============================================================
# Handles loading and applying localization strings.
# Supports multiple languages via JSON files.

extends Node

# ======================= STATE =======================

var current_locale: String = ""
var strings: Dictionary = {}
var listeners: Array = []         # Array[Callable]
var supported_locales: Array = ["en", "es", "mx"]
var default_locale: String = "en"


# ======================= INITIALIZATION =======================

# Loads the initial locale at startup.
# Uses the saved language, or the default if none is set.
func _ready() -> void:
	_initialize_locale()


func _initialize_locale() -> void:
	var saved_lang: String = SaveManager.get_language()
	if saved_lang == "" or not supported_locales.has(saved_lang):
		saved_lang = default_locale
		SaveManager.set_language(saved_lang)
	current_locale = saved_lang
	load_locale(current_locale)


# Returns the initial locale based on saved settings.
func get_initial_locale() -> String:
	var saved_lang: String = SaveManager.get_language()
	if saved_lang == "" or not supported_locales.has(saved_lang):
		return default_locale
	return saved_lang


# Loads a locale file. Falls back to English if it fails.
func load_locale(locale: String) -> void:
	if not supported_locales.has(locale):
		locale = default_locale

	var path: String = "res://assets/locales/%s.json" % locale
	print("[LocaleManager] Loading locale from: " + path)

	if not FileAccess.file_exists(path):
		push_error("Locale file not found: " + path)
		if locale != default_locale:
			load_locale(default_locale)
		return

	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_error("Failed to open locale file: " + path)
		if locale != default_locale:
			load_locale(default_locale)
		return

	var content: String = file.get_as_text()
	file.close()

	var parsed = JSON.parse_string(content)
	if parsed == null or not (parsed is Dictionary):
		push_error("Failed to parse locale JSON: " + path)
		if locale != default_locale:
			load_locale(default_locale)
		return

	strings = parsed
	current_locale = locale
	notify_listeners()


# ======================= GETTERS =======================

# Returns the translated string for the given key.
# Keys use dot notation: "menu.play", "tutorial.phase1.dialog1".
# Falls back to the key itself if the translation is missing.
func get(key: String) -> String:
	if strings.is_empty():
		return key

	var keys: PackedStringArray = key.split(".")
	var value = strings

	for k in keys:
		if not (value is Dictionary) or not value.has(k):
			return key
		value = value[k]

	return str(value)


# Returns the current locale code ("en", "es", "mx").
func get_current_locale() -> String:
	return current_locale


# Returns the list of supported locales.
func get_supported_locales() -> Array:
	return supported_locales.duplicate()


# ======================= LISTENERS =======================

# Register a callback to be notified when the locale changes.
# The callback receives (locale: String, strings: Dictionary).
func on_change(callback: Callable) -> void:
	listeners.append(callback)


# Notify all listeners with the new locale and strings.
func notify_listeners() -> void:
	for listener in listeners:
		listener.call(current_locale, strings)


# ======================= SETTERS =======================

# Change the current locale and save it.
func set_locale(locale: String) -> void:
	if locale == current_locale:
		return
	if not supported_locales.has(locale):
		return

	load_locale(locale)
	SaveManager.set_language(locale)
