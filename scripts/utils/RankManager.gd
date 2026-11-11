# ==============================================================
# ======================== RANK MANAGER ========================
# ==============================================================
# Handles rank calculations and display updates for the ID card.
# Manages total points and rank progression.
#
# NOTE: This is a pure-logic helper. All methods are static.
# Animation is handled by the UI scene (WelcomePanel.gd).

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
