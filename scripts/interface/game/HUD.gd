# ==============================================================
# ======================= HUD MANAGER ==========================
# ==============================================================
# Manages all HUD updates (health, flags, coords, support, etc.).
#
# Attached to the HUD CanvasLayer. The HUD scene is a child of
# Game.tscn, so it is always visible during gameplay.
#
# Update is called each frame from Game.gd. It reads from the
# GameManager (player, board, config) and updates the visible nodes.

extends CanvasLayer

# ======================= SIGNALS =======================

signal pause_requested
signal back_requested
signal move_requested(direction: String)
signal flag_requested(direction: String)
signal swamp_requested
signal restart_requested

# ======================= NODE REFERENCES =======================

@onready var char_group: Control = $Root/CharGroup
@onready var char_icon: TextureRect = $Root/CharGroup/CharIcon
@onready var geohaz_alert: TextureRect = $Root/CharGroup/GeohazAlert
@onready var geoobs_alert: TextureRect = $Root/CharGroup/GeoobsAlert
@onready var tired_icon: TextureRect = $Root/CharGroup/TiredIcon
@onready var criticized_icon: TextureRect = $Root/CharGroup/CriticizedIcon
@onready var treasure_icon: TextureRect = $Root/CharGroup/TreasureIcon
@onready var pause_button: TextureButton = $Root/CharGroup/PauseButton

@onready var health_icon: TextureRect = $Root/HealthGroup/HealthIcon
@onready var health_text: Label = $Root/HealthGroup/HealthText
@onready var flags_icon: TextureRect = $Root/StatsRow/FlagsIcon
@onready var flags_text: Label = $Root/StatsRow/FlagsText
@onready var rescued_text: Label = $Root/StatsRow/RescuedText

@onready var height_text: Label = $Root/TopCenter/HeightGroup/HeightText
@onready var tile_icon: TextureRect = $Root/TopCenter/TileGroup/TileIcon

@onready var coords_text: Label = $Root/CoordsContainer/CoordsText
@onready var home_coords: HBoxContainer = $Root/CoordsContainer/HomeCoords
@onready var home_text: Label = $Root/CoordsContainer/HomeCoords/HomeText
@onready var destiny_coords: HBoxContainer = $Root/CoordsContainer/DestinyCoords
@onready var destiny_text: Label = $Root/CoordsContainer/DestinyCoords/DestinyText

@onready var keychain_slots: HBoxContainer = $Root/SupportContainer/KeychainSlots

@onready var touch_movement: Control = $Root/TouchMovement
@onready var touch_flags: Control = $Root/TouchFlags
@onready var swamp_button: TextureButton = $Root/TouchFlags/SwampButton
@onready var restart_button: TextureButton = $Root/TouchFlags/RestartButton

@onready var scoreboard = $Scoreboard
@onready var level_start_modal = $LevelStartModal
@onready var pause_modal = $PauseModal
@onready var modal_dialog = $ModalDialog

# ======================= STATE =======================

var game = null
var _last_keychain_ids: String = ""


# ======================= LIFECYCLE =======================

func _ready() -> void:
	# Wire touch controls.
	_connect_touch_button($Root/TouchMovement/W, "move", "Up")
	_connect_touch_button($Root/TouchMovement/A, "move", "Left")
	_connect_touch_button($Root/TouchMovement/S, "move", "Down")
	_connect_touch_button($Root/TouchMovement/D, "move", "Right")
	_connect_touch_button($Root/TouchFlags/Up, "flag", "Up")
	_connect_touch_button($Root/TouchFlags/Down, "flag", "Down")
	_connect_touch_button($Root/TouchFlags/Left, "flag", "Left")
	_connect_touch_button($Root/TouchFlags/Right, "flag", "Right")

	swamp_button.pressed.connect(func(): swamp_requested.emit())
	restart_button.pressed.connect(func(): restart_requested.emit())
	pause_button.pressed.connect(func(): pause_requested.emit())

	# Hide touch controls if the player disabled them.
	var touch_enabled: bool = SaveManager.get_touch_enabled()
	touch_movement.visible = touch_enabled
	touch_flags.visible = touch_enabled

	# Hide overlays initially.
	scoreboard.visible = false
	level_start_modal.visible = false
	pause_modal.visible = false
	modal_dialog.visible = false
	ButtonFeedback.attach_all(self)


func _connect_touch_button(button: TextureButton, kind: String, direction: String) -> void:
	button.pressed.connect(func():
		if kind == "move":
			move_requested.emit(direction)
		else:
			flag_requested.emit(direction)
	)

# Disables the restart (Reversion) button when the player has no
# Reversion keychain or the uses run out, and re-enables it otherwise.
func _on_reversion_button_state_changed(state_class: String, tooltip: String) -> void:
	var enabled: bool = state_class == "active"
	restart_button.disabled = not enabled
	restart_button.tooltip_text = tooltip
	restart_button.modulate = Color(1, 1, 1, 1) if enabled else Color(0.5, 0.5, 0.5, 1)

# ======================= SETUP =======================

# Called from Game.gd after the game starts.
func set_game(game_ref) -> void:
	game = game_ref


# ======================= UPDATE =======================

# Called each frame from Game.gd.
func update() -> void:
	if game == null or GameManager.player == null:
		return

	var player = GameManager.player
	var board: Array = GameManager.board

	_update_character_icon(player)
	_update_health(player)
	_update_flags(player)
	_update_rescued(player)
	_update_criticized(player)
	_update_fatigue(player)
	_update_current_tile(board, player)
	_update_heightometer(board, player)
	_update_geological_alert(board, player)
	_update_coordinates(board, player)
	_update_support(player)
	_update_treasure_indicator(board, player)


# ======================= CHARACTER ICON =======================

func _update_character_icon(player) -> void:
	var path: String = "res://assets/hud/game/charactericon/%s.png" % player.get_type()
	if ResourceLoader.exists(path):
		char_icon.texture = load(path)


# ======================= HEALTH =======================

func _update_health(player) -> void:
	var hp: int = player.get_hp()
	var max_hp: int = _get_max_hp_by_character(player.get_type())

	health_text.text = str(hp)

	var path: String
	if hp == max_hp:
		path = "res://assets/hud/game/stats/fulllife.png"
	elif hp >= int(max_hp / 2.0):
		path = "res://assets/hud/game/stats/halflife.png"
	elif hp > 0:
		path = "res://assets/hud/game/stats/quarterlife.png"
	else:
		path = "res://assets/hud/game/stats/emptylife.png"

	if ResourceLoader.exists(path):
		health_icon.texture = load(path)


func _get_max_hp_by_character(type: String) -> int:
	match type:
		"chef":     return 5
		"mosquito": return 3
		"mommy":    return 10
		"scout":    return 1
		"student":  return 2
		_:          return 5


# ======================= FLAGS =======================

func _update_flags(player) -> void:
	var mode = GameManager.get_flag_mode()
	var text: String = ""
	var icon_path: String = "res://assets/hud/game/stats/remainingflags.png"

	match mode:
		1:  # Revelation
			text = str(player.get_keychain_uses("revelation"))
			icon_path = "res://assets/hud/game/stats/remainingreveals.png"
		2:  # Memory
			var used: int = _count_memory_markers()
			text = str(maxi(0, 3 - used))
			icon_path = "res://assets/hud/game/stats/remainingmemories.png"
		3:  # Purity
			text = str(player.get_keychain_uses("purity"))
			icon_path = "res://assets/hud/game/stats/remainingcleans.png"
		_:  # Normal
			text = str(player.get_flags())

	flags_text.text = text
	if ResourceLoader.exists(icon_path):
		flags_icon.texture = load(icon_path)


func _count_memory_markers() -> int:
	var board: Array = GameManager.board
	if board.is_empty():
		return 0
	var count: int = 0
	for i in range(board.size()):
		for j in range(board.size()):
			if board[i][j].has_memory_marker():
				count += 1
	return count


# ======================= RESCUED =======================

func _update_rescued(player) -> void:
	rescued_text.text = str(player.get_rescued())


# ======================= CRITICIZED =======================

func _update_criticized(player) -> void:
	criticized_icon.visible = player.is_criticized()


# ======================= FATIGUE =======================

func _update_fatigue(player) -> void:
	var rescued: int = player.get_rescued()
	var force: int = player.get_force()
	tired_icon.visible = rescued >= force


# ======================= CURRENT TILE =======================

func _update_current_tile(board: Array, player) -> void:
	var x: int = player.get_pos_x()
	var y: int = player.get_pos_y()
	if x < 0 or x >= board.size() or y < 0 or y >= board.size():
		tile_icon.visible = false
		return

	var tile = board[x][y]
	var zone: String = GameManager.config.get("zone", "backyard")
	var has_delirium: bool = player.has_keychain("delirium")
	var texture_path: String = ""

	var hazard_type: String = tile.get_hazardtype()
	var obstacle_type: String = tile.get_obstacletype()
	var hazard_count: int = tile.get_hazardcount()
	var pipe: bool = tile.is_smoke()

	if not pipe:
		if hazard_type != "none":
			texture_path = "res://assets/sprites/tiles/%s.png" % hazard_type
		elif obstacle_type != "none":
			if obstacle_type == "spikes":
				var spike_state: String = tile.get_spike_state()
				var name: String = "spikes_off"
				if spike_state == "prepared":
					name = "spikes_prepared"
				elif spike_state == "on":
					name = "spikes_on"
				texture_path = "res://assets/sprites/tiles/%s.png" % name
			else:
				texture_path = "res://assets/sprites/tiles/%s/%s.png" % [zone, obstacle_type]
		elif hazard_count > 0:
			var count_name: String = "question" if has_delirium else str(hazard_count)
			texture_path = "res://assets/sprites/tiles/%s.png" % count_name
		elif tile.is_start():
			texture_path = "res://assets/sprites/tiles/start.png"

	if texture_path != "" and ResourceLoader.exists(texture_path):
		tile_icon.texture = load(texture_path)
		tile_icon.visible = true
	else:
		tile_icon.visible = false


# ======================= HEIGHTOMETER =======================

func _update_heightometer(board: Array, player) -> void:
	var x: int = player.get_pos_x()
	var y: int = player.get_pos_y()
	if x < 0 or x >= board.size() or y < 0 or y >= board.size():
		return
	var height: int = board[x][y].get_tileheight()
	height_text.text = str(height)


# ======================= GEOLOGICAL ALERT =======================

func _update_geological_alert(board: Array, player) -> void:
	# Only Mosquito (ability 2) shows geological alerts.
	if player.get_ability_id() != 2:
		geohaz_alert.visible = false
		geoobs_alert.visible = false
		return

	var x: int = player.get_pos_x()
	var y: int = player.get_pos_y()
	var size: int = board.size()

	var has_damage: bool = false
	var has_kill: bool = false
	var has_live: bool = false
	var has_river: bool = false
	var has_spikes: bool = false
	var has_pit: bool = false

	var directions: Array = [
		[-1, 0], [1, 0], [0, -1], [0, 1],
		[-1, -1], [-1, 1], [1, -1], [1, 1]
	]

	for d in directions:
		var nx: int = x + d[0]
		var ny: int = y + d[1]
		if nx < 0 or nx >= size or ny < 0 or ny >= size:
			continue
		var tile = board[nx][ny]
		var hazard: String = tile.get_hazardtype()
		var obstacle: String = tile.get_obstacletype()

		if hazard == "mine" or hazard == "spiderMine":
			has_kill = true
		elif hazard == "cactus" or hazard == "deadbush" or tile.get_damageratio():
			has_damage = true
		elif tile.is_hazardlive():
			has_live = true

		if obstacle == "river":
			has_river = true
		elif obstacle == "spikes":
			has_spikes = true
		elif obstacle == "pit":
			has_pit = true

	# First alert (hazard).
	var alert_path: String = ""
	if has_live:
		alert_path = "res://assets/hud/game/stats/live.png"
	elif has_damage and has_kill:
		alert_path = "res://assets/hud/game/stats/mixed.png"
	elif has_kill:
		alert_path = "res://assets/hud/game/stats/kill.png"
	elif has_damage:
		alert_path = "res://assets/hud/game/stats/damage.png"

	if alert_path != "" and ResourceLoader.exists(alert_path):
		geohaz_alert.texture = load(alert_path)
		geohaz_alert.visible = true
	else:
		geohaz_alert.visible = false

	# Second alert (obstacle).
	var alert2_path: String = ""
	if has_river and (has_pit or has_spikes):
		alert2_path = "res://assets/hud/game/stats/obsmixed.png"
	elif has_river:
		alert2_path = "res://assets/hud/game/stats/obsriver.png"
	elif has_pit or has_spikes:
		alert2_path = "res://assets/hud/game/stats/obspit.png"

	if alert2_path != "" and ResourceLoader.exists(alert2_path):
		geoobs_alert.texture = load(alert2_path)
		geoobs_alert.visible = true
	else:
		geoobs_alert.visible = false


# ======================= COORDINATES =======================

func _update_coordinates(board: Array, player) -> void:
	var x: int = player.get_pos_x()
	var y: int = player.get_pos_y()
	coords_text.text = "[%d,%d]" % [x, y]

	_update_home_coords(board, player)
	_update_destiny_coords(board, player)


func _update_home_coords(board: Array, player) -> void:
	if not player.has_keychain("home"):
		home_coords.visible = false
		return

	for i in range(board.size()):
		for j in range(board.size()):
			if board[i][j].is_start():
				home_text.text = "[%d,%d]" % [i, j]
				home_coords.visible = true
				return

	home_coords.visible = false


func _update_destiny_coords(board: Array, player) -> void:
	if not player.has_keychain("destiny"):
		destiny_coords.visible = false
		return

	var target = GameManager.get_destiny_target(board)
	if target != null and target is Dictionary and target.has("x") and target.has("y"):
		destiny_text.text = "[%d,%d]" % [target["x"], target["y"]]
		destiny_coords.visible = true
	else:
		destiny_coords.visible = false


# ======================= SUPPORT (keychains) =======================

func _update_support(player) -> void:
	var inventory: Array = player.inventory
	var filtered: Array = []
	for keychain_id in inventory:
		if player.is_keychain_active(keychain_id):
			filtered.append(keychain_id)

	var visible_ids: Array = filtered.slice(0, 5)
	var current_ids: String = ",".join(visible_ids)

	if current_ids == _last_keychain_ids:
		return
	_last_keychain_ids = current_ids

	# Clear existing slots.
	for child in keychain_slots.get_children():
		child.queue_free()

	# Add new slots.
	for keychain_id in visible_ids:
		var slot := _create_keychain_slot(keychain_id)
		keychain_slots.add_child(slot)


# Creates a clickable keychain slot with hover swing animation.
# Creates a clickable keychain slot with hover swing animation.
func _create_keychain_slot(keychain_id: String) -> Control:
	var slot := Control.new()
	# Reducimos de 80 a 55 para que quepan 5 en el HBoxContainer de 279px
	slot.custom_minimum_size = Vector2(55, 55)
	slot.mouse_filter = Control.MOUSE_FILTER_STOP

	var tex := TextureRect.new()
	# Igualamos el tamaño interno de la textura
	tex.custom_minimum_size = Vector2(55, 55)
	tex.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tex.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tex.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var path: String = "res://assets/hud/game/keychains/keychain_%s.png" % keychain_id
	if ResourceLoader.exists(path):
		tex.texture = load(path)

	slot.add_child(tex)
	tex.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	# Pivot at the top so it swings like a pendant.
	tex.pivot_offset = Vector2(tex.size.x / 2.0, 0.0)
	# Defer pivot fix until the slot has its final size.
	slot.resized.connect(func():
		tex.pivot_offset = Vector2(tex.size.x / 2.0, 0.0)
	)

	var swing_tween: Tween = null

	slot.mouse_entered.connect(func():
		AudioManager.play_hover_sfx()
		if swing_tween != null and swing_tween.is_valid():
			swing_tween.kill()
		swing_tween = _build_swing_tween(tex)
	)
	slot.mouse_exited.connect(func():
		if swing_tween != null and swing_tween.is_valid():
			swing_tween.kill()
		var t := create_tween()
		t.tween_property(tex, "rotation", 0.0, 0.2).set_trans(Tween.TRANS_SINE)
	)
	slot.gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			_on_keychain_slot_clicked(keychain_id)
	)

	return slot


# Builds the swing animation: 30° -> -30° -> 20° -> -20° -> 5° -> -5° -> 0°.
# Each swing is shorter than the last (damped pendulum feel).
func _build_swing_tween(tex: TextureRect) -> Tween:
	var t := create_tween()

	var swings: Array[Dictionary] = [
		{"angle":  30.0, "time": 0.28},
		{"angle": -25.0, "time": 0.26},
		{"angle":  19.0, "time": 0.24},
		{"angle": -13.0, "time": 0.22},
		{"angle":   8.0, "time": 0.18},
		{"angle":  -4.0, "time": 0.14},
		{"angle":   0.0, "time": 0.12},
	]

	for s in swings:
		t.tween_property(
			tex,
			"rotation",
			deg_to_rad(s["angle"]),
			s["time"]
		).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	return t


# Called when a keychain slot is clicked: opens the info popup.
func _on_keychain_slot_clicked(keychain_id: String) -> void:
	AudioManager.play_click_sfx()
	var ui = GameManager.keychain_ui_manager
	if ui != null:
		ui.show_keychain_info(keychain_id)


# ======================= TREASURE INDICATOR =======================

func _update_treasure_indicator(board: Array, player) -> void:
	if not player.has_keychain("greed"):
		treasure_icon.visible = false
		return

	var has_treasure: bool = false
	for i in range(board.size()):
		for j in range(board.size()):
			if board[i][j].have_treasure():
				has_treasure = true
				break
		if has_treasure:
			break

	treasure_icon.visible = has_treasure


# ======================= MODALS =======================

func show_scoreboard(is_victory: bool) -> void:
	scoreboard.visible = true
	if scoreboard.has_method("show_scoreboard"):
		scoreboard.show_scoreboard(is_victory)


func hide_scoreboard() -> void:
	scoreboard.visible = false


func show_level_start(title: String, seed_text: String, info: String, child_types: Array) -> void:
	level_start_modal.visible = true
	if level_start_modal.has_method("show_modal"):
		level_start_modal.show_modal(title, seed_text, info, child_types)


func hide_level_start() -> void:
	level_start_modal.visible = false


func show_pause(char_ctrl, config: Dictionary, board: Array) -> void:
	pause_modal.visible = true
	if pause_modal.has_method("show_modal"):
		pause_modal.show_modal(char_ctrl, config, board)


func hide_pause() -> void:
	pause_modal.visible = false


func show_message_modal(message: String) -> void:
	modal_dialog.visible = true
	if modal_dialog.has_method("show_message"):
		modal_dialog.show_message(message)
