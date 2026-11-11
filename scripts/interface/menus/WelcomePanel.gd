# ==============================================================
# ====================== WELCOME PANEL =========================
# ==============================================================
# Orquestador del flujo de bienvenida.
#
# Flujo:
#   1. Sin nombre → muestra WelcomeNamePanel.
#   2. Con nombre, sin tutorial → muestra WelcomeAvatarPanel.
#   3. Después del avatar → muestra WelcomeTutorialPanel.
#   4. Después del tutorial (o si ya estaba completo) → muestra WelcomeIDCardPanel.
#
# Cada panel es una escena independiente con su propio script.
# Este orquestador solo los instancia, los muestra/oculta y
# escucha sus señales.

extends CanvasLayer

signal play_pressed

@onready var _dimmer: ColorRect = $Root/Dimmer
@onready var _name_panel = $Root/NamePanel
@onready var _avatar_panel = $Root/AvatarPanel
@onready var _tutorial_panel = $Root/TutorialPanel
@onready var _id_card_panel = $Root/IDCardPanel

var _locale_manager = null


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


func set_locale_manager(lm) -> void:
	_locale_manager = lm


# Inicia el flujo de bienvenida.
func init_welcome_screen() -> void:
	_hide_all()
	visible = true

	var tutorial_completed: bool = SaveManager.is_tutorial_completed()
	var username: String = SaveManager.get_username()

	if tutorial_completed and username != "":
		_show_id_card(username, SaveManager.get_avatar())
	elif username != "":
		_show_avatar_panel()
	else:
		_show_name_panel()


# ======================= PANEL HELPERS =======================

func _hide_all() -> void:
	_name_panel.visible = false
	_avatar_panel.visible = false
	_tutorial_panel.visible = false
	_id_card_panel.visible = false


func _show_name_panel() -> void:
	_hide_all()
	_name_panel.set_prompt(_get_text("menu.enterName", "Enter your name, rescuer:"))
	_name_panel.visible = true


func _show_avatar_panel() -> void:
	_hide_all()
	_avatar_panel.set_prompt(_get_text("menu.selectAvatar", "Choose your profile picture:"))
	_avatar_panel.select_avatar(SaveManager.get_avatar())
	_avatar_panel.visible = true


func _show_tutorial_panel() -> void:
	_hide_all()
	_tutorial_panel.set_question(_get_text("menu.tutorialQuestion", "Would you like to play the tutorial?"))
	_tutorial_panel.visible = true


func _show_id_card(username: String, avatar_id: int) -> void:
	_hide_all()
	_id_card_panel.refresh(username, avatar_id)
	_id_card_panel.visible = true


# ======================= SIGNAL HANDLERS =======================

func _on_name_submitted(player_name: String) -> void:
	SaveManager.set_username(player_name)
	_show_avatar_panel()


func _on_avatar_confirmed(avatar_id: int) -> void:
	SaveManager.set_avatar(avatar_id)

	# Si es primera vez (sin tutorial completo), preguntar.
	if not SaveManager.is_tutorial_completed():
		_show_tutorial_panel()
	else:
		_show_id_card(SaveManager.get_username(), avatar_id)


func _on_tutorial_choice(wants_tutorial: bool) -> void:
	SaveManager.set_tutorial_completed(true)

	if wants_tutorial:
		# Configurar tutorial y navegar a Game.
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
		get_tree().change_scene_to_file("res://scenes/game/Game.tscn")
	else:
		_show_id_card(SaveManager.get_username(), SaveManager.get_avatar())


func _on_id_card_play() -> void:
	AudioManager.play_click_sfx()
	visible = false
	play_pressed.emit()


func _on_id_card_edit() -> void:
	AudioManager.play_click_sfx()
	_show_avatar_panel()


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
