# ==============================================================
# ===================== DIFFICULTY SCALER ======================
# ==============================================================
# Pure calculation functions for difficulty scaling.
# No UI, no generation logic, no side effects.
#
# All methods are static: call them as `DifficultyScaler.get_board_size(level)`.

class_name DifficultyScaler
extends RefCounted


# ======================= BOARD SIZE =======================

# Returns the board size for a given level.
# Formula: 8 + floor(4 * (level / 5))
static func get_board_size(level: int) -> int:
	var start_size: int = 8
	var step: int = 4
	return start_size + floori(float(step) * (float(level) / 5.0))


# ======================= HAZARD AMOUNT =======================

# Returns the hazard count for a given level.
# Formula: 7 + floor(7 * (level / 5))
static func get_hazard_count(level: int) -> int:
	var start_hazards: int = 7
	var step: int = 7
	return start_hazards + floori(float(step) * (float(level) / 5.0))


# Returns the hazard count for a given board size.
# Formula: 7 + floor((size - 8) / 4) * 7
static func get_hazard_count_by_size(size: int) -> int:
	var base_size: int = 8
	var base_hazards: int = 7
	var step: int = 4
	var hazard_step: int = 7
	var increment: int = floori(float(size - base_size) / float(step)) * hazard_step
	return base_hazards + increment


# ======================= GOAL AMOUNT =======================

# Returns the number of pals to rescue for a given level.
# Formula: 1 + floor(1 * (level / 5))
static func get_pal_count(level: int) -> int:
	var start_pals: int = 1
	var step: int = 1
	return start_pals + floori(float(step) * (float(level) / 5.0))


# ======================= ZONE SELECTION =======================

# Returns the biome name for a given level.
# 0-9 → desert, 10-19 → snow, 20+ → ash.
static func get_zone_by_level(level: int) -> String:
	var lvl: int = floori(float(level))
	if lvl <= 9:
		return "desert"
	if lvl <= 19:
		return "snow"
	return "ash"


# ======================= SCORE BONUSES =======================

# Returns the score bonus for a given board size.
static func get_size_bonus(size: int) -> int:
	match size:
		8:  return 10
		12: return 30
		16: return 50
		20: return 80
		24: return 100
		_:  return 10


# Returns the score bonus for a given hazard count.
static func get_hazards_bonus(hazards: int) -> int:
	match hazards:
		1:  return 20
		5:  return 50
		8:  return 100
		12: return 150
		20: return 200
		30: return 300
		_:  return 20


# Returns the score bonus for a given obstacle count.
static func get_obstacles_bonus(obstacles: int) -> int:
	match obstacles:
		1:  return 0
		3:  return 20
		5:  return 40
		10: return 60
		15: return 80
		30: return 100
		_:  return 0
