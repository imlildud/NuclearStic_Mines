# ==============================================================
# ==================== PUNCHCARD TEXTURES ======================
# ==============================================================
# Pure helper: maps numeric/string values to texture paths.
# No state, no side effects. All methods are static.

class_name PunchcardTextures
extends RefCounted


# ======================= CHARACTER =======================

static func get_char_texture(value: String) -> String:
	match value:
		"chef":     return "res://assets/hud/punchcard/character/chefpin.png"
		"mosquito": return "res://assets/hud/punchcard/character/mosquitopin.png"
		"mommy":    return "res://assets/hud/punchcard/character/mommypin.png"
		"scout":    return "res://assets/hud/punchcard/character/scoutpin.png"
		_:          return "res://assets/hud/punchcard/character/chefpin.png"


# ======================= SIZE =======================

static func get_legacy_size_texture(level: int) -> String:
	if level <= 4:  return "res://assets/hud/punchcard/size/small.png"
	if level <= 9:  return "res://assets/hud/punchcard/size/medium.png"
	if level <= 14: return "res://assets/hud/punchcard/size/large.png"
	if level <= 19: return "res://assets/hud/punchcard/size/xtralarge.png"
	return "res://assets/hud/punchcard/size/ultralarge.png"


static func get_size_texture(value: int) -> String:
	if value <= 8:  return "res://assets/hud/punchcard/size/small.png"
	if value <= 12: return "res://assets/hud/punchcard/size/medium.png"
	if value <= 16: return "res://assets/hud/punchcard/size/large.png"
	if value <= 20: return "res://assets/hud/punchcard/size/xtralarge.png"
	if value <= 24: return "res://assets/hud/punchcard/size/ultralarge.png"
	return "res://assets/hud/punchcard/size/ultralarge.png"


# ======================= HAZARDS =======================

static func get_hazard_texture(value: int) -> String:
	if value <= 2:  return "res://assets/hud/punchcard/hazard/low.png"
	if value <= 7:  return "res://assets/hud/punchcard/hazard/medium.png"
	if value <= 11: return "res://assets/hud/punchcard/hazard/high.png"
	if value <= 17: return "res://assets/hud/punchcard/hazard/xtrahigh.png"
	if value <= 20: return "res://assets/hud/punchcard/hazard/ultrahigh.png"
	return "res://assets/hud/punchcard/hazard/nsanlyhigh.png"


# ======================= OBSTACLES =======================

static func get_obstacle_texture(value: int) -> String:
	if value <= 2:  return "res://assets/hud/punchcard/obstacles/low.png"
	if value <= 4:  return "res://assets/hud/punchcard/obstacles/medium.png"
	if value <= 9:  return "res://assets/hud/punchcard/obstacles/high.png"
	if value <= 14: return "res://assets/hud/punchcard/obstacles/xtrahigh.png"
	if value <= 19: return "res://assets/hud/punchcard/obstacles/ultrahigh.png"
	return "res://assets/hud/punchcard/obstacles/nsanlyhigh.png"


# ======================= PALS =======================

static func get_pals_texture(value: int) -> String:
	if value == 1: return "res://assets/hud/punchcard/pals/1.png"
	if value == 2: return "res://assets/hud/punchcard/pals/2.png"
	if value == 3: return "res://assets/hud/punchcard/pals/3.png"
	if value == 4: return "res://assets/hud/punchcard/pals/4.png"
	return "res://assets/hud/punchcard/pals/5.png"


# ======================= ZONE =======================

static func get_zone_texture(value: String) -> String:
	match value:
		"backyard":  return "res://assets/hud/punchcard/zone/backyard.png"
		"desert":    return "res://assets/hud/punchcard/zone/desert.png"
		"snow":      return "res://assets/hud/punchcard/zone/snow.png"
		"scrapland": return "res://assets/hud/punchcard/zone/scrapland.png"
		"roots":     return "res://assets/hud/punchcard/zone/roots.png"
		"glowyland": return "res://assets/hud/punchcard/zone/glowyland.png"
		"ash":       return "res://assets/hud/punchcard/zone/ash.png"
		_:           return "res://assets/hud/punchcard/zone/desert.png"


# ======================= LEGACY BADGE =======================

static func get_legacy_badge(level: int) -> String:
	if level <= 5:  return "res://assets/hud/badges/paper.png"
	if level <= 10: return "res://assets/hud/badges/cardboard.png"
	if level <= 20: return "res://assets/hud/badges/telegram.png"
	if level <= 30: return "res://assets/hud/badges/bronze.png"
	if level <= 40: return "res://assets/hud/badges/silver.png"
	if level <= 50: return "res://assets/hud/badges/gold.png"
	return "res://assets/hud/badges/platinum.png"


# ======================= DAILY FIRE =======================

static func get_daily_fire_image(streak: int) -> String:
	if streak <= 0:   return "res://assets/hud/badges/fire0.png"
	if streak <= 6:   return "res://assets/hud/badges/fire1.png"
	if streak <= 13:  return "res://assets/hud/badges/fire2.png"
	if streak <= 29:  return "res://assets/hud/badges/fire3.png"
	if streak <= 179: return "res://assets/hud/badges/fire4.png"
	return "res://assets/hud/badges/fire5.png"
