# ==============================================================
# ====================== CONFIGURATION =========================
# ==============================================================

extends Control

signal closed

const GAME_SCENE := "res://scenes/game/Game.tscn"
const MANUAL_URL := "https://github.com/imlildud/NuclearStic_Mines/wiki"
const SAVE_PATH := "user://save_data.cfg"

const TOGGLE_OFF_BG := Color("#090400")
const TOGGLE_ON_BG := Color("#b56b39")
const KNOB_OFF_BG := Color("#e8d0b5")
const KNOB_ON_BG := Color("#fffdfa")

# ======================= NODES =======================

@onready var title_rect: TextureRect = $ScrollContainer/Card/Title
@onready var close_button: TextureButton = $ScrollContainer/Card/CloseButton
@onready var volume_title: Label = $ScrollContainer/Card/VolumeSection/VolumeTitle
@onready var music_label: Label = $ScrollContainer/Card/VolumeSection/MusicLabel
@onready var music_slider: HSlider = $ScrollContainer/Card/VolumeSection/MusicSlider
@onready var music_percent: Label = $ScrollContainer/Card/VolumeSection/MusicPercent
@onready var sfx_label: Label = $ScrollContainer/Card/VolumeSection/SfxLabel
@onready var sfx_slider: HSlider = $ScrollContainer/Card/VolumeSection/SfxSlider
@onready var sfx_percent: Label = $ScrollContainer/Card/VolumeSection/SfxPercent

@onready var language_title: Label = $ScrollContainer/Card/LanguageSection/LanguageTitle
@onready var lang_en_button: Button = $ScrollContainer/Card/LanguageSection/LangEnButton
@onready var lang_es_button: Button = $ScrollContainer/Card/LanguageSection/LangEsButton

@onready var gameplay_title: Label = $ScrollContainer/Card/GameplaySection/GameplayTitle
@onready var touch_label: Label = $ScrollContainer/Card/GameplaySection/TouchLabel
@onready var touch_toggle: Panel = $ScrollContainer/Card/GameplaySection/TouchToggle
@onready var fall_label: Label = $ScrollContainer/Card/GameplaySection/FallLabel
@onready var fall_toggle: Panel = $ScrollContainer/Card/GameplaySection/FallToggle
@onready var hardcore_label: Label = $ScrollContainer/Card/GameplaySection/HardcoreLabel
@onready var hardcore_toggle: Panel = $ScrollContainer/Card/GameplaySection/HardcoreToggle

@onready var other_title: Label = $ScrollContainer/Card/OtherSection/OtherTitle
@onready var replay_button: Button = $ScrollContainer/Card/OtherSection/ReplayButton
@onready var manual_button: Button = $ScrollContainer/Card/OtherSection/ManualButton

@onready var online_title: Label = $ScrollContainer/Card/GameplaySection/OnlineTitle
@onready var online_label: Label = $ScrollContainer/Card/GameplaySection/OnlineLabel

@onready var export_button: TextureButton = $ScrollContainer/Card/ExportButton
@onready var save_button: TextureButton = $ScrollContainer/Card/SaveButton
@onready var save_label: Label = $ScrollContainer/Card/SaveButton/SaveLabel
@onready var import_button: TextureButton = $ScrollContainer/Card/ImportButton

@onready var modal_dialog = $ModalDialog
@onready var secret_modal: Control = $SecretModal
@onready var secret_input: LineEdit = $SecretModal/Center/Card/Content/SecretInput
@onready var secret_message: Label = $SecretModal/Center/Card/Content/SecretMessage
@onready var secret_submit: Button = $SecretModal/Center/Card/Content/SecretButtons/SecretSubmit
@onready var secret_cancel: Button = $SecretModal/Center/Card/Content/SecretButtons/SecretCancel
@onready var file_dialog: FileDialog = $FileDialog

# ======================= STATE =======================

var _touch_enabled: bool = true
var _fall_damage_enabled: bool = false
var _hardcore_enabled: bool = false

# Pending toggle waiting for the warning modal OK ("falldamage"/"hardcore").
var _pending_warning: String = ""
var _file_dialog_mode: String = ""  # "export" | "import"

var _secret_click_count: int = 0
var _secret_click_deadline_msec: int = 0


# ======================= LIFECYCLE =======================

func _ready() -> void:
	visible = false

	# Volume.
	music_slider.value_changed.connect(_on_music_volume_changed)
	sfx_slider.value_changed.connect(_on_sfx_volume_changed)

	# Language.
	lang_en_button.pressed.connect(func(): _set_language("en"))
	lang_es_button.pressed.connect(func(): _set_language("es"))

	# Toggles (custom pill switches — see _setup_toggle).
	_setup_toggle(touch_toggle, "touch")
	_setup_toggle(fall_toggle, "falldamage")
	_setup_toggle(hardcore_toggle, "hardcore")

	# Other.
	replay_button.pressed.connect(_on_replay_pressed)
	manual_button.pressed.connect(_on_manual_pressed)

	# Save row / close.
	export_button.pressed.connect(_on_export_pressed)
	import_button.pressed.connect(_on_import_pressed)
	save_button.pressed.connect(_on_save_pressed)
	close_button.pressed.connect(_on_close_pressed)

	# Title = secret codes (5 clicks within 3 seconds, like the web).
	title_rect.gui_input.connect(_on_title_gui_input)

	# Warning / info modal (OK-only).
	modal_dialog.closed.connect(_on_modal_closed)

	# Secret code modal.
	secret_submit.pressed.connect(_on_secret_submit)
	secret_cancel.pressed.connect(_on_secret_cancel)
	secret_input.text_submitted.connect(func(_text: String): _on_secret_submit())

	# Import/export file picker.
	file_dialog.file_selected.connect(_on_file_selected)
	ButtonFeedback.attach_all(self)


# Shows the screen (called by MainMenu) and refreshes every control
# from the saved settings.
func open() -> void:
	visible = true
	_refresh_all()
	AudioManager.play_config_music(true)
	if DiscordRPC.has_method("update_presence"):
		DiscordRPC.update_presence(
			"⚙️ Adjusting settings",
			"Configuring game options",
			{"largeImageKey": "nuclearstic_logo"}
		)


# ======================= REFRESH =======================

func _refresh_all() -> void:
	# Volume (0-100, default 50 — same as the web sliders).
	var music_vol: int = SaveManager.get_music_volume()
	var sfx_vol: int = SaveManager.get_sfx_volume()
	music_slider.set_value_no_signal(music_vol)
	sfx_slider.set_value_no_signal(sfx_vol)
	music_percent.text = "%d%%" % music_vol
	sfx_percent.text = "%d%%" % sfx_vol
	AudioManager.set_music_volume(music_vol / 100.0)
	AudioManager.set_sfx_volume(sfx_vol / 100.0)
	AudioManager.set_sfx_enabled(SaveManager.is_sfx_enabled())
	AudioManager.update_all_volumes()

	# Toggles.
	_touch_enabled = SaveManager.get_touch_enabled()
	_fall_damage_enabled = SaveManager.is_fall_damage_enabled()
	_hardcore_enabled = SaveManager.is_hardcore_enabled()
	_update_toggle_visual(touch_toggle, _touch_enabled, false)
	_update_toggle_visual(fall_toggle, _fall_damage_enabled, false)
	_update_toggle_visual(hardcore_toggle, _hardcore_enabled, false)

	_update_lang_buttons()
	apply_language()


# Rewrites every label from the current locale (config.* keys).
func apply_language() -> void:
	volume_title.text = LocaleManager.get_translation("config.volume")
	music_label.text = LocaleManager.get_translation("config.music")
	sfx_label.text = LocaleManager.get_translation("config.sfx")
	language_title.text = LocaleManager.get_translation("config.language")
	gameplay_title.text = LocaleManager.get_translation("config.gameplay")
	touch_label.text = LocaleManager.get_translation("config.showTouch")
	fall_label.text = LocaleManager.get_translation("config.fallDamage")
	hardcore_label.text = LocaleManager.get_translation("config.hardcore")
	other_title.text = LocaleManager.get_translation("config.other")
	replay_button.text = LocaleManager.get_translation("config.replayTutorial")
	manual_button.text = LocaleManager.get_translation("config.manual")
	lang_en_button.text = LocaleManager.get_translation("config.langEn")
	lang_es_button.text = LocaleManager.get_translation("config.langEs")
	save_label.text = LocaleManager.get_translation("config.save")
	online_title.text = "Online Features"
	online_label.text = "Daily Leaderboard — 1.1.0"


# ======================= VOLUME =======================

func _on_music_volume_changed(value: float) -> void:
	var percent: int = int(value)
	music_percent.text = "%d%%" % percent
	AudioManager.set_music_volume(percent / 100.0)
	SaveManager.set_music_volume(percent)
	AudioManager.update_all_volumes()


func _on_sfx_volume_changed(value: float) -> void:
	var percent: int = int(value)
	sfx_percent.text = "%d%%" % percent
	AudioManager.set_sfx_volume(percent / 100.0)
	SaveManager.set_sfx_volume(percent)
	AudioManager.update_all_volumes()


# ======================= LANGUAGE =======================

func _set_language(lang: String) -> void:
	if LocaleManager.get_current_locale() == lang:
		return
	LocaleManager.set_locale(lang)  # also SaveManager.set_language(lang)
	_update_lang_buttons()
	apply_language()


func _update_lang_buttons() -> void:
	var current: String = LocaleManager.get_current_locale()
	_set_lang_button_active(lang_en_button, current == "en")
	_set_lang_button_active(lang_es_button, current == "es")


func _set_lang_button_active(button: Button, active: bool) -> void:
	# Web .active: gold glow + scale 1.04.
	button.modulate = Color(1.15, 1.05, 0.7, 1.0) if active else Color(1, 1, 1, 1)
	button.scale = Vector2(1.04, 1.04) if active else Vector2.ONE


# ======================= TOGGLES =======================

func _setup_toggle(toggle: Panel, kind: String) -> void:
	toggle.gui_input.connect(func(event: InputEvent) -> void:
		if event is InputEventMouseButton:
			var mb := event as InputEventMouseButton
			if mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT:
				_on_toggle_pressed(kind)
	)


func _on_toggle_pressed(kind: String) -> void:
	match kind:
		"touch":
			_touch_enabled = not _touch_enabled
			SaveManager.set_touch_enabled(_touch_enabled)
			_update_toggle_visual(touch_toggle, _touch_enabled, true)
		"falldamage":
			if not _fall_damage_enabled:
				# Enabling asks first (softlock risk) — like the web.
				_pending_warning = "falldamage"
				modal_dialog.show_message(
					LocaleManager.get_translation("config.fallDamageWarning")
				)
			else:
				_fall_damage_enabled = false
				SaveManager.set_fall_damage_enabled(false)
				_update_toggle_visual(fall_toggle, false, true)
		"hardcore":
			if not _hardcore_enabled:
				_pending_warning = "hardcore"
				modal_dialog.show_message(
					LocaleManager.get_translation("config.hardcoreWarning")
				)
			else:
				_hardcore_enabled = false
				SaveManager.set_hardcore_enabled(false)
				_update_toggle_visual(hardcore_toggle, false, true)


# OK on the warning modal = confirm the pending toggle.
func _on_modal_closed() -> void:
	match _pending_warning:
		"falldamage":
			_fall_damage_enabled = true
			SaveManager.set_fall_damage_enabled(true)
			_update_toggle_visual(fall_toggle, true, true)
		"hardcore":
			_hardcore_enabled = true
			SaveManager.set_hardcore_enabled(true)
			_update_toggle_visual(hardcore_toggle, true, true)
	_pending_warning = ""


func _update_toggle_visual(toggle: Panel, active: bool, animate: bool) -> void:
	var style := toggle.get_theme_stylebox("panel") as StyleBoxFlat
	if style != null:
		style.bg_color = TOGGLE_ON_BG if active else TOGGLE_OFF_BG
	var knob := toggle.get_node_or_null("Knob") as Panel
	if knob == null:
		return
	var knob_style := knob.get_theme_stylebox("panel") as StyleBoxFlat
	if knob_style != null:
		knob_style.bg_color = KNOB_ON_BG if active else KNOB_OFF_BG
	# Off x=6, on x=61 (105 wide - 38 knob - 6 margin), like the web's
	# translateX(7.2cqi).
	var target_x: float = 61.0 if active else 6.0
	if animate:
		var tween := create_tween()
		tween.tween_property(knob, "position:x", target_x, 0.2)
	else:
		knob.position.x = target_x


# ======================= OTHER BUTTONS =======================

func _on_replay_pressed() -> void:
	AudioManager.play_click_sfx()
	SaveManager.set_tutorial_completed(false)
	var tutorial_config: Dictionary = {
		"mode": "tutorial",
		"seed": null,
		"level": 1,
		"character": "student",
		"size": 5,
		"hazards": 1,
		"obstacles": 1,
		"goals": 1,
		"zone": "backyard",
	}
	SaveManager.save_config(tutorial_config)
	GameManager.config = tutorial_config
	GameManager.set_locale_manager(LocaleManager)
	get_tree().change_scene_to_file(GAME_SCENE)


func _on_manual_pressed() -> void:
	OS.shell_open(MANUAL_URL)


# ======================= CLOSE / SAVE =======================

func _on_close_pressed() -> void:
	AudioManager.play_click_sfx()
	closed.emit()


func _on_save_pressed() -> void:
	# Everything already saved live on change; SAVE is confirm +
	# grade sound + close after 200ms, like the web.
	AudioManager.play_sfx("grade.mp3", false, 0.5)
	await get_tree().create_timer(0.2).timeout
	closed.emit()


# ======================= SECRET CODES =======================

func _on_title_gui_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton):
		return
	var mb := event as InputEventMouseButton
	if not mb.pressed or mb.button_index != MOUSE_BUTTON_LEFT:
		return
	var now_msec: int = Time.get_ticks_msec()
	if now_msec > _secret_click_deadline_msec:
		_secret_click_count = 0
	_secret_click_count += 1
	_secret_click_deadline_msec = now_msec + 3000
	if _secret_click_count >= 5:
		_secret_click_count = 0
		_show_secret_modal()


func _show_secret_modal() -> void:
	secret_input.text = ""
	secret_message.text = ""
	secret_modal.visible = true
	secret_input.grab_focus()


func _on_secret_cancel() -> void:
	secret_modal.visible = false


func _on_secret_submit() -> void:
	var code: String = secret_input.text.strip_edges().to_lower()
	secret_modal.visible = false
	_process_secret_code(code)


func _process_secret_code(code: String) -> void:
	if code == "":
		return
	match code:
		"back2school":
			if not SaveManager.is_secret_code_activated("back2school"):
				SaveManager.activate_secret_code("back2school")
				modal_dialog.show_message(
					LocaleManager.get_translation("config.secretBack2school")
				)
			else:
				modal_dialog.show_message(
					LocaleManager.get_translation("config.secretAlready")
				)
		"masiosare":
			LocaleManager.set_locale("mx")
			_update_lang_buttons()
			apply_language()
			modal_dialog.show_message(
				LocaleManager.get_translation("config.secretMasiosare")
			)
		"debugthis":
			var test_config: Dictionary = {
				"mode": "test",
				"seed": null,
				"level": 1,
				"character": "scout",
				"size": 24,
				"hazards": 1,
				"obstacles": 1,
				"goals": 1,
				"zone": "backyard",
			}
			SaveManager.save_config(test_config)
			GameManager.config = test_config
			GameManager.set_locale_manager(LocaleManager)
			get_tree().change_scene_to_file(GAME_SCENE)
		_:
			modal_dialog.show_message(
				LocaleManager.get_translation("config.secretInvalid")
			)


# ======================= IMPORT / EXPORT =======================

func _on_export_pressed() -> void:
	_file_dialog_mode = "export"
	file_dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
	file_dialog.current_file = "nuclearstic_save_%d.json" % Time.get_unix_time_from_system()
	file_dialog.popup_centered(Vector2i(700, 450))


func _on_import_pressed() -> void:
	_file_dialog_mode = "import"
	file_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	file_dialog.filters = PackedStringArray(["*.json ; JSON backup"])
	file_dialog.popup_centered(Vector2i(700, 450))


func _on_file_selected(path: String) -> void:
	if _file_dialog_mode == "export":
		if _copy_file(SAVE_PATH, path):
			modal_dialog.show_message(
				LocaleManager.get_translation("config.exportSuccess")
			)
		else:
			modal_dialog.show_message(
				LocaleManager.get_translation("config.exportManual")
			)
	elif _file_dialog_mode == "import":
		# 1) Godot backup: a ConfigFile with the save section.
		var probe := ConfigFile.new()
		if probe.load(path) == OK and probe.has_section("data"):
			if _copy_file(path, SAVE_PATH):
				modal_dialog.show_message(
					LocaleManager.get_translation("config.importSuccess")
				)
				# Re-apply the imported settings without a full restart.
				LocaleManager.load_locale(SaveManager.get_language())
				_refresh_all()
			else:
				modal_dialog.show_message(
					LocaleManager.get_translation("config.importError")
				)
			return
		# 2) Web backup: a flat JSON dump of localStorage (e.g.
		# lildud.json). Before this, it failed the ConfigFile probe
		# above and the import always errored — that's why old web
		# saves never loaded. See _import_web_json().
		if _import_web_json(path):
			modal_dialog.show_message(
				LocaleManager.get_translation("config.importSuccess")
			)
			LocaleManager.load_locale(SaveManager.get_language())
			_refresh_all()
		else:
			modal_dialog.show_message(
				LocaleManager.get_translation("config.importError")
			)


# Imports a web localStorage JSON dump into the Godot save file.
# Returns false when the file is not a valid web save.
func _import_web_json(path: String) -> bool:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return false
	var parsed = JSON.parse_string(file.get_as_text())
	file.close()
	if not (parsed is Dictionary) or parsed.is_empty():
		return false
	# Sanity check: a real web save has encrypted entries, or at
	# least the plain settings keys. Anything else is not a save.
	var looks_like_save: bool = false
	for key in parsed.keys():
		if str(key).begins_with("NSK1:") or str(key) == "language" or str(key) == "username":
			looks_like_save = true
			break
	if not looks_like_save:
		return false

	# Encrypted entries go straight into the ConfigFile as-is.
	var config := ConfigFile.new()
	for key in parsed.keys():
		if str(key).begins_with("NSK1:"):
			config.set_value("data", str(key), str(parsed[key]))
	config.save(SAVE_PATH)

	# Plaintext keys are re-saved encrypted, like a Godot save.
	# (set_value loads/saves the file each time, so this runs after
	# the encrypted entries above are already on disk.)
	for key in parsed.keys():
		if not str(key).begins_with("NSK1:"):
			SaveManager.set_value(str(key), str(parsed[key]))
	return true


func _copy_file(from_path: String, to_path: String) -> bool:
	var src := FileAccess.open(from_path, FileAccess.READ)
	if src == null:
		return false
	var bytes: PackedByteArray = src.get_buffer(src.get_length())
	src.close()
	var dst := FileAccess.open(to_path, FileAccess.WRITE)
	if dst == null:
		return false
	dst.store_buffer(bytes)
	dst.close()
	return true
