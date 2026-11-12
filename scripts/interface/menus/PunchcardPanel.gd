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

signal start_requested(config: Dictionary)
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
	_populate_selects()

	# Asegura los pivotes en el centro de los botones antes de conectarlos
	for button in _get_all_buttons():
		if button is Control:
			button.pivot_offset = button.size / 2.0

	_wire_buttons()


func _populate_selects() -> void:
	# Character
	var legacy_chars: OptionButton = $Punchcard/CharSection/LegacyCharSelect
	legacy_chars.clear()
	for c in ["Chef", "Mosquito", "Mommy", "Scout"]:
		legacy_chars.add_item(c)

	var custom_chars: OptionButton = $Punchcard/CharSection/CustomCharSelect
	custom_chars.clear()
	for c in ["Chef", "Mosquito", "Mommy", "Scout"]:
		custom_chars.add_item(c)

	# Size
	var sizes: OptionButton = $Punchcard/SizeSection/CustomSizeSelect
	sizes.clear()
	sizes.add_item("Small"); sizes.set_item_metadata(0, 8)
	sizes.add_item("Medium"); sizes.set_item_metadata(1, 12)
	sizes.add_item("Large"); sizes.set_item_metadata(2, 16)
	sizes.add_item("Xtra-Large"); sizes.set_item_metadata(3, 20)
	sizes.add_item("Ultra-Large"); sizes.set_item_metadata(4, 24)

	# Hazards
	var hazards: OptionButton = $Punchcard/HazardsSection/CustomHazardsSelect
	hazards.clear()
	var hazard_values = [1, 5, 10, 15, 20, 30]
	var hazard_labels = ["Low", "Medium", "High", "Xtra-High", "Ultra-High", "Nsanely-High"]
	for i in range(hazard_values.size()):
		hazards.add_item(hazard_labels[i])
		hazards.set_item_metadata(i, hazard_values[i])

	# Obstacles
	var obstacles: OptionButton = $Punchcard/ObstaclesSection/CustomObstaclesSelect
	obstacles.clear()
	var obstacle_values = [1, 3, 5, 10, 15, 20]
	var obstacle_labels = ["Low", "Medium", "High", "Xtra-High", "Ultra-High", "Nsanely-High"]
	for i in range(obstacle_values.size()):
		obstacles.add_item(obstacle_labels[i])
		obstacles.set_item_metadata(i, obstacle_values[i])

	# Pals
	var pals: OptionButton = $Punchcard/PalsSection/CustomPalsSelect
	pals.clear()
	for i in range(1, 6):
		pals.add_item(str(i))

	# Zone
	var zone: OptionButton = $Punchcard/ZoneSection/CustomZoneSelect
	zone.clear()
	var zones = ["Backyard", "Desert", "Snow", "Scrapland", "Roots", "Glowyland", "Ash"]
	var zone_ids = ["backyard", "desert", "snow", "scrapland", "roots", "glowyland", "ash"]
	for i in range(zones.size()):
		zone.add_item(zones[i])
		zone.set_item_metadata(i, zone_ids[i])


func _wire_buttons() -> void:
	$Punchcard/CloseButton.pressed.connect(_on_close_pressed)
	$Punchcard/StartButton.pressed.connect(_on_start_pressed)
	$Punchcard/SeedButton.pressed.connect(_on_seed_pressed)
	$Punchcard/KeychainButton.pressed.connect(_on_keychain_pressed)
	$Punchcard/DiceButton.pressed.connect(_on_dice_pressed)
	$ModalDialog/ModalCard/ModalOkButton.pressed.connect(_on_modal_ok)

	# Mode-specific option buttons
	$Punchcard/CharSection/LegacyCharSelect.item_selected.connect(_on_legacy_char_changed)
	$Punchcard/CharSection/CustomCharSelect.item_selected.connect(_on_custom_option_changed)
	$Punchcard/SizeSection/CustomSizeSelect.item_selected.connect(_on_custom_option_changed)
	$Punchcard/HazardsSection/CustomHazardsSelect.item_selected.connect(_on_custom_option_changed)
	$Punchcard/ObstaclesSection/CustomObstaclesSelect.item_selected.connect(_on_custom_option_changed)
	$Punchcard/PalsSection/CustomPalsSelect.item_selected.connect(_on_custom_option_changed)
	$Punchcard/ZoneSection/CustomZoneSelect.item_selected.connect(_on_custom_option_changed)

	# Hover/click effects imitando CSS (Scale & Brightness/Modulate)
	for button in _get_all_buttons():
		button.mouse_entered.connect(func():
			if AudioManager.has_method("play_hover_sfx"):
				AudioManager.play_hover_sfx()
			var tween = create_tween().set_parallel(true)
			tween.tween_property(button, "modulate", Color(1.25, 1.25, 1.25), 0.1)
			tween.tween_property(button, "scale", Vector2(1.05, 1.05), 0.1)
		)
		button.mouse_exited.connect(func():
			var tween = create_tween().set_parallel(true)
			tween.tween_property(button, "modulate", Color(1.0, 1.0, 1.0), 0.1)
			tween.tween_property(button, "scale", Vector2(1.0, 1.0), 0.1)
		)
		button.button_down.connect(func():
			var tween = create_tween().set_parallel(true)
			tween.tween_property(button, "modulate", Color(0.75, 0.75, 0.75), 0.1)
			tween.tween_property(button, "scale", Vector2(0.95, 0.95), 0.1)
		)
		button.button_up.connect(func():
			var tween = create_tween().set_parallel(true)
			tween.tween_property(button, "modulate", Color(1.25, 1.25, 1.25), 0.1)
			tween.tween_property(button, "scale", Vector2(1.05, 1.05), 0.1)
		)


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

func open(mode: String) -> void:
	visible = true
	match mode:
		"legacy": generate_legacy_config()
		"daily":  generate_daily_config()
		"custom": generate_custom_config()
		_:        push_error("Unknown punchcard mode: " + mode)


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

	var is_hardcore: bool = false
	if SaveManager.has_method("is_hardcore_enabled"):
		is_hardcore = SaveManager.is_hardcore_enabled()

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

	config["character"] = _char_id_from_label(legacy_select.get_item_text(legacy_select.selected))

	daily_config = config
	current_config = config

	_update_punchcard_textures(config)
	_update_punchcard_background()
	_update_custom_elements_visibility(false)
	_update_badges()


func generate_daily_config() -> void:
	punchcard_mode = "daily"
	_hide_all_selects()
	$Punchcard/TitleCustom.visible = false
	$Punchcard/TitleDaily.visible = true

	var seed_value: int = _generate_daily_seed()
	var random: Callable = _create_seeded_random(seed_value)

	var valid_sizes: Array = [12, 16, 20, 24, 28, 32, 36, 40]
	var size: int = valid_sizes[_get_random_in_range(random, 0, valid_sizes.size() - 1)]

	var config: Dictionary = _create_base_config()
	config["mode"] = "daily"
	config["seed"] = seed_value
	config["size"] = size

	var chars: Array = ["chef", "mosquito", "mommy", "scout"]
	config["character"] = chars[_get_random_in_range(random, 0, chars.size() - 1)]
	config["pals"] = _get_random_in_range(random, 1, 5)

	var zone_list: Array = ["desert", "snow", "scrapland", "roots", "glowyland", "ash"]
	config["zone"] = zone_list[_get_random_in_range(random, 0, zone_list.size() - 1)]

	var intensity_max: int = maxi(1, floori(size / 4.0))
	config["hazards"] = _get_random_in_range(random, 1, intensity_max)
	config["obstacles"] = _get_random_in_range(random, 1, intensity_max)

	daily_config = config
	current_config = config
	_update_punchcard_textures(config)
	_update_seed_display(seed_value)

	$Punchcard/StartButton.visible = not SaveManager.is_daily_attempted_today()
	_update_custom_elements_visibility(false)
	_update_badges()


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

	_update_custom_elements_visibility(true)
	_load_custom_keychains()
	_update_custom_textures()
	_update_badges()

# ======================= TEXTURE UPDATES =======================

func _update_punchcard_textures(config: Dictionary) -> void:
	$Punchcard/SeedLabel.visible = true
	$Punchcard/CharSection/LegacyCharSelect.visible = false

	var seed_prefix: String = "Seed: "
	if locale_manager != null and locale_manager.has_method("get_translation"):
		seed_prefix = locale_manager.get_translation("menu.punchcard.seed")

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
	var is_hardcore: bool = false
	if SaveManager.has_method("is_hardcore_enabled"):
		is_hardcore = SaveManager.is_hardcore_enabled()

	var is_legacy_mode: bool = punchcard_mode == "legacy"

	if is_legacy_mode and is_hardcore:
		$Punchcard.texture = load("res://assets/hud/punchcard/hardcard.png")
	else:
		$Punchcard.texture = load("res://assets/hud/punchcard/punchcard.png")


func _update_punchcard_labels_color() -> void:
	var is_hardcore: bool = false
	if SaveManager.has_method("is_hardcore_enabled"):
		is_hardcore = SaveManager.is_hardcore_enabled()

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
			label.add_theme_color_override("font_color", Color(0, 0, 0, 1))
			label.remove_theme_color_override("font_shadow_color")

# ======================= BADGES =======================

func _update_badges() -> void:
	var is_hardcore: bool = false
	if SaveManager.has_method("is_hardcore_enabled"):
		is_hardcore = SaveManager.is_hardcore_enabled()

	if punchcard_mode == "legacy":
		$Punchcard/LegacyBadgeContainer.visible = true
		$Punchcard/DailyBadgeContainer.visible = false

		if is_hardcore:
			$Punchcard/LegacyBadgeContainer/LegacyBadgeImage.texture = load("res://assets/hud/menu/hardcore.png")
			$Punchcard/LegacyBadgeContainer/LegacyBadgeLabel.text = "Record: %d" % SaveManager.get_hardcore_high_score()
		else:
			var legacy_high: int = SaveManager.get_legacy_high_score()
			var badge_file: String = PunchcardTextures.get_legacy_badge(legacy_high)
			$Punchcard/LegacyBadgeContainer/LegacyBadgeImage.texture = load(badge_file)
			$Punchcard/LegacyBadgeContainer/LegacyBadgeLabel.text = "Record: %d" % legacy_high

	elif punchcard_mode == "daily":
		$Punchcard/LegacyBadgeContainer.visible = false
		$Punchcard/DailyBadgeContainer.visible = true
		_update_daily_badge()

	else:
		$Punchcard/LegacyBadgeContainer.visible = false
		$Punchcard/DailyBadgeContainer.visible = false

	_update_punchcard_labels_color()


func _update_daily_badge() -> void:
	var streak: int = SaveManager.get_daily_streak()
	var fire_file: String = PunchcardTextures.get_daily_fire_image(streak)
	$Punchcard/DailyBadgeContainer/DailyStreakNumber.text = str(streak)
	$Punchcard/DailyBadgeContainer/DailyFire.texture = load(fire_file)

# ======================= SEED SYSTEM =======================

func generate_random_seed() -> int:
	return randi_range(1, 999999999)


func _update_seed_display(seed_value: int) -> void:
	var seed_prefix: String = "Seed: "
	if locale_manager != null and locale_manager.has_method("get_translation"):
		seed_prefix = locale_manager.get_translation("menu.punchcard.seed")
	$Punchcard/SeedLabel.text = "%s%d" % [seed_prefix, seed_value]


func _generate_daily_seed() -> int:
	var date: Dictionary = Time.get_date_dict_from_system()
	var date_string: String = "%d-%d-%d" % [date["year"], date["month"], date["day"]]
	var hash_value: int = 0
	for i in range(date_string.length()):
		var shifted: int = _to_int32(hash_value << 5)
		hash_value = _to_int32(date_string.unicode_at(i) + (shifted - hash_value))
	return absi(hash_value)


# Truncates an int64 to a signed 32-bit int (mirrors JS `<<` and `|` semantics).
func _to_int32(value: int) -> int:
	var v: int = value & 0xFFFFFFFF
	if v >= 0x80000000:
		v -= 0x100000000
	return v


func _create_seeded_random(seed_value: int) -> Callable:
	var state: Dictionary = {"seed": seed_value}
	return func() -> float:
		state["seed"] = (state["seed"] * 9301 + 49297) % 233280
		return float(state["seed"]) / 233280.0


func _get_random_in_range(random: Callable, min_v: int, max_v: int) -> int:
	return floori(random.call() * float(max_v - min_v + 1)) + min_v

# ======================= CUSTOM MODE =======================

func _update_custom_textures() -> void:
	var config: Dictionary = _create_base_config()
	config["mode"] = "custom"

	if not current_config.is_empty() and current_config.has("seed"):
		config["seed"] = current_config["seed"]
	else:
		config["seed"] = generate_random_seed()

	config["character"] = _char_id_from_label($Punchcard/CharSection/CustomCharSelect.get_item_text($Punchcard/CharSection/CustomCharSelect.selected))
	config["size"] = $Punchcard/SizeSection/CustomSizeSelect.get_item_metadata($Punchcard/SizeSection/CustomSizeSelect.selected)
	config["hazards"] = $Punchcard/HazardsSection/CustomHazardsSelect.get_item_metadata($Punchcard/HazardsSection/CustomHazardsSelect.selected)
	config["obstacles"] = $Punchcard/ObstaclesSection/CustomObstaclesSelect.get_item_metadata($Punchcard/ObstaclesSection/CustomObstaclesSelect.selected)
	config["pals"] = $Punchcard/PalsSection/CustomPalsSelect.selected + 1
	config["zone"] = $Punchcard/ZoneSection/CustomZoneSelect.get_item_metadata($Punchcard/ZoneSection/CustomZoneSelect.selected)

	current_config = config
	_update_punchcard_textures(config)


func _randomize_custom_selectors() -> void:
	var random: Callable = _create_seeded_random(generate_random_seed())

	$Punchcard/CharSection/CustomCharSelect.select(_get_random_in_range(random, 0, 3))
	$Punchcard/SizeSection/CustomSizeSelect.select(_get_random_in_range(random, 0, 4))
	$Punchcard/HazardsSection/CustomHazardsSelect.select(_get_random_in_range(random, 0, 5))
	$Punchcard/ObstaclesSection/CustomObstaclesSelect.select(_get_random_in_range(random, 0, 5))
	$Punchcard/PalsSection/CustomPalsSelect.select(_get_random_in_range(random, 0, 4))
	$Punchcard/ZoneSection/CustomZoneSelect.select(_get_random_in_range(random, 1, 6))

	_update_custom_textures()


func _load_custom_keychains() -> void:
	if SaveManager.has_method("get_custom_keychains"):
		custom_keychains = SaveManager.get_custom_keychains()


func _update_custom_elements_visibility(is_custom: bool) -> void:
	$Punchcard/SeedButton.visible = is_custom
	$Punchcard/KeychainButton.visible = is_custom
	$Punchcard/DiceButton.visible = is_custom


func _hide_all_selects() -> void:
	$Punchcard/CharSection/LegacyCharSelect.visible = false
	$Punchcard/CharSection/CustomCharSelect.visible = false
	$Punchcard/SizeSection/CustomSizeSelect.visible = false
	$Punchcard/HazardsSection/CustomHazardsSelect.visible = false
	$Punchcard/ObstaclesSection/CustomObstaclesSelect.visible = false
	$Punchcard/PalsSection/CustomPalsSelect.visible = false
	$Punchcard/ZoneSection/CustomZoneSelect.visible = false

# ======================= HELPERS =======================

func _create_base_config() -> Dictionary:
	return {
		"mode": "",
		"seed": null,
		"level": 1,
		"character": "chef",
		"size": 8,
		"hazards": 1,
		"obstacles": 1,
		"pals": 1,
		"zone": "desert"
	}


func _get_zone_by_level(level: int) -> String:
	if level <= 9: return "desert"
	if level <= 19: return "snow"
	if level <= 29: return "scrapland"
	if level <= 39: return "roots"
	if level <= 49: return "glowyland"
	return "ash"


func _char_id_from_label(label: String) -> String:
	match label.to_lower():
		"chef": return "chef"
		"mosquito": return "mosquito"
		"mommy": return "mommy"
		"scout": return "scout"
		_: return "chef"


func _index_for_char(char_id: String) -> int:
	match char_id:
		"chef": return 0
		"mosquito": return 1
		"mommy": return 2
		"scout": return 3
		_: return 0

# ======================= BUTTON HANDLERS =======================

func _on_close_pressed() -> void:
	if AudioManager.has_method("play_click_sfx"):
		AudioManager.play_click_sfx()
	visible = false
	closed.emit()


func _on_start_pressed() -> void:
	if AudioManager.has_method("play_click_sfx"):
		AudioManager.play_click_sfx()
	start_requested.emit(current_config)


func _on_seed_pressed() -> void:
	if AudioManager.has_method("play_click_sfx"):
		AudioManager.play_click_sfx()
	var new_seed: int = generate_random_seed()
	current_config["seed"] = new_seed
	_update_seed_display(new_seed)


func _on_keychain_pressed() -> void:
	if AudioManager.has_method("play_click_sfx"):
		AudioManager.play_click_sfx()
	push_warning("Keychain selector not implemented")


func _on_dice_pressed() -> void:
	if AudioManager.has_method("play_click_sfx"):
		AudioManager.play_click_sfx()
	_randomize_custom_selectors()


func _on_legacy_char_changed(_index: int) -> void:
	if punchcard_mode == "legacy":
		var selected_label: String = $Punchcard/CharSection/LegacyCharSelect.get_item_text($Punchcard/CharSection/LegacyCharSelect.selected)
		current_config["character"] = _char_id_from_label(selected_label)
		_update_punchcard_textures(current_config)


func _on_custom_option_changed(_index: int) -> void:
	if punchcard_mode == "custom":
		_update_custom_textures()


func _on_modal_ok() -> void:
	if AudioManager.has_method("play_click_sfx"):
		AudioManager.play_click_sfx()
	$ModalDialog.visible = false


func show_modal(message: String) -> void:
	$ModalDialog/ModalCard/ModalText.text = message
	$ModalDialog.visible = true
