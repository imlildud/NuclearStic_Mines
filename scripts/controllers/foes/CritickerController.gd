# ==============================================================
# ==================== CRITICKER CONTROLLER ====================
# ==============================================================
# Handles all Criticker-related logic: state, dialogues, and callbacks.
#
# The Criticker is a parasite that infects the player when they step
# on a nest. While infected, the player must mark a number of
# hazards (the "goal"). Marking correctly progresses the infection;
# getting hit or placing a wrong flag cancels it.
#
# DEPENDS ON: CritickerDialogs (translated in Ficha #09).

extends RefCounted

var game_manager = null
var locale_manager = null
var audio_manager = null
var dialogs = null
var is_active: bool = false


func _init(gm = null, locale = null, audio = null) -> void:
	game_manager = gm
	locale_manager = locale
	audio_manager = audio


# ======================= INITIALIZATION =======================

# Creates the CritickerDialogs handler.
func init() -> void:
	dialogs = CritickerDialogs.new(locale_manager, audio_manager)
	dialogs.init()
	print("[CritickerController] Initialized")


# ======================= ACTIVATION =======================

# Activates the Criticker when stepping on a nest.
# `goal` is the number of hazards to mark.
func activate(goal: int) -> void:
	is_active = true

	# Play crunch sound
	if audio_manager != null:
		audio_manager.play_crunch_sfx()

	# Show infection dialogues
	if dialogs != null:
		game_manager.set_game_input_locked(true)
		dialogs.show_infection(goal, func():
			game_manager.set_game_input_locked(false)
		)


# Deactivates the Criticker.
func deactivate() -> void:
	is_active = false


# ======================= PROGRESS =======================

# Increments the Criticker progress.
# Returns the new progress. If the goal is reached, calls complete().
func mark_progress(current_progress: int, goal: int) -> int:
	print("[CritickerController] markProgress - isActive: %s current: %d goal: %d" % [is_active, current_progress, goal])
	var new_progress: int = current_progress + 1

	if new_progress >= goal:
		print("[CritickerController] Goal reached! Calling complete()")
		complete()

	return new_progress


# ======================= COMPLETE =======================

# Called when the player reaches the goal.
# Shows the success dialogue.
func complete() -> void:
	print("[CritickerController] complete() - isActive: %s" % is_active)
	if not is_active:
		return

	is_active = false

	if dialogs != null:
		print("[CritickerController] Showing success dialog")
		game_manager.set_game_input_locked(true)
		dialogs.show_success(func():
			game_manager.set_game_input_locked(false)
		)
	else:
		print("[CritickerController] No dialogs instance!")


# ======================= FAILURE =======================

# Called when the player places a wrong flag while infected.
# Shows the failure dialogue and applies damage.
func fail() -> void:
	print("[CritickerController] fail() - isActive: %s" % is_active)
	if not is_active:
		return

	is_active = false

	if dialogs != null:
		game_manager.set_game_input_locked(true)
		dialogs.show_failure(game_manager, func():
			game_manager.set_game_input_locked(false)
		)
	else:
		game_manager.set_game_input_locked(false)


# ======================= ABANDON =======================

# Called when the player takes damage while infected.
# Shows the damage-abandon dialogue.
func abandon() -> void:
	print("[CritickerController] abandon() - isActive: %s" % is_active)
	if not is_active:
		return

	is_active = false

	if dialogs != null:
		print("[CritickerController] Showing damage abandon dialog")
		game_manager.set_game_input_locked(true)
		dialogs.show_damage_abandon(func():
			game_manager.set_game_input_locked(false)
		)
	else:
		print("[CritickerController] No dialogs instance!")


# ======================= CLEANUP =======================

# Destroys the dialog handler.
func destroy() -> void:
	if dialogs != null:
		dialogs.destroy()
		dialogs = null
