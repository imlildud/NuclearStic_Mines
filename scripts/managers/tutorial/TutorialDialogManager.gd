# ==============================================================
# =================== TUTORIAL DIALOG MANAGER ==================
# ==============================================================
# Handles radio dialog display, typewriter animation, and input waiting.

extends RefCounted
class_name TutorialDialogManager

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

# UI scene (BubbleText) bound via bind_tutorial_dialog(). While it is
# null, wait_for_any_input() keeps the old stub behaviour (fires at
# once) so tutorial logic does not block during testing.
var ui = null
var _pending_input_callback: Callable = Callable()
var _waiting_for_input: bool = false
var _wait_move_only: bool = false


# Called by BubbleText.bind_tutorial_dialog().
func set_ui(p_ui) -> void:
	ui = p_ui


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
	# If no UI is bound, there is nothing to type and no listener to
	# call `on_complete`; fire it immediately so sequences do not
	# stall (matches the "stub" behaviour of wait_for_any_input).
	if ui == null:
		if on_complete.is_valid():
			on_complete.call()
		return
	display_text.emit(text, on_complete)


# ======================= INPUT WAITING =======================

# Waits for any user input (tap, click, key, movement).
# With a UI scene bound, the callback fires when BubbleText emits
# input_received (click / tap / key after typing, or the player
# moving — web parity). Without a UI scene, it fires at once so
# tutorial logic does not block during testing.
#
# `game_manager_ref` is optional; falls back to the internal
# `game_manager` reference set by TutorialManager (JS parity with
# `this.dialogManager.gameManager = this.gameManager`).
func wait_for_any_input(callback: Callable, game_manager_ref = null) -> void:
	if ui == null:
		if callback.is_valid():
			callback.call()
		return
	_pending_input_callback = callback
	_waiting_for_input = true
	_wait_move_only = false
	var gm = game_manager_ref if game_manager_ref != null else game_manager
	if gm != null:
		ui.set_watch_movement(true)


# Waits until the player actually moves a step. Clicks and keys do
# NOT advance this wait (on_any_input_received ignores them while
# _wait_move_only is set); only a real tile change does.
func wait_for_move(callback: Callable) -> void:
	if ui == null:
		if callback.is_valid():
			callback.call()
		return
	_pending_input_callback = callback
	_waiting_for_input = true
	_wait_move_only = true
	ui.set_watch_movement(true)


# Called by BubbleText (input_received signal) on click / tap / key.
# Ignored while waiting for a move only (waitForMove lines).
func on_any_input_received() -> void:
	if _wait_move_only:
		return
	_fire_pending_input()


# Called by BubbleText (movement_detected signal) when the player
# actually changes tile. Advances any wait, including move-only ones.
func on_movement_detected() -> void:
	_fire_pending_input()


func _fire_pending_input() -> void:
	if not _waiting_for_input or not _pending_input_callback.is_valid():
		return
	_waiting_for_input = false
	_wait_move_only = false
	var cb: Callable = _pending_input_callback
	_pending_input_callback = Callable()
	if ui != null:
		ui.set_watch_movement(false)
	hide()
	cb.call()


# Clears any input waiters.
func clear_any_input_waiters() -> void:
	_waiting_for_input = false
	_wait_move_only = false
	_pending_input_callback = Callable()
	if ui != null:
		ui.set_watch_movement(false)
	# JS clearWaiters() also clears the flaggoal interval.
	_clear_flaggoal_wait()


# Waits until the player steps on a flag-goal tile, then calls
# the callback. Port of the JS waitForFlaggoal: a 100 ms interval
# polling the player's tile; on flaggoal it hides the bubble,
# unlocks input and fires the callback.
var _flaggoal_timer: Timer = null
var _flaggoal_game_manager = null
var _flaggoal_callback: Callable = Callable()


func wait_for_flaggoal(game_manager_ref, callback: Callable) -> void:
	_clear_flaggoal_wait()
	if game_manager_ref == null:
		if callback.is_valid():
			callback.call()
		return
	_flaggoal_game_manager = game_manager_ref
	_flaggoal_callback = callback
	_flaggoal_timer = Timer.new()
	_flaggoal_timer.wait_time = 0.1
	_flaggoal_timer.autostart = true
	_flaggoal_timer.timeout.connect(_on_flaggoal_tick)
	game_manager_ref.add_child(_flaggoal_timer)


func _on_flaggoal_tick() -> void:
	var gm = _flaggoal_game_manager
	if gm == null or gm.board.is_empty() or gm.player == null:
		return
	var tile = gm.board[gm.player.get_pos_x()][gm.player.get_pos_y()]
	if tile != null and tile.is_flaggoal():
		_clear_flaggoal_wait()
		hide()
		gm.set_game_input_locked(false)
		var cb: Callable = _flaggoal_callback
		_flaggoal_callback = Callable()
		if cb.is_valid():
			cb.call()


func _clear_flaggoal_wait() -> void:
	if _flaggoal_timer != null:
		_flaggoal_timer.stop()
		_flaggoal_timer.queue_free()
		_flaggoal_timer = null
	_flaggoal_game_manager = null
	_flaggoal_callback = Callable()


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
		, game_manager_ref)
	)


# Clears all waiters. Placeholder for Phase 3.
func clear_waiters() -> void:
	clear_any_input_waiters()


# ======================= SEQUENCES =======================

# Sequence state lives in member vars, NOT in lambda captures
var _seq_dialogues: Array = []
var _seq_index: int = 0
var _seq_game_manager = null
var _seq_on_complete: Callable = Callable()
var _seq_with_callbacks: bool = false


# Plays a sequence of dialogues: type, wait for input, next.
func sequence(dialogues: Array, game_manager_ref, on_complete: Callable = Callable()) -> void:
	_start_sequence(dialogues, game_manager_ref, on_complete, false)


# Plays a sequence with `after` callbacks on each dialogue.
func sequence_with_callbacks(dialogues: Array, game_manager_ref, on_complete: Callable = Callable()) -> void:
	_start_sequence(dialogues, game_manager_ref, on_complete, true)


func _start_sequence(dialogues: Array, game_manager_ref, on_complete: Callable, with_callbacks: bool) -> void:
	_seq_dialogues = dialogues
	_seq_index = 0
	_seq_game_manager = game_manager_ref
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
# then waits for input (or a flaggoal) before the next line.
func _on_seq_line_typed(d: Dictionary) -> void:
	if _seq_with_callbacks and d.has("after") and d["after"] is Callable:
		d["after"].call()

	var wait_flaggoal: bool = d.get("waitForFlaggoal", false)
	var wait_move: bool = d.get("waitForMove", false)

	if not wait_flaggoal and not wait_move:
		_seq_game_manager.set_game_input_locked(false)

	if wait_flaggoal:
		wait_for_flaggoal(_seq_game_manager, _seq_next)
	elif wait_move:
		# The player must actually take a step (clicks/keys alone do
		# not advance this line). The step locks input again via
		# _on_seq_input, and the sequence unlocks at the end.
		_seq_game_manager.set_game_input_locked(false)
		wait_for_move(_on_seq_input)
	else:
		wait_for_any_input(_on_seq_input, _seq_game_manager)


# Called when the player gives input after a line: lock input and
# show the next line.
func _on_seq_input() -> void:
	_seq_game_manager.set_game_input_locked(true)
	_seq_next()
