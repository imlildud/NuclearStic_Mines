# ==============================================================
# ==================== CRITICKER DIALOGS =======================
# ==============================================================
# Handles Criticker dialog texts and sequences.
# Uses localeManager for multi-language support.
#
# CritickerDialogManager is a pending UI stub (Phase 3), so the
# sequence calls work but only emit signals. The text and the
# sequence structure are preserved.

extends RefCounted

var locale_manager = null
var audio_manager = null
var dialog_manager = null


func _init(locale = null, audio = null) -> void:
	locale_manager = locale
	audio_manager = audio


# Returns a localized text for the given key.
func get_text(key: String) -> String:
	if locale_manager != null:
		return locale_manager.get(key)
	return key


# Initializes the dialog manager (stub in Phase 3).
func init() -> void:
	# In Phase 3 this creates a real CritickerDialogManager.
	# For now it uses the stub from criticker/CritickerDialogManager.gd.
	dialog_manager = CritickerDialogManager.new(audio_manager, {"speakerIcon": "criticized"})
	dialog_manager.init()
	print("[CritickerDialogs] Initialized")


# Destroys the dialog manager.
func destroy() -> void:
	if dialog_manager != null:
		dialog_manager.destroy()
		dialog_manager = null


# Shows the infection dialogues (3 steps, with {goal} replaced).
func show_infection(goal: int, on_complete: Callable = Callable()) -> void:
	if dialog_manager == null:
		print("[CritickerDialogs] No dialogManager, creating new one")
		init()
		if dialog_manager == null:
			if on_complete.is_valid():
				on_complete.call()
			return

	var dialogues: Array = [
		{"text": get_text("criticker.infection.step1")},
		{"text": get_text("criticker.infection.step2")},
		{"text": get_text("criticker.infection.step3").replace("{goal}", str(goal))}
	]

	dialog_manager.sequence(dialogues, func():
		# Just hide, don't destroy
		if dialog_manager != null:
			dialog_manager.hide()
		if on_complete.is_valid():
			on_complete.call()
	)


# Shows the success dialogue (2 lines).
func show_success(on_complete: Callable = Callable()) -> void:
	if dialog_manager == null:
		print("[CritickerDialogs] No dialogManager for success, skipping")
		if on_complete.is_valid():
			on_complete.call()
		return

	var dialogues: Array = [
		{"text": get_text("criticker.success.main")},
		{"text": get_text("criticker.success.farewell")}
	]

	dialog_manager.sequence(dialogues, func():
		if dialog_manager != null:
			dialog_manager.hide()
		if on_complete.is_valid():
			on_complete.call()
	)


# Shows the failure dialogue and applies damage after the first line.
func show_failure(game_manager, on_complete: Callable = Callable()) -> void:
	if dialog_manager == null:
		print("[CritickerDialogs] No dialogManager for failure, skipping")
		if on_complete.is_valid():
			on_complete.call()
		return

	var damage_applied: bool = false

	var dialogues: Array = [
		{
			"text": get_text("criticker.failure.main"),
			"after": func():
				if not damage_applied:
					damage_applied = true
					print("[CritickerDialogs] Applying damage after first dialogue")

					var char_ctrl = game_manager.char_ctrl
					if char_ctrl != null and char_ctrl.has_method("hurt_character"):
						char_ctrl.hurt_character()
					else:
						push_warning("[CritickerDialogs] char_ctrl.hurt_character not available")
		},
		{"text": get_text("criticker.failure.damage")}
	]

	dialog_manager.sequence_with_callbacks(dialogues, func():
		if dialog_manager != null:
			dialog_manager.hide()
		if on_complete.is_valid():
			on_complete.call()
	)


# Shows the damage abandonment dialogue (2 lines).
func show_damage_abandon(on_complete: Callable = Callable()) -> void:
	if dialog_manager == null:
		print("[CritickerDialogs] No dialogManager for damage abandon, skipping")
		if on_complete.is_valid():
			on_complete.call()
		return

	var dialogues: Array = [
		{"text": get_text("criticker.damage.main")},
		{"text": get_text("criticker.damage.farewell")}
	]

	dialog_manager.sequence(dialogues, func():
		if dialog_manager != null:
			dialog_manager.hide()
		if on_complete.is_valid():
			on_complete.call()
	)
