# ==============================================================
# ======================== RANK MANAGER ========================
# ==============================================================
# Handles rank calculations and display updates for the ID card.
# Manages total points and rank progression.
#
# NOTE: This is a pure-logic helper. All methods are static.
# The animation is handled by the UI scene (WelcomeIDCardPanel.gd).

class_name RankManager
extends RefCounted

# ======================= NORMAL RANKS (Letters F to S+) =======================

const NORMAL_RANKS: Array = [
	{"rank": "F-", "min": 0, "max": 200000},
	{"rank": "F", "min": 200001, "max": 500000},
	{"rank": "F+", "min": 500001, "max": 900000},
	{"rank": "E-", "min": 900001, "max": 1400000},
	{"rank": "E", "min": 1400001, "max": 2000000},
	{"rank": "E+", "min": 2000001, "max": 2700000},
	{"rank": "D-", "min": 2700001, "max": 3500000},
	{"rank": "D", "min": 3500001, "max": 4600000},
	{"rank": "D+", "min": 4600001, "max": 6000000},
	{"rank": "C-", "min": 6000001, "max": 7700000},
	{"rank": "C", "min": 7700001, "max": 9700000},
	{"rank": "C+", "min": 9700001, "max": 12000000},
	{"rank": "B-", "min": 12000001, "max": 14600000},
	{"rank": "B", "min": 14600001, "max": 17500000},
	{"rank": "B+", "min": 17500001, "max": 20700000},
	{"rank": "A-", "min": 20700001, "max": 24200000},
	{"rank": "A", "min": 24200001, "max": 28000000},
	{"rank": "A+", "min": 28000001, "max": 32100000},
	{"rank": "S-", "min": 32100001, "max": 36500000},
	{"rank": "S", "min": 36500001, "max": 50000000},
	{"rank": "S+", "min": 50000001, "max": 2147483647}
]

# ======================= HARDCORE RANKS (Greek letters) =======================

const HARDCORE_RANKS: Array = [
	{"rank": "ζ", "min": 0, "max": 500000},
	{"rank": "ε", "min": 500001, "max": 1000000},
	{"rank": "δ", "min": 1000001, "max": 2000000},
	{"rank": "γ", "min": 2000001, "max": 3500000},
	{"rank": "β", "min": 3500001, "max": 5000000},
	{"rank": "Ω", "min": 5000001, "max": 2147483647}
]


# ======================= PUBLIC METHODS =======================

# Get rank data based on points and mode.
# Returns a Dictionary with: rank, min, max, progress, percent.
static func get_rank_data(points: int, is_hardcore: bool = false) -> Dictionary:
	var ranks: Array = HARDCORE_RANKS if is_hardcore else NORMAL_RANKS

	for r in ranks:
		if points >= r["min"] and points <= r["max"]:
			var rank_range: int = r["max"] - r["min"]
			var percent: float = 0.0
			if rank_range > 0:
				percent = (float(points - r["min"]) / float(rank_range)) * 100.0
			else:
				percent = 100.0

			return {
				"rank": r["rank"],
				"min": r["min"],
				"max": r["max"],
				"progress": points,
				"percent": percent
			}

	# Fallback (shouldn't happen)
	if is_hardcore:
		return {"rank": "ζ", "min": 0, "max": 500000, "progress": points, "percent": 0.0}
	return {"rank": "F-", "min": 0, "max": 200000, "progress": points, "percent": 0.0}


# Get total points from SaveManager (depends on mode).
static func get_total_points(is_hardcore: bool = false) -> int:
	if is_hardcore:
		return SaveManager.get_hardcore_total_points()
	return SaveManager.get_total_points()


# Add points to total (depends on mode).
static func add_points(points: int, is_hardcore: bool = false) -> int:
	if is_hardcore:
		return SaveManager.add_hardcore_points(points)
	return SaveManager.add_points(points)


# Get old total points (for animation).
static func get_old_total_points(is_hardcore: bool = false) -> int:
	if is_hardcore:
		return SaveManager.get_old_hardcore_total_points()
	return SaveManager.get_old_total_points()


# Sync old total points.
static func sync_old_total_points(is_hardcore: bool = false) -> void:
	if is_hardcore:
		SaveManager.sync_old_hardcore_total_points()
	else:
		SaveManager.sync_old_total_points()


# ======================= ANIMATION =======================

# Animates the rank display from `old_points` to `new_points` over 1.5s.
# If the rank changes during the animation, the rank badge is updated
# immediately with a pop + grade SFX.
static func animate_total_points(
	old_points: int,
	new_points: int,
	is_hardcore: bool,
	rank_badge: TextureRect,
	rank_bar_fill: ColorRect,
	rank_bar_bg: ColorRect,
	rank_text: Label,
	on_complete: Callable = Callable()
) -> void:

	# Nothing to animate.
	if old_points == new_points:
		if on_complete.is_valid():
			on_complete.call()
		return

	# Validate references.
	if rank_badge == null or rank_bar_fill == null or rank_bar_bg == null or rank_text == null:
		if on_complete.is_valid():
			on_complete.call()
		return

	# Detect rank change.
	var old_rank: String = get_rank_data(old_points, is_hardcore)["rank"]
	var new_rank: String = get_rank_data(new_points, is_hardcore)["rank"]
	var rank_changed: bool = old_rank != new_rank

	# If the rank changed, update the badge immediately and play the pop.
	if rank_changed:
		var badge_path: String = "res://assets/hud/badges/rank_%s.png" % new_rank.to_lower()
		if ResourceLoader.exists(badge_path):
			rank_badge.texture = load(badge_path)

		# Pop animation.
		rank_badge.pivot_offset = rank_badge.size / 2.0
		rank_badge.scale = Vector2(2.5, 2.5)
		rank_badge.modulate = Color(1, 1, 1, 0.5)

		var pop_tween: Tween = rank_badge.create_tween()
		pop_tween.set_parallel(true)
		pop_tween.tween_property(rank_badge, "scale", Vector2.ONE, 0.2)
		pop_tween.tween_property(rank_badge, "modulate", Color(1, 1, 1, 1), 0.2)

		AudioManager.play_grade_sfx()

	# Play the score loop SFX while the numbers count.
	AudioManager.start_score_animation_sfx()

	var duration: float = 1.5
	var max_width: float = rank_bar_bg.size.x

	# Reset the alpha to 0.0 so the Tween can drive it to 1.0.
	rank_text.modulate = Color(1, 1, 1, 0.0)

	# Tween the alpha from 0.0 to 1.0.
	var tween: Tween = rank_text.create_tween()
	tween.tween_property(rank_text, "modulate:a", 1.0, duration)

	# Timer that reads the alpha (which acts as "progress") and updates the UI.
	var update_timer: Timer = Timer.new()
	update_timer.wait_time = 0.016  # ~60 FPS
	update_timer.one_shot = false
	update_timer.autostart = true
	rank_text.add_child(update_timer)

	var on_tick: Callable = func() -> void:
		if not is_instance_valid(rank_text):
			return
		# The alpha goes from 0.0 to 1.0, so it acts as the progress.
		var progress: float = rank_text.modulate.a
		var current: int = int(floor(lerpf(float(old_points), float(new_points), progress)))
		var rank_current: Dictionary = get_rank_data(current, is_hardcore)
		var current_max: int = rank_current["max"]
		rank_text.text = "%d / %d" % [current, current_max]
		var percent: float = 0.0
		var rank_range: int = current_max - rank_current["min"]
		if rank_range > 0:
			percent = float(current - rank_current["min"]) / float(rank_range) * 100.0
		else:
			percent = 100.0
		rank_bar_fill.size.x = max_width * (percent / 100.0)

	update_timer.timeout.connect(on_tick)

	var on_finish: Callable = func() -> void:
		update_timer.queue_free()
		AudioManager.stop_score_animation_sfx()

		# Set the final state exactly.
		var final_rank: Dictionary = get_rank_data(new_points, is_hardcore)
		rank_text.text = "%d / %d" % [new_points, final_rank["max"]]
		var percent: float = 0.0
		var rank_range: int = final_rank["max"] - final_rank["min"]
		if rank_range > 0:
			percent = float(new_points - final_rank["min"]) / float(rank_range) * 100.0
		else:
			percent = 100.0
		rank_bar_fill.size.x = max_width * (percent / 100.0)

		# Reset the alpha to 1.0 (full visibility).
		rank_text.modulate = Color(1, 1, 1, 1.0)

		if on_complete.is_valid():
			on_complete.call()

	tween.finished.connect(on_finish)
