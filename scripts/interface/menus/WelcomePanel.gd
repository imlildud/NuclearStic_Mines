# ==============================================================
# ====================== WELCOME PANEL =========================
# ==============================================================
# Welcome Panels orchestator

extends CanvasLayer

signal play_pressed

@onready var _dimmer: ColorRect = $Root/Dimmer
@onready var _name_panel = $Root/NamePanel
@onready var _avatar_panel = $Root/AvatarPanel
@onready var _tutorial_panel = $Root/TutorialPanel
@onready var _id_card_panel = $Root/IDCardPanel

var _locale_manager = null
var _editing_name: bool = false

# Menu transition fades (phase 1 of effects): opacity tweens, not shaders.
const FADE_IN_TIME: float = 0.2
const FADE_OUT_TIME: float = 0.15

const GAME_SCENE := "res://scenes/game/Game.tscn"
const SCENE_TRANSITION_SCRIPT := "res://scripts/interface/transitions/SceneTransition.gd"

var _current_panel: Control = null
var _switch_id: int = 0
var _panel_tweens: Dictionary = {}
var _starting: bool = false


func _ready() -> void:
	visible = false
	_hide_all()

	# Conectar señales de los sub-paneles.
	_name_panel.name_submitted.connect(_on_name_submitted)
	_avatar_panel.avatar_confirmed.connect(_on_avatar_confirmed)
	_tutorial_panel.tutorial_choice.connect(_on_tutorial_choice)
	_id_card_panel.play_pressed.connect(_on_id_card_play)
	_id_card_panel.edit_pressed.connect(_on_id_card_edit)
	_id_card_panel.delete_pressed.connect(_on_id_card_delete)
	_id_card_panel.name_pressed.connect(_on_id_card_name_edit)


func set_locale_manager(lm) -> void:
	_locale_manager = lm


# Inicia el flujo de bienvenida.
func init_welcome_screen() -> void:
	_hide_all()
	visible = true
	if _dimmer != null:
		_dimmer.modulate.a = 0.0
		_fade_panel(_dimmer, 1.0, FADE_IN_TIME)

	var tutorial_completed: bool = SaveManager.is_tutorial_completed()
	var username: String = SaveManager.get_username()

	if tutorial_completed and username != "":
		# Returning player: show ID card WITH animation if there's a delta.
		_show_id_card(username, SaveManager.get_avatar(), true)
	elif username != "":
		_show_avatar_panel()
	else:
		_show_name_panel()


# ======================= PANEL HELPERS =======================

func _hide_all() -> void:
	_current_panel = null
	for panel in [_name_panel, _avatar_panel, _tutorial_panel, _id_card_panel]:
		_kill_panel_tween(panel)
		panel.visible = false
		panel.modulate.a = 1.0


func _show_name_panel() -> void:
	_name_panel.set_prompt(_get_text("menu.enterName", "Enter your name, rescuer:"))
	_switch_to(_name_panel)


func _show_avatar_panel() -> void:
	_avatar_panel.set_prompt(_get_text("menu.selectAvatar", "Choose your profile picture:"))
	_avatar_panel.select_avatar(SaveManager.get_avatar())
	_switch_to(_avatar_panel)


func _show_tutorial_panel() -> void:
	_tutorial_panel.set_question(_get_text("menu.tutorialQuestion", "Would you like to play the tutorial?"))
	_switch_to(_tutorial_panel)


func _show_id_card(username: String, avatar_id: int, animate_points: bool = false) -> void:
	_id_card_panel.refresh(username, avatar_id, animate_points)
	_switch_to(_id_card_panel)


# Fades a panel's opacity, killing any fade already running on it so two
# tweens never fight over the same property.
func _kill_panel_tween(panel: Control) -> void:
	if _panel_tweens.has(panel):
		var old_tween = _panel_tweens[panel]
		if old_tween != null and (old_tween as Tween).is_valid():
			(old_tween as Tween).kill()


func _fade_panel(panel: Control, target_alpha: float, duration: float) -> void:
	_kill_panel_tween(panel)
	var t := panel.create_tween()
	t.tween_property(panel, "modulate:a", target_alpha, duration)
	_panel_tweens[panel] = t


# Cross-fade between panels: fade the current one out, then fade the new
# one in. Safe against fast double-clicks: each switch gets an id, and a
# superseded switch only cleans up its own old panel.
func _switch_to(panel: Control) -> void:
	if _current_panel == panel:
		return
	_switch_id += 1
	var my_id: int = _switch_id
	var old_panel: Control = _current_panel
	_current_panel = panel
	if old_panel != null and old_panel.visible:
		_fade_panel(old_panel, 0.0, FADE_OUT_TIME)
		await get_tree().create_timer(FADE_OUT_TIME).timeout
		old_panel.visible = false
		old_panel.modulate.a = 1.0
		if my_id != _switch_id:
			return
	panel.visible = true
	panel.modulate.a = 0.0
	_fade_panel(panel, 1.0, FADE_IN_TIME)


# ======================= SIGNAL HANDLERS =======================

func _on_name_submitted(player_name: String) -> void:
	SaveManager.set_username(player_name)
	if _editing_name:
		_editing_name = false
		_show_id_card(player_name, SaveManager.get_avatar(), false)
		return
	_show_avatar_panel()


func _on_avatar_confirmed(avatar_id: int) -> void:
	SaveManager.set_avatar(avatar_id)

	# Si es primera vez (sin tutorial completo), preguntar.
	if not SaveManager.is_tutorial_completed():
		_show_tutorial_panel()
	else:
		# Edit flow: return to ID card WITHOUT animation.
		_show_id_card(SaveManager.get_username(), avatar_id, false)


func _on_tutorial_choice(wants_tutorial: bool) -> void:
	SaveManager.set_tutorial_completed(true)

	if wants_tutorial:
		if _starting:
			return
		_starting = true
		# Configurar tutorial y navegar a Game (con la transicion de circulo).
		GameManager.config = {
			"mode": "tutorial",
			"seed": null,
			"level": 1,
			"character": "student",
			"size": 5,
			"hazards": 1,
			"obstacles": 1,
			"goals": 1,
			"zone": "backyard"
		}
		var transition = load(SCENE_TRANSITION_SCRIPT).new()
		get_tree().root.add_child(transition)
		transition.transition_to(GAME_SCENE)
	else:
		# Return to ID card WITHOUT animation (first-time flow).
		_show_id_card(SaveManager.get_username(), SaveManager.get_avatar(), false)


func _on_id_card_play() -> void:
	AudioManager.play_click_sfx()
	_fade_out_welcome()


# Fades the current panel and the dimmer out, then hides the whole layer.
func _fade_out_welcome() -> void:
	_switch_id += 1
	var my_id: int = _switch_id
	if _current_panel != null and _current_panel.visible:
		_fade_panel(_current_panel, 0.0, FADE_OUT_TIME)
	if _dimmer != null:
		_fade_panel(_dimmer, 0.0, FADE_OUT_TIME)
	await get_tree().create_timer(FADE_OUT_TIME).timeout
	if my_id != _switch_id:
		return
	visible = false
	if _current_panel != null:
		_current_panel.visible = false
		_current_panel.modulate.a = 1.0
	_current_panel = null
	if _dimmer != null:
		_dimmer.modulate.a = 1.0
	play_pressed.emit()


func _on_id_card_edit() -> void:
	AudioManager.play_click_sfx()
	_show_avatar_panel()


# Name label clicked on the ID card (web parity: prompt "Enter your
# new name:", input prefilled with the current name).
func _on_id_card_name_edit() -> void:
	AudioManager.play_click_sfx()
	_editing_name = true
	_name_panel.set_prompt(_get_text("menu.editName", "Enter your new name:"))
	_name_panel.set_current_name(SaveManager.get_username())
	visible = true
	_switch_to(_name_panel)


func _on_id_card_delete() -> void:
	AudioManager.play_click_sfx()
	SaveManager.clear_all_game_data()
	get_tree().reload_current_scene()


# ======================= UTILS =======================

func _get_text(key: String, fallback: String) -> String:
	if _locale_manager != null:
		var result = _locale_manager.get_translation(key)
		if result is String and result != "" and result != key:
			return result
	return fallback
