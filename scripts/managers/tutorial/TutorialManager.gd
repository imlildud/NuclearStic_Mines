# ==============================================================
# ==================== TUTORIAL MANAGER ========================
# ==============================================================
# Handles all tutorial-specific logic: dialogues, phase management,
# pit fall messages, and phase transitions.

extends RefCounted
class_name TutorialManager

# ======================= SIGNALS =======================

# Emitted to show a dialogue line. UI scene listens.
signal show_dialogue(text: String)

# Emitted when the dialogue system should hide.
signal hide_dialogue

# Emitted when the manual prompt (wiki question) should be shown.
signal manual_prompt_requested(question_text: String)

# Emitted when the tutorial is fully completed.
signal tutorial_completed

# ======================= STATE =======================

var game_manager = null
var audio_manager = null
var locale_manager = null
var dialog_manager = null  # TutorialDialogManager (pending .gd)
var current_phase: int = 1

# Timers for polling loops (replaces setInterval)
var flag_check_timer: Timer = null
var rescue_check_timer: Timer = null
var is_resetting: bool = false

# Flag-check state (the JS keeps these as closure locals inside
# startFlagCheckingWithConfig; here they are members, reset on
# every (re)start of the checking).
var _flag_last_hp: int = 2
var _flag_has_flagged_correctly: bool = false
var _flag_wrong_attempts: int = 0

# Rescue-check state (JS closure locals in startRescueChecking).
var _rescue_last_hp: int = 2
var _rescue_exhaustion_shown: bool = false
var _rescue_logged_on_start: bool = false


# Set to false to silence the tutorial logs.
const TUTORIAL_DEBUG := true


# Phase monitor: prints [Tutorial] lines to the console so the
# phase flow (starts, transitions, checks, delivery) can be
# followed while testing. Toggle with TUTORIAL_DEBUG.
func _log(msg: String) -> void:
	if TUTORIAL_DEBUG:
		print("[Tutorial] ", msg)


func _init(gm = null, audio = null, locale = null) -> void:
	game_manager = gm
	audio_manager = audio
	locale_manager = locale
	print("TutorialManager received localeManager: ", locale)
	# The dialog manager runs the phases' sequences (types them in
	# the bubble, waits for input between lines).
	dialog_manager = TutorialDialogManager.new(audio_manager)


# Runs a phase's dialogues through the dialog manager, then calls
# on_complete. Falls back to just calling on_complete when there
# is no dialog manager.
func _play_sequence(dialogues: Array, on_complete: Callable) -> void:
	if dialog_manager != null:
		dialog_manager.sequence_with_callbacks(dialogues, game_manager, on_complete)
	elif on_complete.is_valid():
		on_complete.call()


# Returns a translated string.
func get_text(key: String) -> String:
	if locale_manager != null:
		return locale_manager.get_translation(key)
	push_warning("[TutorialManager] locale_manager is null, using the LocaleManager autoload for: " + key)
	return LocaleManager.get_translation(key)


# Starts the tutorial: shows phase 1 dialogues.
func init() -> void:
	# dialog_manager is created in _init; the phases run their
	# dialogues through it via _play_sequence().
	_log("init: input locked, phase 1 in 0.5s")
	game_manager.set_game_input_locked(true)

	# Small delay before phase 1 (RefCounted has no get_tree()).
	await game_manager.get_tree().create_timer(0.5).timeout
	start_phase_1()


# ======================= PHASE 1: MOVEMENT =======================

# Shows the movement tutorial dialogues and unlocks input.
func start_phase_1() -> void:
	_log("phase 1 start")
	var dialogues: Array = [
		{"text": get_text("tutorial.phase1.dialog1")},
		{"text": get_text("tutorial.phase1.dialog2"), "waitForMove": true},
		{"text": get_text("tutorial.phase1.dialog3")}
	]

	_play_sequence(dialogues, func():
		game_manager.set_game_input_locked(false)
		print("Phase 1 completed")
	)


# ======================= PHASE 2: FLAG =======================

# Shows the flag tutorial, reveals all tiles, then hides them.
func start_phase_2() -> void:
	_log("phase 2 start")
	game_manager.set_game_input_locked(true)
	game_manager.player.set_flags(1)
	game_manager.board_ctrl.reveal_all_tiles(game_manager.board)

	var after_hide_tiles: Callable = func():
		game_manager.board_ctrl.hide_all_tiles(game_manager.board)
		game_manager.board_ctrl.update_vision(game_manager.board, game_manager.player)
		_request_refresh()

	var dialogues: Array = [
		{"text": get_text("tutorial.phase2.dialog1")},
		{"text": get_text("tutorial.phase2.dialog2")},
		{"text": get_text("tutorial.phase2.dialog3"), "after": after_hide_tiles},
		{"text": get_text("tutorial.phase2.dialog4")}
	]

	_play_sequence(dialogues, func():
		game_manager.set_game_input_locked(false)
		_start_flag_checking_with_config({
			"requiredMarkedCount": 1,
			"damageMessage": get_text("tutorial.phase2.damageMessage"),
			"wrongFlagMessage": get_text("tutorial.phase2.wrongFlagMessage"),
			"goalWithoutMarkingMessage": get_text("tutorial.phase2.goalWithoutMarkingMessage"),
			"successMessage": get_text("tutorial.phase2.successMessage"),
			"resetBoardOnError": false
		})
	)


# ======================= PHASE 3: MULTIPLE FLAGS =======================

func start_phase_3() -> void:
	_log("phase 3 start")
	game_manager.set_game_input_locked(true)
	game_manager.player.set_flags(4)
	game_manager.board_ctrl.reveal_all_tiles(game_manager.board)
	game_manager.board_ctrl.current_phase = 3

	var after_hide_tiles: Callable = func():
		game_manager.board_ctrl.hide_all_tiles(game_manager.board)
		game_manager.board_ctrl.update_vision(game_manager.board, game_manager.player)
		_request_refresh()

	var dialogues: Array = [
		{"text": get_text("tutorial.phase3.dialog1")},
		{"text": get_text("tutorial.phase3.dialog2")},
		{"text": get_text("tutorial.phase3.dialog3"), "after": after_hide_tiles},
		{"text": get_text("tutorial.phase3.dialog4")}
	]

	_play_sequence(dialogues, func():
		game_manager.set_game_input_locked(false)
		_start_flag_checking_with_config({
			"requiredMarkedCount": 4,
			"damageMessage": get_text("tutorial.phase3.damageMessage"),
			"wrongFlagMessage": get_text("tutorial.phase3.wrongFlagMessage"),
			"goalWithoutMarkingMessage": get_text("tutorial.phase3.goalWithoutMarkingMessage"),
			"successMessage": get_text("tutorial.phase3.successMessage"),
			"resetBoardOnError": true,
			"resetFlags": 4
		})
	)


# ======================= PHASE 4: HEIGHTS =======================

func start_phase_4() -> void:
	_log("phase 4 start")
	game_manager.set_game_input_locked(true)
	game_manager.player.set_flags(4)
	game_manager.board_ctrl.reveal_all_tiles(game_manager.board)
	game_manager.board_ctrl.current_phase = 4

	var after_hide_tiles: Callable = func():
		game_manager.board_ctrl.hide_all_tiles(game_manager.board)
		game_manager.board_ctrl.update_vision(game_manager.board, game_manager.player)
		_request_refresh()

	var dialogues: Array = [
		{"text": get_text("tutorial.phase4.dialog1")},
		{"text": get_text("tutorial.phase4.dialog2")},
		{"text": get_text("tutorial.phase4.dialog3"), "after": after_hide_tiles},
		{"text": get_text("tutorial.phase4.dialog4")}
	]

	_play_sequence(dialogues, func():
		game_manager.set_game_input_locked(false)
		_start_flag_checking_with_config({
			"requiredMarkedCount": 4,
			"damageMessage": get_text("tutorial.phase4.damageMessage"),
			"wrongFlagMessage": get_text("tutorial.phase4.wrongFlagMessage"),
			"goalWithoutMarkingMessage": get_text("tutorial.phase4.goalWithoutMarkingMessage"),
			"successMessage": get_text("tutorial.phase4.successMessage"),
			"resetFlags": 4,
			"resetHp": 2
		})
	)


# ======================= PHASE 5: RESCUE =======================

func start_phase_5() -> void:
	_log("phase 5 start")
	game_manager.set_game_input_locked(true)
	game_manager.player.set_flags(4)
	game_manager.board_ctrl.current_phase = 5
	game_manager.char_ctrl.remaining_pals = 1
	game_manager.board_ctrl.hide_all_tiles(game_manager.board)
	game_manager.board_ctrl.update_vision(game_manager.board, game_manager.player)

	var dialogues: Array = [
		{"text": get_text("tutorial.phase5.dialog1")},
		{"text": get_text("tutorial.phase5.dialog2")},
		{"text": get_text("tutorial.phase5.dialog3")}
	]

	_play_sequence(dialogues, func():
		game_manager.set_game_input_locked(false)
		_start_rescue_checking()
	)


# ======================= RESCUE CHECKING =======================

# Polls the board and player to detect rescue completion or damage
func _start_rescue_checking() -> void:
	_stop_rescue_check()

	# Fresh state per (re)start, like the JS closure locals.
	_rescue_exhaustion_shown = false
	if game_manager.player != null:
		_rescue_last_hp = game_manager.player.get_hp()

	rescue_check_timer = Timer.new()
	rescue_check_timer.wait_time = 0.1
	rescue_check_timer.autostart = true
	rescue_check_timer.timeout.connect(_on_rescue_check_tick)
	game_manager.add_child(rescue_check_timer)


func _stop_rescue_check() -> void:
	if rescue_check_timer != null:
		rescue_check_timer.stop()
		rescue_check_timer.queue_free()
		rescue_check_timer = null


# Port of the JS startRescueChecking setInterval body
# (TutorialManager.js). Runs every 0.1 s while the rescue phase
# is active:
#   1. HP dropped -> damage message -> reset phase (new board).
#   2. Carrying as many pals as force allows -> exhaustion
#      warning once; input locks for 3 s, then unlocks.
#   3. Back at the start tile with the pal delivered -> success
#      message, then the manual prompt.
# The delivery condition is the web's: the normal movement code
# already called deliver_pal() on the step onto the start tile
# (rescued -> 0, remaining_pals -> 0), so the check tests the
# POST-delivery state (remaining_pals == 0). The pre-delivery
# form (rescued >= remaining_pals) is kept as a fallback in case
# the tick runs before the move handler delivers.
func _on_rescue_check_tick() -> void:
	if rescue_check_timer == null or is_resetting:
		return

	var board: Array = game_manager.board
	var player = game_manager.player

	if board.is_empty() or player == null:
		return

	# 1. The player stepped on a hazard and lost HP.
	var current_hp: int = player.get_hp()
	if current_hp < _rescue_last_hp:
		_rescue_last_hp = current_hp
		_log("rescue check: HP dropped to %d, damage message" % current_hp)
		_stop_rescue_check()
		_show_check_message(get_text("tutorial.phase5.damageMessage"), func():
			_reset_rescue_phase()
		)
		game_manager.set_game_input_locked(true)
		return
	_rescue_last_hp = current_hp

	# 2. Carrying as many pals as force allows: exhaustion warning.
	# Unlike the other branches this one does NOT return: the
	# delivery check below still runs on the same tick (JS parity).
	var rescued: int = player.get_rescued()
	var force: int = player.get_force()
	if rescued >= force and not _rescue_exhaustion_shown:
		_rescue_exhaustion_shown = true
		_log("rescue check: exhaustion, rescued=%d force=%d" % [rescued, force])
		if dialog_manager != null:
			dialog_manager.clear_any_input_waiters()
			dialog_manager.type_writer(get_text("tutorial.exhaustion"), func():
				dialog_manager.wait_for_any_input(func():
					dialog_manager.hide()
				)
			)
		game_manager.set_game_input_locked(true)
		_unlock_after_delay(3.0)

	# 3. Back at the start tile with the pal delivered.
	var current_tile = board[player.get_pos_x()][player.get_pos_y()]
	var on_start: bool = current_tile != null and current_tile.is_start()
	# Log once per arrival on the start tile (not every 0.1 s tick).
	if on_start and not _rescue_logged_on_start:
		_rescue_logged_on_start = true
		_log("on start tile: rescued=%d remaining_pals=%d" % [rescued, game_manager.char_ctrl.remaining_pals])
	if not on_start:
		_rescue_logged_on_start = false
	var already_delivered: bool = game_manager.char_ctrl.remaining_pals == 0
	var carrying_all: bool = rescued > 0 and rescued >= game_manager.char_ctrl.remaining_pals
	if on_start and (already_delivered or carrying_all):
		_log("delivery: rescued=%d remaining_pals=%d -> success + manual prompt" % [rescued, game_manager.char_ctrl.remaining_pals])
		_stop_rescue_check()
		if dialog_manager != null:
			dialog_manager.clear_any_input_waiters()
		if rescued > 0:
			game_manager.char_ctrl.deliver_pal(board)
		if dialog_manager == null:
			show_manual_prompt()
			return
		dialog_manager.type_writer(get_text("tutorial.phase5.successMessage"), func():
			dialog_manager.wait_for_any_input(func():
				dialog_manager.hide()
				show_manual_prompt()
			)
		)
		game_manager.set_game_input_locked(true)
		return


# Port of the JS damage reset inside startRescueChecking:
# new board, back to start, HP/flags restored, 1 pal to rescue,
# then after 100 ms unlock and restart the checking.
func _reset_rescue_phase() -> void:
	if is_resetting:
		return
	is_resetting = true

	game_manager.board = game_manager.board_ctrl.generate_board(5)
	game_manager.char_ctrl.get_start_coords(game_manager.board)
	game_manager.board_ctrl.update_vision(game_manager.board, game_manager.player)

	game_manager.player.set_hp(2)
	while game_manager.player.get_rescued() > 0:
		game_manager.player.decrement_rescue(1)
	game_manager.player.set_flags(4)

	game_manager.char_ctrl.remaining_pals = 1

	# The board may have been replaced: tell the renderer.
	if game_manager.has_signal("board_changed"):
		game_manager.board_changed.emit()

	# JS setTimeout 100 ms: unlock and restart the checking.
	await game_manager.get_tree().create_timer(0.1).timeout
	is_resetting = false
	game_manager.set_game_input_locked(false)
	_start_rescue_checking()


# Unlocks input after a delay (JS setTimeout). Used by the
# exhaustion warning, which locks input for 3 s.
func _unlock_after_delay(seconds: float) -> void:
	await game_manager.get_tree().create_timer(seconds).timeout
	game_manager.set_game_input_locked(false)


# ======================= FLAG CHECKING =======================

# Polls the board and player to detect marking progress, damage,
# wrong flags, or reaching the goal. Replaces the JS setInterval.
func _start_flag_checking_with_config(config: Dictionary) -> void:
	_stop_flag_check()

	# Fresh state per (re)start, like the JS closure locals.
	_flag_has_flagged_correctly = false
	_flag_wrong_attempts = 0
	if game_manager.player != null:
		_flag_last_hp = game_manager.player.get_hp()

	flag_check_timer = Timer.new()
	flag_check_timer.wait_time = 0.1
	flag_check_timer.autostart = true
	flag_check_timer.timeout.connect(_on_flag_check_tick.bind(config))
	game_manager.add_child(flag_check_timer)


func _stop_flag_check() -> void:
	if flag_check_timer != null:
		flag_check_timer.stop()
		flag_check_timer.queue_free()
		flag_check_timer = null


# Tells the renderer to redraw after an in-place visibility change
# (reveal/hide/vision). The board array is NOT replaced, so
# board_changed does not fire; without this the render lags one
# move behind the data (the reveal/hide only shows after the next
# move refreshes the board).
func _request_refresh() -> void:
	if game_manager != null and game_manager.has_method("request_refresh"):
		game_manager.request_refresh()


# Port of the JS startFlagCheckingWithConfig setInterval body
# (TutorialManager.js). Runs every 0.1 s while a flag phase is
# active. Order matters, like in the JS:
#   1. HP dropped -> damage message -> reset phase.
#   2. On the flaggoal without having flagged correctly -> message
#      -> reset phase (no board regen).
#   3. Enough hazards marked -> success message -> wait for any
#      input -> wait until the player steps on the flaggoal ->
#      next_phase().
#   4. Wrong flags (flagged a safe tile) -> message -> reset phase
#      (board regen).
func _on_flag_check_tick(config: Dictionary) -> void:
	if flag_check_timer == null or is_resetting:
		return

	var board: Array = game_manager.board
	var player = game_manager.player

	if board.is_empty() or player == null:
		return

	# 1. The player stepped on a hazard and lost HP.
	var current_hp: int = player.get_hp()
	if current_hp < _flag_last_hp:
		_flag_last_hp = current_hp
		_log("flag check: HP dropped to %d, damage message" % current_hp)
		_stop_flag_check()
		_show_check_message(str(config.get("damageMessage", "Come on, it's not that hard...")), func():
			_reset_flag_phase(config, bool(config.get("resetBoardOnError", false)))
		)
		game_manager.set_game_input_locked(true)
		return
	_flag_last_hp = current_hp

	# 2. Reached the flaggoal without having flagged correctly.
	var current_tile = board[player.get_pos_x()][player.get_pos_y()]
	if current_tile != null and current_tile.is_flaggoal() and not _flag_has_flagged_correctly:
		_log("flag check: on flaggoal without marks")
		_stop_flag_check()
		_show_check_message(str(config.get("goalWithoutMarkingMessage", "You haven't marked anything yet...")), func():
			_reset_flag_phase(config, false)
		)
		game_manager.set_game_input_locked(true)
		return

	# 3. Enough hazards marked correctly.
	var marked_count: int = 0
	for row in board:
		for tile in row:
			if tile.is_marked():
				marked_count += 1

	if marked_count >= int(config.get("requiredMarkedCount", 1)) and not _flag_has_flagged_correctly:
		_flag_has_flagged_correctly = true
		_log("flag check: marked %d, success message" % marked_count)
		_stop_flag_check()
		if dialog_manager != null:
			dialog_manager.type_writer(str(config.get("successMessage", "Well done. Now head for the goal.")), func():
				game_manager.set_game_input_locked(false)
				dialog_manager.wait_for_any_input(func():
					dialog_manager.hide()
					dialog_manager.wait_for_flaggoal(game_manager, func():
						next_phase()
					)
				, game_manager)
			)
		game_manager.set_game_input_locked(true)
		return

	# 4. Wrong flags: flagged tiles with no hazard that were not marked.
	var wrong_flag_count: int = 0
	for row in board:
		for tile in row:
			if tile.is_flagged() and tile.get_hazardtype() == "none" and not tile.is_marked():
				wrong_flag_count += 1

	if wrong_flag_count > _flag_wrong_attempts:
		_log("flag check: wrong flags %d (attempts %d)" % [wrong_flag_count, _flag_wrong_attempts])
		_flag_wrong_attempts = wrong_flag_count
		_stop_flag_check()
		_show_check_message(str(config.get("wrongFlagMessage", "Do you have some kind of problem?")), func():
			_reset_flag_phase(config, true)
		)
		game_manager.set_game_input_locked(true)
		return


# Shows a one-line message in the bubble; when the player
# acknowledges it, hides the bubble and runs on_ack.
func _show_check_message(message: String, on_ack: Callable) -> void:
	if dialog_manager == null:
		if on_ack.is_valid():
			on_ack.call()
		return
	dialog_manager.clear_any_input_waiters()
	dialog_manager.type_writer(message, func():
		dialog_manager.wait_for_any_input(func():
			dialog_manager.hide()
			on_ack.call()
		, game_manager)
	)


# Port of the JS resetPhase: repositions (and regenerates the board
# when should_reset_board), restores HP/flags, then after 100 ms
# unlocks and restarts the flag checking with the same config.
func _reset_flag_phase(config: Dictionary, should_reset_board: bool) -> void:
	if is_resetting:
		return
	is_resetting = true

	var reset_hp: int = int(config.get("resetHp", 2))
	var reset_flags: int = int(config.get("resetFlags", 4))

	if should_reset_board:
		game_manager.board = game_manager.board_ctrl.generate_board(5)
		game_manager.char_ctrl.get_start_coords(game_manager.board)
		game_manager.board_ctrl.update_vision(game_manager.board, game_manager.player)
	else:
		game_manager.char_ctrl.get_start_coords(game_manager.board)
		game_manager.board_ctrl.update_vision_around_player(game_manager.board, game_manager.player)

	game_manager.player.set_hp(reset_hp)
	game_manager.player.set_flags(reset_flags)

	# The board may have been replaced: tell the renderer.
	if game_manager.has_signal("board_changed"):
		game_manager.board_changed.emit()

	# JS setTimeout 100 ms: unlock and restart the checking.
	await game_manager.get_tree().create_timer(0.1).timeout
	is_resetting = false
	game_manager.set_game_input_locked(false)
	_start_flag_checking_with_config(config)


# ======================= PIT FALL =======================

# Called by CharacterController when the player falls into a safepit.
func on_pit_fall() -> void:
	game_manager.set_game_input_locked(true)
	game_manager.char_ctrl.get_start_coords(game_manager.board)
	game_manager.board_ctrl.update_vision(game_manager.board, game_manager.player)
	_request_refresh()
	if dialog_manager != null:
		dialog_manager.show_pit_fall_message(game_manager, func():
			game_manager.set_game_input_locked(false)
		)
	else:
		hide_dialogue.emit()
		game_manager.set_game_input_locked(false)


# ======================= PHASE TRANSITION =======================

# Advances to the next tutorial phase.
# True once the player has marked enough hazards in the current
# flag phase (phases 2-4). GameManager.check_tutorial_progress
# uses it: in those phases the flaggoal step only advances once
# the marks are done, like phase 1 advances on the step itself.
func has_flagged_correctly() -> bool:
	return _flag_has_flagged_correctly


func next_phase() -> void:
	var prev_phase: int = current_phase
	current_phase += 1
	_log("next_phase: %d -> %d" % [prev_phase, current_phase])

	# Fresh flag-check state for the new phase. This must happen
	# here, not only when the checking (re)starts: between the
	# phase change and the flag checking start, the player can move
	# during the intro dialogues, and a leftover "true" from the
	# previous phase would skip the new phase on the flaggoal step.
	_flag_has_flagged_correctly = false
	_flag_wrong_attempts = 0

	# Drop any pending dialog wait: the success message's "wait for
	# input" and its wait_for_flaggoal timer are stale now that the
	# phase changed (the step itself advanced, like phase 1).
	if dialog_manager != null:
		dialog_manager.clear_any_input_waiters()

	if current_phase > 5:
		complete_tutorial()
		return

	game_manager.board_ctrl.current_phase = current_phase
	game_manager.board = game_manager.board_ctrl.generate_board(5)
	game_manager.char_ctrl.get_start_coords(game_manager.board)
	game_manager.board_ctrl.update_vision(game_manager.board, game_manager.player)
	game_manager.player.set_hp(2)

	while game_manager.player.get_rescued() > 0:
		game_manager.player.decrement_rescue(1)

	game_manager.set_game_input_locked(false)

	match current_phase:
		2: start_phase_2()
		3: start_phase_3()
		4: start_phase_4()
		5: start_phase_5()

	# The board Array was replaced: tell the renderer to use the new
	# one, or the phase change is invisible (it keeps the old Array).
	if game_manager.has_signal("board_changed"):
		game_manager.board_changed.emit()


# ======================= COMPLETION =======================

# Marks the tutorial as complete and returns to the main menu.
func complete_tutorial() -> void:
	_log("complete_tutorial")
	SaveManager.set_tutorial_completed(true)
	tutorial_completed.emit()
	var message: String = get_text("menu.tutorialCompleted")
	if game_manager.show_message.get_connections().is_empty():
		push_warning("[TutorialManager] complete_tutorial: nothing listens to GameManager.show_message, the final modal will not show (Game.gd must connect it).")
	game_manager.show_message_modal(message, func():
		await game_manager.get_tree().create_timer(0.5).timeout
		game_manager.get_tree().change_scene_to_file("res://scenes/menu/MainMenu.tscn")
	)


# ======================= MANUAL PROMPT =======================

# Shows the manual question (wiki link). Emits a signal so the UI
# can render buttons; the UI calls `confirm_manual_yes/no` on choice.
func show_manual_prompt() -> void:
	_log("show_manual_prompt")
	# If no UI is listening for the Yes/No buttons yet, fall back
	# to the generic message modal so the tutorial can still
	# finish instead of sitting locked forever.
	if manual_prompt_requested.get_connections().is_empty():
		game_manager.show_message_modal(get_text("tutorial.phase5.manualQuestion"), func():
			_finish_manual_prompt()
		)
		game_manager.set_game_input_locked(true)
		return
	manual_prompt_requested.emit(get_text("tutorial.phase5.manualQuestion"))
	game_manager.set_game_input_locked(true)


# Called by the UI when the player chooses YES on the manual prompt.
func confirm_manual_yes() -> void:
	OS.shell_open("https://github.com/imlildud/NuclearStic_Mines/wiki")
	_finish_manual_prompt()


# Called by the UI when the player chooses NO on the manual prompt.
func confirm_manual_no() -> void:
	_finish_manual_prompt()


func _finish_manual_prompt() -> void:
	game_manager.set_game_input_locked(false)
	complete_tutorial()
