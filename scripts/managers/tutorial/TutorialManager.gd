# ==============================================================
# ==================== TUTORIAL MANAGER ========================
# ==============================================================
# Runs the tutorial: 8 phases described as DATA in PHASES, plus one
# generic runner (_start_phase) instead of one function per phase.
#
#   1 movement        4 several flags       7 rescue (1 dummy)
#   2 numbers         5 terrain (heights)   8 force + moving hazards
#   3 first flag      6 heights + hazards
#
# Text keys: each phase has a "key" prefix in en.json
#   <key>.dialog1..N, <key>.damageMessage, <key>.wrongFlagMessage,
#   <key>.goalWithoutMarkingMessage, <key>.successMessage,
#   <key>.hint (optional, shown after repeated failures),
#   <key>.shuffle (phase 8 only).

extends RefCounted
class_name TutorialManager

# ======================= SIGNALS =======================

signal show_dialogue(text: String)
signal hide_dialogue
signal manual_prompt_requested(question_text: String)
signal tutorial_completed

# ======================= PHASE TABLE =======================
#
# kind:            "reach"  -> reach the flaggoal (HP drop still checked)
#                  "flag"   -> mark hazards, then reach the flaggoal
#                  "rescue" -> pick up dummies, deliver at the start tile
# lines:           number of intro dialogs (<key>.dialog1..lines)
# reveal/hide_at:  show the whole board during the intro and hide it
#                  after the line with that 0-based index finished typing
# flags / force:   values given to the player when the phase starts
# marks:           hazards that must be flagged correctly (0 = none)
# reset_on_damage: regenerate the board after an HP drop
# reset_on_wrong_flag: regenerate the board after a wrong flag
# damage_mode:     "reset" (default) or "continue" (message, heal, go on)
# pals:            dummies to rescue (rescue phases)
# shuffle:         move the hazards once, after the first pickup

const PHASES := {
	1: {"key": "tutorial.phase1", "kind": "reach", "marks": 0},
	2: {"key": "tutorial.numbers", "kind": "reach", "lines": 4,
		"reveal": true, "hide_at": 2, "flags": 0, "marks": 0},
	3: {"key": "tutorial.phase2", "kind": "flag", "lines": 4,
		"reveal": true, "hide_at": 2, "flags": 1, "marks": 1,
		"reset_on_damage": false, "reset_on_wrong_flag": true},
	4: {"key": "tutorial.phase3", "kind": "flag", "lines": 4,
		"reveal": true, "hide_at": 2, "flags": 4, "marks": 4,
		"reset_on_damage": true, "reset_on_wrong_flag": true},
	5: {"key": "tutorial.terrain", "kind": "reach", "lines": 3,
		"flags": 0, "marks": 0, "damage_mode": "continue"},
	6: {"key": "tutorial.phase4", "kind": "flag", "lines": 4,
		"reveal": true, "hide_at": 2, "flags": 4, "marks": 4,
		"reset_on_damage": false, "reset_on_wrong_flag": true},
	7: {"key": "tutorial.phase5", "kind": "rescue", "lines": 3,
		"flags": 4, "force": 2, "pals": 1},
	8: {"key": "tutorial.force", "kind": "rescue", "lines": 3,
		"flags": 3, "force": 1, "pals": 2, "shuffle": true},
}

# Failures in a row (same phase) before the <key>.hint line is added.
const HINT_AFTER_FAILS := 2

# Set to false to silence the tutorial logs.
const TUTORIAL_DEBUG := true

# ======================= STATE =======================

var game_manager = null
var audio_manager = null
var locale_manager = null
var dialog_manager = null  # TutorialDialogManager
var current_phase: int = 1

var flag_check_timer: Timer = null
var rescue_check_timer: Timer = null
var is_resetting: bool = false

var _fail_count: int = 0
var _shuffled: bool = false

var _flag_last_hp: int = 2
var _flag_has_flagged_correctly: bool = false
var _flag_wrong_attempts: int = 0

var _rescue_last_hp: int = 2
var _rescue_exhaustion_shown: bool = false
var _rescue_logged_on_start: bool = false


func _log(msg: String) -> void:
	if TUTORIAL_DEBUG:
		print("[Tutorial] ", msg)


func _init(gm = null, audio = null, locale = null) -> void:
	game_manager = gm
	audio_manager = audio
	locale_manager = locale
	dialog_manager = TutorialDialogManager.new(audio_manager)


# Runs a list of dialogues through the dialog manager, then on_complete.
func _play_sequence(dialogues: Array, on_complete: Callable) -> void:
	if dialog_manager != null:
		dialog_manager.sequence_with_callbacks(dialogues, game_manager, on_complete)
	elif on_complete.is_valid():
		on_complete.call()


func get_text(key: String) -> String:
	if locale_manager != null:
		return locale_manager.get_translation(key)
	push_warning("[TutorialManager] locale_manager is null, using the LocaleManager autoload for: " + key)
	return LocaleManager.get_translation(key)


# Like get_text, but returns "" when the key has no translation
# (used for the optional hint / shuffle lines).
func _get_text_or_empty(key: String) -> String:
	var t: String = get_text(key)
	if t == key or t == "":
		return ""
	return t


# Starts the tutorial: phase 1.
func init() -> void:
	_log("init: input locked, phase 1 in 0.5s")
	game_manager.set_game_input_locked(true)
	await game_manager.get_tree().create_timer(0.5).timeout
	start_phase_1()


# ======================= PHASE 1: MOVEMENT =======================
# Kept hand-written: it is the only phase that waits for a real step.

func start_phase_1() -> void:
	_log("phase 1 start")
	var k: String = PHASES[1]["key"]
	var dialogues: Array = [
		{"text": get_text(k + ".dialog1")},
		{"text": get_text(k + ".dialog2"), "waitForMove": true},
		{"text": get_text(k + ".dialog3")}
	]
	_play_sequence(dialogues, func():
		game_manager.set_game_input_locked(false)
		print("Phase 1 completed")
	)


# ======================= GENERIC PHASE RUNNER (2-8) =======================

func _start_phase(n: int) -> void:
	var p: Dictionary = PHASES[n]
	_log("phase %d start (%s)" % [n, p["kind"]])

	var gm = game_manager
	gm.set_game_input_locked(true)
	gm.player.set_flags(int(p.get("flags", 0)))
	if p.has("force"):
		gm.player.set_force(int(p["force"]))
	gm.board_ctrl.current_phase = n
	_fail_count = 0
	_shuffled = false

	if p["kind"] == "rescue":
		gm.char_ctrl.remaining_pals = int(p.get("pals", 1))
		gm.board_ctrl.hide_all_tiles(gm.board)
		gm.board_ctrl.update_vision(gm.board, gm.player)
	elif p.get("reveal", false):
		gm.board_ctrl.reveal_all_tiles(gm.board)

	var after_hide_tiles: Callable = func():
		gm.board_ctrl.hide_all_tiles(gm.board)
		gm.board_ctrl.update_vision(gm.board, gm.player)
		_request_refresh()

	var dialogues: Array = []
	for i in range(int(p.get("lines", 0))):
		var d: Dictionary = {"text": get_text("%s.dialog%d" % [p["key"], i + 1])}
		if p.get("reveal", false) and i == int(p.get("hide_at", 2)):
			d["after"] = after_hide_tiles
		dialogues.append(d)

	_play_sequence(dialogues, func():
		gm.set_game_input_locked(false)
		_begin_checking(n)
	)


func _begin_checking(n: int) -> void:
	if PHASES[n]["kind"] == "rescue":
		_start_rescue_checking()
	else:
		_start_flag_checking_with_config(_flag_config(n))


# Builds the config the flag poller works with, from the phase table.
func _flag_config(n: int) -> Dictionary:
	var p: Dictionary = PHASES[n]
	var k: String = p["key"]
	return {
		"requiredMarkedCount": int(p.get("marks", 0)),
		"damageMessage": get_text(k + ".damageMessage"),
		"wrongFlagMessage": _get_text_or_empty(k + ".wrongFlagMessage"),
		"goalWithoutMarkingMessage": _get_text_or_empty(k + ".goalWithoutMarkingMessage"),
		"successMessage": _get_text_or_empty(k + ".successMessage"),
		"hint": _get_text_or_empty(k + ".hint"),
		"damageMode": str(p.get("damage_mode", "reset")),
		"resetBoardOnError": bool(p.get("reset_on_damage", false)),
		"resetBoardOnWrongFlag": bool(p.get("reset_on_wrong_flag", false)),
		"resetFlags": int(p.get("flags", 0)),
		"resetHp": 2,
	}


# Failure messages: the failure text, plus the hint once the player
# failed HINT_AFTER_FAILS times in this phase.
func _failure_messages(main: String, hint: String) -> Array:
	_fail_count += 1
	var msgs: Array = [main]
	if _fail_count >= HINT_AFTER_FAILS and hint != "":
		msgs.append(hint)
	return msgs


# ======================= HELPERS =======================

func _request_refresh() -> void:
	if game_manager != null and game_manager.has_method("request_refresh"):
		game_manager.request_refresh()


# Flags that sit on a real hazard. The Chef (and Criticized/Judgment)
# turn a correct flag into "marked" right away; every other character
# keeps it as a plain flag. Counting both makes the tutorial work for
# any character, not only the Chef.
func _count_correct_flags(board: Array) -> int:
	var n: int = 0
	for row in board:
		for tile in row:
			if tile.is_marked() or (tile.is_flagged() and tile.get_hazardtype() != "none"):
				n += 1
	return n


func _count_wrong_flags(board: Array) -> int:
	var n: int = 0
	for row in board:
		for tile in row:
			if tile.is_flagged() and tile.get_hazardtype() == "none" and not tile.is_marked():
				n += 1
	return n


# Shows one message; when the player acknowledges it, hides the
# bubble and runs on_ack.
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


# Shows several messages in a row (failure text, then hint).
func _show_check_messages(messages: Array, on_ack: Callable) -> void:
	if messages.is_empty():
		on_ack.call()
		return
	var rest: Array = messages.slice(1)
	_show_check_message(str(messages[0]), func():
		_show_check_messages(rest, on_ack)
	)


# ======================= FLAG / REACH CHECKING =======================

func _start_flag_checking_with_config(config: Dictionary, keep_state: bool = false) -> void:
	_stop_flag_check()

	if not keep_state:
		# Phases without marks count as "done" from the start, so
		# can_advance_on_goal() lets the flaggoal step advance.
		_flag_has_flagged_correctly = int(config.get("requiredMarkedCount", 0)) == 0
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


# Runs every 0.1 s during reach / flag phases. Order matters:
#   1. HP dropped -> message(s) -> reset (or heal and continue).
#   2. On the flaggoal without the required marks -> message -> reset.
#   3. Enough correct flags -> success message -> wait for the goal.
#   4. Wrong flag -> message(s) -> reset with a new board.
func _on_flag_check_tick(config: Dictionary) -> void:
	if flag_check_timer == null or is_resetting:
		return

	var board: Array = game_manager.board
	var player = game_manager.player
	if board.is_empty() or player == null:
		return

	var required: int = int(config.get("requiredMarkedCount", 0))
	var hint: String = str(config.get("hint", ""))

	# 1. HP dropped.
	var current_hp: int = player.get_hp()
	if current_hp < _flag_last_hp:
		_flag_last_hp = current_hp
		_log("flag check: HP dropped to %d" % current_hp)
		_stop_flag_check()
		game_manager.set_game_input_locked(true)
		var msgs: Array = _failure_messages(str(config.get("damageMessage", "")), hint)
		if str(config.get("damageMode", "reset")) == "continue":
			_show_check_messages(msgs, func():
				player.set_hp(int(config.get("resetHp", 2)))
				game_manager.set_game_input_locked(false)
				_start_flag_checking_with_config(config, true)
			)
		else:
			_show_check_messages(msgs, func():
				_reset_flag_phase(config, bool(config.get("resetBoardOnError", false)))
			)
		return
	_flag_last_hp = current_hp

	# 2. Reached the flaggoal without the required marks.
	var current_tile = board[player.get_pos_x()][player.get_pos_y()]
	if required > 0 and current_tile != null and current_tile.is_flaggoal() and not _flag_has_flagged_correctly:
		_log("flag check: on flaggoal without marks")
		_stop_flag_check()
		game_manager.set_game_input_locked(true)
		var msgs2: Array = _failure_messages(str(config.get("goalWithoutMarkingMessage", "")), hint)
		_show_check_messages(msgs2, func():
			_reset_flag_phase(config, false)
		)
		return

	if required == 0:
		return

	# 3. Enough correct flags.
	if not _flag_has_flagged_correctly and _count_correct_flags(board) >= required:
		_flag_has_flagged_correctly = true
		_log("flag check: %d correct flags, success message" % required)
		_stop_flag_check()
		if dialog_manager != null:
			dialog_manager.type_writer(str(config.get("successMessage", "")), func():
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

	# 4. Wrong flags.
	var wrong_flag_count: int = _count_wrong_flags(board)
	if wrong_flag_count > _flag_wrong_attempts:
		_log("flag check: wrong flags %d" % wrong_flag_count)
		_flag_wrong_attempts = wrong_flag_count
		_stop_flag_check()
		game_manager.set_game_input_locked(true)
		var msgs3: Array = _failure_messages(str(config.get("wrongFlagMessage", "")), hint)
		_show_check_messages(msgs3, func():
			_reset_flag_phase(config, bool(config.get("resetBoardOnWrongFlag", true)))
		)
		return


# Repositions (and regenerates the board when should_reset_board),
# restores HP/flags, then after 100 ms unlocks and restarts the check.
func _reset_flag_phase(config: Dictionary, should_reset_board: bool) -> void:
	if is_resetting:
		return
	is_resetting = true

	if should_reset_board:
		game_manager.board = game_manager.board_ctrl.generate_board(5)
		game_manager.char_ctrl.get_start_coords(game_manager.board)
		game_manager.board_ctrl.update_vision(game_manager.board, game_manager.player)
	else:
		game_manager.char_ctrl.get_start_coords(game_manager.board)
		game_manager.board_ctrl.update_vision_around_player(game_manager.board, game_manager.player)

	game_manager.player.set_hp(int(config.get("resetHp", 2)))
	game_manager.player.set_flags(int(config.get("resetFlags", 0)))

	if game_manager.has_signal("board_changed"):
		game_manager.board_changed.emit()

	await game_manager.get_tree().create_timer(0.1).timeout
	is_resetting = false
	game_manager.set_game_input_locked(false)
	_start_flag_checking_with_config(config)


# ======================= RESCUE CHECKING =======================

func _start_rescue_checking() -> void:
	_stop_rescue_check()

	_rescue_exhaustion_shown = false
	_rescue_logged_on_start = false
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


# Runs every 0.1 s during rescue phases:
#   1. HP dropped -> message(s) -> reset the phase.
#   2. Carrying as many dummies as force allows -> exhaustion
#      message (input locked until the player acknowledges it).
#      Phase 8 then shuffles the hazards once.
#   3. Back at the start tile with everything delivered -> success
#      message, then the next phase (or the manual prompt at the end).
func _on_rescue_check_tick() -> void:
	if rescue_check_timer == null or is_resetting:
		return

	var board: Array = game_manager.board
	var player = game_manager.player
	if board.is_empty() or player == null:
		return

	var p: Dictionary = PHASES[current_phase]

	# 1. Damage.
	var current_hp: int = player.get_hp()
	if current_hp < _rescue_last_hp:
		_rescue_last_hp = current_hp
		_log("rescue check: HP dropped to %d" % current_hp)
		_stop_rescue_check()
		game_manager.set_game_input_locked(true)
		var msgs: Array = _failure_messages(
			get_text(str(p["key"]) + ".damageMessage"),
			_get_text_or_empty(str(p["key"]) + ".hint"))
		_show_check_messages(msgs, func():
			_reset_rescue_phase()
		)
		return
	_rescue_last_hp = current_hp

	# 2. Exhaustion (does not return: delivery below still runs).
	var rescued: int = player.get_rescued()
	var force: int = player.get_force()
	if rescued >= force and rescued > 0 and not _rescue_exhaustion_shown:
		_rescue_exhaustion_shown = true
		_log("rescue check: exhaustion, rescued=%d force=%d" % [rescued, force])
		game_manager.set_game_input_locked(true)
		if dialog_manager != null:
			dialog_manager.clear_any_input_waiters()
			dialog_manager.type_writer(get_text("tutorial.exhaustion"), func():
				dialog_manager.wait_for_any_input(func():
					dialog_manager.hide()
					if p.get("shuffle", false) and not _shuffled:
						_shuffle_hazards()
					else:
						game_manager.set_game_input_locked(false)
				, game_manager)
			)
		else:
			game_manager.set_game_input_locked(false)

	# 3. Delivery.
	var current_tile = board[player.get_pos_x()][player.get_pos_y()]
	var on_start: bool = current_tile != null and current_tile.is_start()
	if on_start and not _rescue_logged_on_start:
		_rescue_logged_on_start = true
		_log("on start tile: rescued=%d remaining_pals=%d" % [rescued, game_manager.char_ctrl.remaining_pals])
	if not on_start:
		_rescue_logged_on_start = false

	var already_delivered: bool = game_manager.char_ctrl.remaining_pals == 0
	var carrying_all: bool = rescued > 0 and rescued >= game_manager.char_ctrl.remaining_pals
	if on_start and (already_delivered or carrying_all):
		_log("delivery: all dummies back -> success")
		_stop_rescue_check()
		if dialog_manager != null:
			dialog_manager.clear_any_input_waiters()
		if rescued > 0:
			game_manager.char_ctrl.deliver_pal(board)
		game_manager.set_game_input_locked(true)
		if dialog_manager == null:
			_after_rescue_success()
			return
		dialog_manager.type_writer(get_text(str(p["key"]) + ".successMessage"), func():
			dialog_manager.wait_for_any_input(func():
				dialog_manager.hide()
				_after_rescue_success()
			, game_manager)
		)
		return


func _after_rescue_success() -> void:
	if current_phase < PHASES.size():
		next_phase()
	else:
		show_manual_prompt()


# Phase 8: the "entity" moves the hazards (once). In the real game
# this happens after every rescue.
func _shuffle_hazards() -> void:
	_shuffled = true
	_log("phase 8: shuffling hazards")
	game_manager.board_ctrl.shuffle_tutorial_hazards(game_manager.board)
	_request_refresh()

	var msg: String = _get_text_or_empty(str(PHASES[current_phase]["key"]) + ".shuffle")
	if dialog_manager == null or msg == "":
		game_manager.set_game_input_locked(false)
		return
	dialog_manager.clear_any_input_waiters()
	dialog_manager.type_writer(msg, func():
		dialog_manager.wait_for_any_input(func():
			dialog_manager.hide()
			game_manager.set_game_input_locked(false)
		, game_manager)
	)


# New board, back to start, HP/flags/force restored, dummies reset.
func _reset_rescue_phase() -> void:
	if is_resetting:
		return
	is_resetting = true

	var p: Dictionary = PHASES[current_phase]

	game_manager.board = game_manager.board_ctrl.generate_board(5)
	game_manager.char_ctrl.get_start_coords(game_manager.board)
	game_manager.board_ctrl.update_vision(game_manager.board, game_manager.player)

	game_manager.player.set_hp(2)
	while game_manager.player.get_rescued() > 0:
		game_manager.player.decrement_rescue(1)
	game_manager.player.set_flags(int(p.get("flags", 0)))
	game_manager.player.set_force(int(p.get("force", 1)))

	game_manager.char_ctrl.remaining_pals = int(p.get("pals", 1))
	_shuffled = false

	if game_manager.has_signal("board_changed"):
		game_manager.board_changed.emit()

	await game_manager.get_tree().create_timer(0.1).timeout
	is_resetting = false
	game_manager.set_game_input_locked(false)
	_start_rescue_checking()


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

# True once the player has flagged enough hazards in the current flag
# phase. Kept for compatibility; GameManager should use
# can_advance_on_goal() instead.
func has_flagged_correctly() -> bool:
	return _flag_has_flagged_correctly


# GameManager.check_tutorial_progress asks this on every step onto a
# flaggoal tile: phases that need marks only advance once they are done.
func can_advance_on_goal() -> bool:
	var required: int = int(PHASES.get(current_phase, {}).get("marks", 0))
	return required == 0 or _flag_has_flagged_correctly


func next_phase() -> void:
	var prev_phase: int = current_phase
	current_phase += 1
	_log("next_phase: %d -> %d" % [prev_phase, current_phase])

	# Fresh state, and no pollers left from the previous phase.
	_flag_has_flagged_correctly = false
	_flag_wrong_attempts = 0
	_stop_flag_check()
	_stop_rescue_check()

	if dialog_manager != null:
		dialog_manager.clear_any_input_waiters()

	if current_phase > PHASES.size():
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

	_start_phase(current_phase)

	# The board Array was replaced: tell the renderer.
	if game_manager.has_signal("board_changed"):
		game_manager.board_changed.emit()


# ======================= COMPLETION =======================

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

func show_manual_prompt() -> void:
	_log("show_manual_prompt")
	if manual_prompt_requested.get_connections().is_empty():
		game_manager.show_message_modal(get_text("tutorial.phase5.manualQuestion"), func():
			_finish_manual_prompt()
		)
		game_manager.set_game_input_locked(true)
		return
	manual_prompt_requested.emit(get_text("tutorial.phase5.manualQuestion"))
	game_manager.set_game_input_locked(true)


func confirm_manual_yes() -> void:
	OS.shell_open("https://github.com/imlildud/NuclearStic_Mines/wiki")
	_finish_manual_prompt()


func confirm_manual_no() -> void:
	_finish_manual_prompt()


func _finish_manual_prompt() -> void:
	game_manager.set_game_input_locked(false)
	complete_tutorial()
