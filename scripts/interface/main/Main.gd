# ==============================================================
# ========================= MAIN ==============================
# ==============================================================
# Root scene of the game. Loads the main menu on startup.
# All scene transitions go through this node so we have a single
# entry point.

extends Node

const MAIN_MENU_SCENE := "res://scenes/menu/MainMenu.tscn"


# Load the main menu as the first scene.
func _ready() -> void:
	get_tree().change_scene_to_file.call_deferred(MAIN_MENU_SCENE)
