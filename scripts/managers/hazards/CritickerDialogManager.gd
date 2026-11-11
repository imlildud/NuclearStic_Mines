# ==============================================================
# =================== CRITICKER DIALOG MANAGER =================
# ==============================================================
# Handles Criticker dialog display, typewriter animation, and input waiting.
# Reusable for any entity that needs to speak (no radio icon).
#
# ⚠️ PHASE 3 STUB:
# This manager is 100% UI/DOM in the original JS. Its real
# implementation requires a `CritickerDialog.tscn` scene with:
#   - An avatar TextureRect (speakerIcon.png)
#   - A bubble TextureRect (bubble.png)
#   - A RichTextLabel for the text
#   - A Timer for the typewriter effect
#   - Input handling on the overlay
#
# For now, this stub exposes the public API and emits signals so
# CritickerDialogs.gd compiles and can be wired.

extends RefCounted
class_name CritickerDialogManager

# ======================= SIGNALS =======================

# Emitted when the dialog bubble should appear.
signal show_bubble(avatar_file: String)

# Emitted when the dialog bubble should disappear.
signal hide_bubble

# Emitted with the text to display. The UI scene handles typing.
signal display_text(text: String, on_complete: Callable)

# Emitted to stop the typewriter effect.
signal stop_typing

# ======================= STATE =======================

var audio_manager = null
var speaker_icon: String = "criticized"
var is_typing: bool = false
var is_visible: bool = false


func _init(audio = null, options: Dictionary = {}) -> void:
	audio_manager = audio
	speaker_icon = options.get("speakerIcon", "criticized")


# Placeholder. The UI scene sets up its own nodes in _ready().
func init() -> void:
	pass


# Placeholder. The UI scene animates the avatar via AnimationPlayer
# or Tween when it receives `show_bubble`.
func start_avatar_animation() -> void:
	pass


# Placeholder. The UI scene stops the animation.
func stop_avatar_animation() -> void:
	pass


# Shows the dialog bubble.
func show() -> void:
	if is_visible:
		return
	is_visible = true
	show_bubble.emit(speaker_icon)
	start_avatar_animation()

	if audio_manager != null:
		audio_manager.play_sfx("criticker.mp3", false, 0.15)


# Hides the dialog bubble.
func hide() -> void:
	if not is_visible:
		return
	is_visible = false
	hide_bubble.emit()
	stop_avatar_animation()
	stop_typewriter()


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


# Waits for any user input (tap, click, key press).
# In Godot, the UI scene should call `on_any_input_received()`
# or call the callback directly.
func wait_for_any_input(callback: Callable) -> void:
	# Phase 3: the UI overlay emits a signal when input is detected.
	# For now, call the callback immediately so dialog logic does
	# not block during testing.
	if callback.is_valid():
		callback.call()


# Clears any input waiters. Placeholder for Phase 3.
func clear_waiters() -> void:
	stop_typewriter()
	stop_avatar_animation()


# Plays a sequence of dialogues: type, wait for input, next.
func sequence(dialogues: Array, on_complete: Callable = Callable()) -> void:
	var index: int = 0
	var next: Callable

	next = func():
		if index >= dialogues.size():
			clear_waiters()
			hide()
			if on_complete.is_valid():
				on_complete.call()
			return

		var d: Dictionary = dialogues[index]
		index += 1

		type_writer(d["text"], func():
			wait_for_any_input(func():
				next.call()
			)
		)

	next.call()


# Plays a sequence with `after` callbacks on each dialogue.
func sequence_with_callbacks(dialogues: Array, on_complete: Callable = Callable()) -> void:
	var index: int = 0
	var next: Callable

	next = func():
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

			wait_for_any_input(func():
				next.call()
			)
		)

	next.call()


# Destroys the dialog manager. Placeholder for Phase 3.
func destroy() -> void:
	clear_waiters()
	hide()
