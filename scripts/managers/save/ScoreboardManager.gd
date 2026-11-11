# ==============================================================
# ==================== SCOREBOARD MANAGER ======================
# ==============================================================
# Handles score calculation and grade logic.
#
# NOTE: The animation is handled by Scoreboard.gd (the UI scene).
# This manager only computes the scores and emits a single signal
# with the final data, so the UI can animate it.
#
# NOTE: This extends Node (not RefCounted) because it uses
# get_tree() for Discord presence updates.
# GameManager must call `add_child(scoreboard)` after creating it.

extends Node
class_name ScoreboardManager

# ======================= SIGNALS =======================

# Emitted when the scoreboard should be shown.
# The payload contains all the final values for the UI to animate.
signal scoreboard_shown(data: Dictionary)

# Emitted when the scoreboard should be hidden.
signal scoreboard_hidden

# Emitted to update the rank display (RankManager).
signal rank_display_update_requested(new_total: int, is_hardcore: bool)

# ======================= STATE =======================

var game_manager = null


func _init(gm = null) -> void:
	game_manager = gm


# ======================= SIZE MULTIPLIER =======================

func get_rescue_value(size: int) -> int:
	if size <= 8: return 100
	if size <= 12: return 150
	if size <= 16: return 200
	if size <= 20: return 300
	return 500


func get_flag_value(size: int) -> int:
	if size <= 8: return 40
	if size <= 12: return 70
	if size <= 16: return 100
	if size <= 20: return 150
	return 200


func get_max_flags_by_hazards(board: Array) -> int:
	var total_hazards: int = 0
	for i in range(board.size()):
		for j in range(board.size()):
			if board[i][j].get_hazardtype() != "none":
				total_hazards += 1
	return total_hazards


func get_mode_multiplier() -> float:
	var config: Dictionary = game_manager.config

	if config.get("mode") == "legacy":
		var level: int = game_manager.current_level
		var multiplier: float = 1.0 + (float(level) / 100.0)
		if multiplier > 2.0:
			multiplier = 2.0
		return multiplier

	if config.get("mode") == "daily":
		var streak: int = SaveManager.get_daily_streak()
		var multiplier: float = 1.0 + (float(streak) / 100.0)
		if multiplier > 1.6:
			multiplier = 1.6
		return multiplier

	return 1.0


# ======================= MAIN DISPLAY METHOD =======================

# Displays the scoreboard. Emits `scoreboard_shown` with the payload
# so the UI scene can animate the values.
func show(is_victory: bool) -> void:
	var scores: Dictionary = calculate_scores()

	# Discord presence.
	var grade_file_for_discord: String = get_grade_file(scores["total"], scores["maxTotal"])
	var grade_name: String = grade_file_for_discord.replace(".png", "").to_upper()
	var total_display: String = "%d/%d" % [scores["total"], scores["maxTotal"]]

	DiscordRPC.update_presence(
		"📊 %s - %s" % [total_display, grade_name],
		"Rescued: %d | Marked: %d" % [scores["rescued"], scores["marked"]],
		{"largeImageKey": "scoreboard"}
	)

	# Build the payload for the UI.
	var payload: Dictionary = {
		"rescued": scores["rescuedDisplay"],
		"marked": scores["markedDisplay"],
		"size": scores["sizeDisplay"],
		"deaths": scores["deaths"],
		"failed": scores["failed"],
		"hurt": scores["hurtDisplay"],
		"total": scores["totalDisplay"],
		"grade_file": get_grade_file(scores["total"], scores["maxTotal"]),
		"is_victory": is_victory,
		"buttons": _build_button_config(is_victory),
		"final_scores": scores
	}
	scoreboard_shown.emit(payload)

	# Save total points.
	var total_points_earned: int = scores["total"]
	var is_hardcore: bool = game_manager.is_hardcore_enabled() and game_manager.config.get("mode") == "legacy"

	if is_hardcore:
		SaveManager.add_hardcore_points(total_points_earned)
	else:
		SaveManager.add_points(total_points_earned)
	SaveManager.set_last_score(total_points_earned)

	var new_total: int = SaveManager.get_hardcore_total_points() if is_hardcore else SaveManager.get_total_points()
	rank_display_update_requested.emit(new_total, is_hardcore)


func hide() -> void:
	scoreboard_hidden.emit()


# ======================= GRADE CALCULATION =======================

func get_grade_file(total: int, max_total: int) -> String:
	if max_total <= 0:
		return "f.png"
	var percentage: float = (float(total) / float(max_total)) * 100.0
	if percentage >= 100.0: return "s.png"
	if percentage >= 90.0:  return "a.png"
	if percentage >= 80.0:  return "b.png"
	if percentage >= 70.0:  return "c.png"
	if percentage >= 60.0:  return "d.png"
	if percentage >= 50.0:  return "e.png"
	return "f.png"


# ======================= SCORE CALCULATION =======================

func calculate_scores() -> Dictionary:
	var player = game_manager.get_player()
	var board: Array = game_manager.get_board()
	var char_ctrl = game_manager.char_ctrl
	var total_pals: int = char_ctrl.get_total_pals()
	var size: int = board.size()
	var is_hardcore: bool = game_manager.is_hardcore_enabled() and game_manager.config.get("mode") == "legacy"

	var rescue_value: int = get_rescue_value(size)
	var flag_value: int = get_flag_value(size)
	var max_flags: int = get_max_flags_by_hazards(board)

	# ===== RESCUED SCORE =====
	var rescued_count: int = player.get_total_rescued()
	var rescued_points: int = rescued_count * rescue_value
	var max_rescued_points: int = total_pals * rescue_value

	# ===== MARKED HAZARDS SCORE =====
	var marked_count: int = 0
	for i in range(board.size()):
		for j in range(board.size()):
			var tile = board[i][j]
			if tile.is_marked() or (tile.is_jumpflagged() and tile.is_marked()):
				marked_count += 1
	var marked_points: int = marked_count * flag_value
	var max_marked_points: int = max_flags * flag_value

	# ===== DIFFICULTY BONUS =====
	var difficulty_multiplier: float = calculate_difficulty_multiplier()
	if is_hardcore:
		difficulty_multiplier += 0.5

	# ===== PENALTIES =====
	var dead_pals: int = player.get_dead_pals() if player.has_method("get_dead_pals") else 0
	var dead_penalty: int = -(dead_pals * rescue_value)

	var failed_flags: int = player.get_failed_flags() if player.has_method("get_failed_flags") else 0
	var failed_jump_flags: int = player.get_failed_jump_flags() if player.has_method("get_failed_jump_flags") else 0
	var failed_penalty: int = (failed_flags * flag_value) + (failed_jump_flags * flag_value)

	var hurt_count: int = player.get_damage_taken() if player.has_method("get_damage_taken") else 0
	var hurt_penalty: int = -(hurt_count * 100)

	# ===== SUBTOTAL =====
	var sub_total: int = rescued_points + marked_points + dead_penalty - failed_penalty + hurt_penalty

	if not is_hardcore and sub_total < 0:
		sub_total = 0

	# ===== APPLY MODE MULTIPLIER =====
	var mode_multiplier: float = get_mode_multiplier()
	var total_points: int = floori(float(sub_total) * difficulty_multiplier * mode_multiplier)

	var max_sub_total: int = max_rescued_points + max_marked_points
	var max_total: int = floori(float(max_sub_total) * difficulty_multiplier * mode_multiplier)

	# ===== S RANK CHECK =====
	var is_s_rank: bool = total_points >= int(float(max_total) * 0.9)

	# ===== CURSE MULTIPLIERS =====
	var has_oblivion: bool = player.has_keychain("oblivion")
	var has_link: bool = player.has_keychain("link")
	var has_judgment: bool = player.has_keychain("judgment")
	var has_delirium: bool = player.has_keychain("delirium")

	var curse_bonus: float = 0.0

	if has_oblivion: curse_bonus += 0.1
	if has_link: curse_bonus += 0.2
	if has_judgment: curse_bonus += 0.3
	if has_delirium: curse_bonus += 0.4

	if is_s_rank:
		if has_oblivion: curse_bonus += 0.4
		if has_link: curse_bonus += 0.5
		if has_judgment: curse_bonus += 0.5
		if has_delirium: curse_bonus += 0.6

	var final_multiplier: float = difficulty_multiplier + curse_bonus
	var final_total: int = floori(float(sub_total) * final_multiplier * mode_multiplier)
	var final_max_total: int = floori(float(max_sub_total) * final_multiplier * mode_multiplier)

	return {
		"rescued": rescued_points,
		"maxRescued": max_rescued_points,
		"rescuedDisplay": "%d/%d" % [rescued_points, max_rescued_points],
		"marked": marked_points,
		"maxMarked": max_marked_points,
		"markedDisplay": "%d/%d" % [marked_points, max_marked_points],
		"size": final_multiplier,
		"sizeDisplay": "x%.2f" % (final_multiplier + (mode_multiplier - 1.0)),
		"deaths": "- %d" % floori(abs(float(dead_penalty))),
		"failed": "- %d" % floori(float(failed_penalty)),
		"hurt": hurt_penalty,
		"hurtDisplay": "- %d" % hurt_penalty,
		"total": final_total,
		"maxTotal": final_max_total,
		"totalDisplay": "%d/%d" % [final_total, final_max_total]
	}


func calculate_difficulty_multiplier() -> float:
	var config: Dictionary = game_manager.config
	var current_level: int = game_manager.current_level

	var hazards: int
	var obstacles: int

	if config.get("mode") == "legacy":
		var is_hardcore: bool = game_manager.is_hardcore_enabled()
		if is_hardcore:
			hazards = config.get("hazards", 0)
			obstacles = config.get("obstacles", 0)
		else:
			hazards = current_level
			obstacles = current_level
	else:
		hazards = config.get("hazards", 0)
		obstacles = config.get("obstacles", 0)

	var multiplier: float = 1.0

	if hazards >= 30: multiplier += 0.05
	elif hazards >= 20: multiplier += 0.04
	elif hazards >= 12: multiplier += 0.04
	elif hazards >= 8: multiplier += 0.02
	elif hazards >= 5: multiplier += 0.01

	if obstacles >= 30: multiplier += 0.06
	elif obstacles >= 15: multiplier += 0.04
	elif obstacles >= 10: multiplier += 0.2
	elif obstacles >= 5: multiplier += 0.01
	elif obstacles >= 3: multiplier += 0.0

	return multiplier


# ======================= BUTTON CONFIG =======================

func _build_button_config(is_victory: bool) -> Dictionary:
	var mode: String = game_manager.config.get("mode")
	var config: Dictionary = {
		"continue": false,
		"retry": false,
		"home": true,
		"random": false
	}

	if mode == "legacy" and is_victory:
		var current_level: int = game_manager.current_level + 1
		var is_biome_transition: bool = current_level % 10 == 0
		if is_biome_transition:
			config["continue"] = false
			config["home"] = true
		else:
			config["continue"] = true
	elif mode == "custom":
		config["retry"] = true
		config["random"] = true
	elif mode == "tutorial":
		config["continue"] = false
		config["retry"] = false
		config["home"] = false
		config["random"] = false

	return config


# ======================= RESPONSIVE SCALING =======================

func get_responsive_scale() -> float:
	var viewport_size: Vector2 = get_viewport().get_visible_rect().size
	var target_width: float = 850.0
	var target_height: float = 620.0
	var scale_x: float = (viewport_size.x * 0.95) / target_width
	var scale_y: float = (viewport_size.y * 0.95) / target_height
	var final_scale: float = minf(scale_x, scale_y)
	return minf(final_scale, 1.2)
