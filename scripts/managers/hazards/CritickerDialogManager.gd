# ==============================================================
# =================== CRITICKER DIALOG MANAGER =================
# ==============================================================
# Handles Criticker dialog display, typewriter animation, and input waiting.
# Reusable for any entity that needs to speak (no radio icon).

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

# UI scene (BubbleText) bound via bind_criticker_dialog(). While it is
# null, wait_for_any_input() keeps the old stub behaviour (fires at
# once) so dialog logic does not block during testing.
var ui = null
var _pending_input_callback: Callable = Callable()
var _waiting_for_input: bool = false


# Called by BubbleText.bind_criticker_dialog().
func set_ui(p_ui) -> void:
	ui = p_ui


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
# With a UI scene bound, the callback fires when BubbleText emits
# input_received (click / tap / key after typing). Without one, it
# fires at once so dialog logic does not block during testing.
func wait_for_any_input(callback: Callable) -> void:
	if ui == null:
		if callback.is_valid():
			callback.call()
		return
	_pending_input_callback = callback
	_waiting_for_input = true


# Called by BubbleText (input_received signal) when the player gives
# any input while this manager is waiting for one.
func on_any_input_received() -> void:
	if not _waiting_for_input or not _pending_input_callback.is_valid():
		return
	_waiting_for_input = false
	var cb: Callable = _pending_input_callback
	_pending_input_callback = Callable()
	hide()
	cb.call()


# Clears any input waiters.
func clear_waiters() -> void:
	_waiting_for_input = false
	_pending_input_callback = Callable()
	stop_typewriter()
	stop_avatar_animation()


# Plays a sequence of dialogues: type, wait for input, next.
# Sequence state lives in member vars (see TutorialDialogManager:
# lambdas capture locals by value, so a local `index` would repeat
# the same line forever).
var _seq_dialogues: Array = []
var _seq_index: int = 0
var _seq_on_complete: Callable = Callable()
var _seq_with_callbacks: bool = false


func sequence(dialogues: Array, on_complete: Callable = Callable()) -> void:
	_start_sequence(dialogues, on_complete, false)


# Plays a sequence with `after` callbacks on each dialogue.
func sequence_with_callbacks(dialogues: Array, on_complete: Callable = Callable()) -> void:
	_start_sequence(dialogues, on_complete, true)


func _start_sequence(dialogues: Array, on_complete: Callable, with_callbacks: bool) -> void:
	_seq_dialogues = dialogues
	_seq_index = 0
	_seq_on_complete = on_complete
	_seq_with_callbacks = with_callbacks
	_seq_next()


# Shows the next line, or ends the sequence when there are none left.
func _seq_next() -> void:
	if _seq_index >= _seq_dialogues.size():
		clear_waiters()
		hide()
		if _seq_on_complete.is_valid():
			_seq_on_complete.call()
		return

	var d: Dictionary = _seq_dialogues[_seq_index]
	_seq_index += 1
	type_writer(d["text"], _on_seq_line_typed.bind(d))


# Called when a line finished typing: runs its `after` callback,
# then waits for input before the next line.
func _on_seq_line_typed(d: Dictionary) -> void:
	if _seq_with_callbacks and d.has("after") and d["after"] is Callable:
		d["after"].call()
	wait_for_any_input(_seq_next)


# Destroys the dialog manager. Placeholder for Phase 3.
func destroy() -> void:
	clear_waiters()
	hide()
