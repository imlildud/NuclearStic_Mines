# ==============================================================
# =================== TUTORIAL DIALOG MANAGER ==================
# ==============================================================
# Handles radio dialog display, typewriter animation, and input waiting.
#
# ⚠️ PHASE 3 STUB:
# This manager is 100% UI/DOM in the original JS. Its real
# implementation requires a `TutorialDialog.tscn` scene with:
#   - A TextureRect for the radio (walkie.png)
#   - A TextureRect for the bubble (bubble.png)
#   - A RichTextLabel or Label for the text
#   - A Timer for the typewriter effect
#   - Input handling on the overlay
#
# For now, this stub exposes the public API and emits signals so
# TutorialManager.gd compiles and can be wired. The full UI wiring
# will be done in Phase 3 (interfaces 1:1).

extends RefCounted

# ======================= SIGNALS =======================

# Emitted when the radio should appear and animate.
signal show_radio

# Emitted when the radio should disappear.
signal hide_radio

# Emitted with the text to display. The UI scene handles typing.
signal display_text(text: String, on_complete: Callable)

# Emitted to stop the typewriter effect (e.g. on skip).
signal stop_typing

# ======================= STATE =======================

var audio_manager = null
var is_typing: bool = false
var is_visible: bool = false
var game_manager = null


func _init(audio = null) -> void:
	audio_manager = audio


# ======================= INITIALIZATION =======================

# Placeholder. The UI scene sets up its own nodes in _ready().
func init() -> void:
	pass


# ======================= RADIO ANIMATION =======================

# Placeholder. The UI scene animates the radio via AnimationPlayer
# or Tween when it receives `show_radio`.
func start_radio_animation() -> void:
	pass


# Placeholder. The UI scene stops the animation.
func stop_radio_animation() -> void:
	pass


# Placeholder. Stops the radio animation without hiding it.
func stop_radio_animation_only() -> void:
	pass


# ======================= SHOW / HIDE =======================

# Shows the radio and bubble.
func show() -> void:
	if is_visible:
		return
	is_visible = true
	show_radio.emit()
	start_radio_animation()

	if audio_manager != null:
		audio_manager.play_sfx("radio.mp3", false, 0.15)


# Hides the radio and bubble.
func hide() -> void:
	if not is_visible:
		return
	is_visible = false
	hide_radio.emit()
	stop_radio_animation()
	stop_typewriter()


# ======================= TYPEWRITER =======================

# Stops the typewriter animation and its sound.
func stop_typewriter() -> void:
	is_typing = false
	stop_typing.emit()
	if audio_manager != null:
		audio_manager.stop_write_animation_sfx()


# Starts the writing sound loop.
func start_writing_sound() -> void:
	if audio_manager != null and not audio_manager.is_score_animating:
		audio_manager.start_write_animation_sfx()


# Requests the UI to type the text. The UI calls `on_complete`
# when the typewriter finishes.
func type_writer(text: String, on_complete: Callable = Callable()) -> void:
	show()
	stop_typewriter()
	is_typing = true
	start_writing_sound()
	display_text.emit(text, on_complete)


# ======================= INPUT WAITING =======================

# Waits for any user input (tap, click, key, movement).
# In Godot, the UI scene should call `on_any_input_received()`
# when it detects input, or call the callback directly.
func wait_for_any_input(callback: Callable) -> void:
	# Phase 3: the UI overlay emits a signal when input is detected.
	# For now, we call the callback immediately so tutorial logic
	# does not block during testing.
	if callback.is_valid():
		callback.call()


# Clears any input waiters. Placeholder for Phase 3.
func clear_any_input_waiters() -> void:
	pass


# Waits until the player steps on a flag-goal tile.
# In Godot, TutorialManager will poll the board; the UI just
# calls `on_flaggoal_reached()` when ready.
func wait_for_flaggoal(game_manager_ref, callback: Callable) -> void:
	# Phase 3: the TutorialManager will poll instead.
	# For now, do nothing.
	pass


# ======================= MESSAGES =======================

# Shows the pit-fall message, then calls `on_complete` on input.
func show_pit_fall_message(game_manager_ref, on_complete: Callable) -> void:
	game_manager = game_manager_ref
	var pit_message: String = "HA! Watch where you're stepping..."
	if game_manager != null and game_manager.tutorial_manager != null:
		pit_message = game_manager.tutorial_manager.get_text("tutorial.pitFall")

	type_writer(pit_message, func():
		stop_radio_animation_only()
		wait_for_any_input(func():
			print("Pit fall - input detected, calling onComplete")
			if on_complete.is_valid():
				on_complete.call()
		)
	)


# Clears all waiters. Placeholder for Phase 3.
func clear_waiters() -> void:
	clear_any_input_waiters()


# ======================= SEQUENCES =======================

# Plays a sequence of dialogues: type, wait for input, next.
func sequence(dialogues: Array, game_manager_ref, on_complete: Callable = Callable()) -> void:
	var index: int = 0

	var next = func():
		if index >= dialogues.size():
			clear_waiters()
			hide()
			if on_complete.is_valid():
				on_complete.call()
			return

		var d: Dictionary = dialogues[index]
		index += 1

		type_writer(d["text"], func():
			var wait_flaggoal: bool = d.get("waitForFlaggoal", false)

			if not wait_flaggoal:
				game_manager_ref.set_game_input_locked(false)

			if wait_flaggoal:
				wait_for_flaggoal(game_manager_ref, next)
			else:
				wait_for_any_input(func():
					game_manager_ref.set_game_input_locked(true)
					next.call()
				)
		)

	next.call()


# Plays a sequence with `after` callbacks on each dialogue.
func sequence_with_callbacks(dialogues: Array, game_manager_ref, on_complete: Callable = Callable()) -> void:
	var index: int = 0

	var next = func():
		if index >= dialogues.size():
			clear_waiters()
			hide()
			if on_complete.is_valid():
				on_complete.call()
			return

		var d: Dictionary = dialogues[index]
		index += 1

		type_writer(d["text"], func():
			# Run the "after" callback if present
			if d.has("after") and d["after"] is Callable:
				d["after"].call()

			var wait_flaggoal: bool = d.get("waitForFlaggoal", false)

			if not wait_flaggoal:
				game_manager_ref.set_game_input_locked(false)

			if wait_flaggoal:
				wait_for_flaggoal(game_manager_ref, next)
			else:
				wait_for_any_input(func():
					game_manager_ref.set_game_input_locked(true)
					next.call()
				)
		)

	next.call()
