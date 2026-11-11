# ==============================================================
# ===================== PUNCHCARD PANEL ========================
# ==============================================================
# Handles punchcard display, mode selection (Legacy/Daily/Custom),
# configuration generation, texture mapping, seed system, and badges.
#
# Attached to the PunchcardPanel.tscn scene.
# Opens as an overlay on top of MainMenu.

extends Control

# ======================= SIGNALS =======================

# Emitted when the player clicks Start and the config is ready.
signal start_requested(config: Dictionary)

# Emitted when the player closes the punchcard.
signal closed

# ======================= STATE =======================

var punchcard_mode: String = ""
var daily_config: Dictionary = {}
var current_config: Dictionary = {}
var locale_manager = null
var custom_keychains: Array = []


# ======================= LIFECYCLE =======================

func _ready() -> void:
	visible = false
	$ModalDialog.visible = false
	_wire_buttons()


func _wire_buttons() -> void:
	$Punchcard/CloseButton.pressed.connect(_on_close_pressed)
	$Punchcard/StartButton.pressed.connect(_on_start_pressed)
	$Punchcard/SeedButton.pressed.connect(_on_seed_pressed)
	$Punchcard/KeychainButton.pressed.connect(_on_keychain_pressed)
	$Punchcard/DiceButton.pressed.connect(_on_dice_pressed)
	$ModalDialog/ModalCard/ModalOkButton.pressed.connect(_on_modal_ok)

	# Mode-specific option buttons
	$Punchcard/CharSection/LegacyCharSelect.item_selected.connect(_on_legacy_char_changed)
	$Punchcard/SizeSection/CustomSizeSelect.item_selected.connect(_on_custom_option_changed)
	$Punchcard/HazardsSection/CustomHazardsSelect.item_selected.connect(_on_custom_option_changed)
	$Punchcard/ObstaclesSection/CustomObstaclesSelect.item_selected.connect(_on_custom_option_changed)
	$Punchcard/PalsSection/CustomPalsSelect.item_selected.connect(_on_custom_option_changed)
	$Punchcard/ZoneSection/CustomZoneSelect.item_selected.connect(_on_custom_option_changed)

	# Hover/click sounds
	for button in _get_all_buttons():
		button.mouse_entered.connect(func(): AudioManager.play_hover_sfx())


func _get_all_buttons() -> Array:
	return [
		$Punchcard/CloseButton,
		$Punchcard/StartButton,
		$Punchcard/SeedButton,
		$Punchcard/KeychainButton,
		$Punchcard/DiceButton,
		$ModalDialog/ModalCard/ModalOkButton,
	]


# ======================= PUBLIC API =======================

# Shows the punchcard in the given mode.
# `mode` is "legacy", "daily" or "custom".
func open(mode: String) -> void:
	visible = true
	match mode:
		"legacy": generate_legacy_config()
		"daily":  generate_daily_config()
		"custom": generate_custom_config()
		_:        push_error("Unknown punchcard mode: " + mode)


# Returns the current config (Dictionary).
func get_current_config() -> Dictionary:
	return current_config


func get_punchcard_mode() -> String:
	return punchcard_mode


func set_locale_manager(lm) -> void:
	locale_manager = lm


# ======================= MODE GENERATORS =======================

func generate_legacy_config() -> void:
	punchcard_mode = "legacy"
	_hide_all_selects()
	$Punchcard/TitleCustom.visible = false
	$Punchcard/TitleDaily.visible = true

	var config: Dictionary = _create_base_config()
	config["mode"] = "legacy"
	config["seed"] = generate_random_seed()
	_update_seed_display(config["seed"])

	var is_hardcore: bool = SaveManager.is_hardcore_enabled()
	var legacy_select: OptionButton = $Punchcard/CharSection/LegacyCharSelect

	var saved_level: int = SaveManager.get_hardcore_level() if is_hardcore else SaveManager.get_legacy_level()
	var level: int = maxi(saved_level, 1)
	config["level"] = level

	if is_hardcore:
		var saved_char: String = SaveManager.get_hardcore_character()
		if level > 1 and saved_char != "":
			config["character"] = saved_char
			legacy_select.select(_index_for_char(saved_char))
			legacy_select.disabled = true
			print("[Hardcore] Character locked to: ", saved_char)
		else:
			legacy_select.disabled = false

		config["pals"] = 5
		config["size"] = 12 + level
		config["hazards"] = 5 + level
		config["obstacles"] = 10 + level
		config["zone"] = "ash"
	else:
		legacy_select.disabled = false
		var pals: int = 1
		if level >= 5: pals = 2
		if level >= 10: pals = 3
		if level >= 15: pals = 4
		if level >= 20: pals = 5
		config["pals"] = pals
		config["size"] = level
		config["hazards"] = level
		config["obstacles"] = level
		config["zone"] = _get_zone_by_level(level)

	config["character"] = legacy_select.get_item_text(legacy_select.selected).to_lower()

	daily_config = config
	current_config = config
	_update_punchcard_textures(config)
	_update_punchcard_background()
	_update_punchcard_labels_color()
	_update_custom_elements_visibility(false)


func generate_daily_config() -> void:
	_hide_all_selects()
	$Punchcard/TitleCustom.visible = false
	$Punchcard/TitleDaily.visible = true

	var seed_value: int = _generate_daily_seed()
	var random: Callable = _create_seeded_random(seed_value)

	var valid_sizes: Array = [8, 12, 16, 20, 24]
	var size: int = valid_sizes[_get_random_in_range(random, 0, valid_sizes.size() - 1)]

	var config: Dictionary = _create_base_config()
	config["mode"] = "daily"
	config["seed"] = seed_value
	config["size"] = size

	var chars: Array = ["chef", "mosquito", "mommy", "scout"]
	config["character"] = chars[_get_random_in_range(random, 0, 3)]
	config["pals"] = _get_random_in_range(random, 1, 5)

	var zone_map: Dictionary = {1: "desert", 2: "snow", 3: "scrapland", 4: "roots", 5: "glowyland", 6: "ash"}
	var zone_num: int = _get_random_in_range(random, 1, 6)
	config["zone"] = zone_map[zone_num]

	config["hazards"] = _get_random_in_range(random, 1, size)
	config["obstacles"] = _get_random_in_range(random, 1, size)

	daily_config = config
	current_config = config
	_update_punchcard_textures(config)
	_update_seed_display(seed_value)

	$Punchcard/StartButton.visible = not SaveManager.is_daily_attempted_today()
	_update_custom_elements_visibility(false)


func generate_custom_config() -> void:
	punchcard_mode = "custom"
	_hide_all_selects()
	$Punchcard/DateNote.text = "Custom"

	if current_config.is_empty() or not current_config.has("seed"):
		current_config = _create_base_config()
		current_config["seed"] = generate_random_seed()
	_update_seed_display(current_config["seed"])

	$Punchcard/TitleDaily.visible = false
	$Punchcard/TitleCustom.visible = true

	$Punchcard/CharSection/CustomCharSelect.visible = true
	$Punchcard/SizeSection/CustomSizeSelect.visible = true
	$Punchcard/HazardsSection/CustomHazardsSelect.visible = true
	$Punchcard/ObstaclesSection/CustomObstaclesSelect.visible = true
	$Punchcard/PalsSection/CustomPalsSelect.visible = true
	$Punchcard/ZoneSection/CustomZoneSelect.visible = true

	# Hide badges in custom mode
	$Punchcard/LegacyBadgeContainer.visible = false
	$Punchcard/DailyBadgeContainer.visible = false

	_update_custom_elements_visibility(true)
	_load_custom_keychains()
	_update_custom_textures()


# ======================= TEXTURE UPDATES =======================

func _update_punchcard_textures(config: Dictionary) -> void:
	$Punchcard/SeedLabel.visible = true
	$Punchcard/CharSection/LegacyCharSelect.visible = false

	var seed_prefix: String = "Seed: "
	if locale_manager != null:
		seed_prefix = locale_manager.get("menu.punchcard.seed")

	if config.has("seed") and config["seed"] != null:
		$Punchcard/SeedLabel.text = "%s%s" % [seed_prefix, str(config["seed"])]
	else:
		$Punchcard/SeedLabel.text = "%s---" % seed_prefix

	if config.get("mode") == "daily":
		var today: Dictionary = Time.get_datetime_dict_from_system()
		$Punchcard/DateNote.text = "%d/%d/%d" % [today["day"], today["month"], today["year"]]
		$Punchcard/DateNote.visible = true

	if config.get("mode") == "legacy":
		$Punchcard/DateNote.text = "Lvl %d" % config.get("level", 1)
		$Punchcard/DateNote.visible = true
		$Punchcard/CharSection/LegacyCharSelect.visible = true

	$Punchcard/CharSection/CharImage.texture = load(PunchcardTextures.get_char_texture(config.get("character", "chef")))

	if config.get("mode") == "legacy":
		$Punchcard/SizeSection/SizeImage.texture = load(PunchcardTextures.get_legacy_size_texture(config.get("level", 1)))
	else:
		$Punchcard/SizeSection/SizeImage.texture = load(PunchcardTextures.get_size_texture(config.get("size", 8)))

	$Punchcard/HazardsSection/HazardsImage.texture = load(PunchcardTextures.get_hazard_texture(config.get("hazards", 1)))
	$Punchcard/ObstaclesSection/ObstaclesImage.texture = load(PunchcardTextures.get_obstacle_texture(config.get("obstacles", 1)))
	$Punchcard/PalsSection/PalsImage.texture = load(PunchcardTextures.get_pals_texture(config.get("pals", 1)))
	$Punchcard/ZoneSection/ZoneImage.texture = load(PunchcardTextures.get_zone_texture(config.get("zone", "desert")))

	_trigger_icon_fade($Punchcard/CharSection/CharImage)
	_trigger_icon_fade($Punchcard/SizeSection/SizeImage)
	_trigger_icon_fade($Punchcard/HazardsSection/HazardsImage)
	_trigger_icon_fade($Punchcard/ObstaclesSection/ObstaclesImage)
	_trigger_icon_fade($Punchcard/PalsSection/PalsImage)
	_trigger_icon_fade($Punchcard/ZoneSection/ZoneImage)


func _trigger_icon_fade(img: TextureRect) -> void:
	if img == null:
		return
	var tween := create_tween()
	img.modulate = Color(1, 1, 1, 0)
	tween.tween_property(img, "modulate", Color(1, 1, 1, 1), 0.3)


func _update_punchcard_background() -> void:
	var is_hardcore: bool = SaveManager.is_hardcore_enabled()
	var is_legacy_mode: bool = punchcard_mode == "legacy"

	if is_legacy_mode and is_hardcore:
		$Punchcard.texture = load("res://assets/hud/punchcard/hardcard.png")
	else:
		$Punchcard.texture = load("res://assets/hud/punchcard/punchcard.png")


func _update_punchcard_labels_color() -> void:
	var is_hardcore: bool = SaveManager.is_hardcore_enabled()
	var labels: Array = [
		$Punchcard/CharSection/CharLabel,
		$Punchcard/SizeSection/SizeLabel,
		$Punchcard/HazardsSection/HazardsLabel,
		$Punchcard/ObstaclesSection/ObstaclesLabel,
		$Punchcard/PalsSection/PalsLabel,
		$Punchcard/ZoneSection/ZoneLabel,
	]
	for label in labels:
		if is_hardcore:
			label.add_theme_color_override("font_color", Color(1, 1, 1))
			label.add_theme_color_override("font_shadow_color", Color(0, 0, 0))
		else:
			label.remove_theme_color_override
