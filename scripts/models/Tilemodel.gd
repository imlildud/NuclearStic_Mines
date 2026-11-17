# ==============================================================
# ======================= TILE MODEL ===========================
# ==============================================================
# Manages the state and properties of a single tile in the game grid.

class_name TileModel
extends RefCounted

# ========== VIEW STATUS ==========
var hide: bool = true                 # Hide the content of the tile (undiscovered)
var unhideable: bool = false          # Never hide the content

# ========== START & GOAL TILES ==========
var start: bool = false               # Define if the tile is the starting position
var flaggoal: bool = false            # Define if the tile is a tutorial goal

# ========== PAL STATUS ==========
var pal_alive: bool = false           # If the pal is alive (can be rescued)
var pal_type: String = "none"         # Type of pal (charlie, joni, etc.)

# ========== MAP CONDITIONS ==========
var secure: bool = false              # Define if the tile is a secure area
var securehidden: bool = false        # Define if the tile is a secure hidden area
var flagged: bool = false             # Define if the tile has a flag marker
var jumpflagged: bool = false         # Define if the tile has a jump flag marker
var marked: bool = false              # Define if the tile is marked as a hazard
var treasure: bool = false            # Define if the tile has a treasure

# ========== MEMORY MARKERS ==========
# 'a' | 'b' | 'c' | "" (empty string = none, since GDScript has no null String)
var memory_marker: String = ""

# ========== TILE HEIGHT ==========
var height: int = 0                   # 0 = default height (terrain elevation)

# ========== OBSTACLE ==========
var obstacletype: String = "none"     # Define the type of obstacle on the tile
var spike_state: String = "off"       # Define states of spike obstacle

# ========== HAZARD PROPERTIES ==========
var hazardcount: int = 0              # Number of hazards adjacent to the tile
var smoke: bool = false               # Flag for smoke presence
var smoke_cleared: bool = false       # Smoke cleared tracker
var damageratio: bool = false         # Flag for damage radius presence
var detectionratio: bool = false      # Flag for detection radius presence
var hazardtype: String = "none"       # Type of hazard on the tile
var hazardlive: bool = false          # Flag indicating if hazard is active


# ======================= HIDE =======================

func is_hide() -> bool:
	return hide

func set_hide(v: bool) -> void:
	hide = v

func is_unhideable() -> bool:
	return unhideable

func set_unhideable(v: bool) -> void:
	unhideable = v


# ======================= START =======================

func is_start() -> bool:
	return start

func set_start(v: bool) -> void:
	start = v


# ======================= PAL =======================

func get_pal_type() -> String:
	return pal_type

func set_pal_type(v: String) -> void:
	pal_type = v

func is_pal_alive() -> bool:
	return pal_alive

func set_pal_alive(v: bool) -> void:
	pal_alive = v


# ======================= FLAG GOAL =======================

func is_flaggoal() -> bool:
	return flaggoal

func set_flaggoal(v: bool) -> void:
	flaggoal = v


# ======================= SECURE =======================

func is_secure() -> bool:
	return secure

func set_secure(v: bool) -> void:
	secure = v

func is_securehidden() -> bool:
	return securehidden

func set_securehidden(v: bool) -> void:
	securehidden = v


# ======================= FLAGGED =======================

func is_flagged() -> bool:
	return flagged

func set_flagged(v: bool) -> void:
	flagged = v

func is_jumpflagged() -> bool:
	return jumpflagged

func set_jumpflagged(v: bool) -> void:
	jumpflagged = v


# ======================= MEMORY MARKER =======================

func get_memory_marker() -> String:
	return memory_marker

func set_memory_marker(v: String) -> void:
	memory_marker = v

func has_memory_marker() -> bool:
	return memory_marker != ""

func clear_memory_marker() -> void:
	memory_marker = ""


# ======================= MARKED =======================

func is_marked() -> bool:
	return marked

func set_marked(v: bool) -> void:
	marked = v


# ======================= TREASURE =======================

func have_treasure() -> bool:
	return treasure

func set_treasure(v: bool) -> void:
	treasure = v


# ======================= HEIGHT =======================

func get_tileheight() -> int:
	return height

func set_tileheight(v: int) -> void:
	height = v


# ======================= OBSTACLE =======================

func get_obstacletype() -> String:
	return obstacletype

func set_obstacletype(v: String) -> void:
	obstacletype = v

func get_spike_state() -> String:
	return spike_state

func set_spike_state(v: String) -> void:
	spike_state = v


# ======================= HAZARD COUNT =======================

func get_hazardcount() -> int:
	return hazardcount

func increment_hazardcount() -> void:
	hazardcount += 1

func set_hazardcount(v: int) -> void:
	hazardcount = v


# ======================= SMOKE =======================

func is_smoke() -> bool:
	return smoke

func set_smoke(v: bool) -> void:
	smoke = v

func was_smoke_cleared() -> bool:
	return smoke_cleared

func set_smoke_cleared(v: bool) -> void:
	smoke_cleared = v


# ======================= DAMAGE RATIO =======================

func get_damageratio() -> bool:
	return damageratio

func set_damageratio(v: bool) -> void:
	damageratio = v


# ======================= DETECTION RATIO =======================

func get_detectionratio() -> bool:
	return detectionratio

func set_detectionratio(v: bool) -> void:
	detectionratio = v


# ======================= HAZARD TYPE =======================

func get_hazardtype() -> String:
	return hazardtype

func set_hazardtype(v: String) -> void:
	hazardtype = v


# ======================= HAZARD LIVE =======================

func is_hazardlive() -> bool:
	return hazardlive

func set_hazardlive(v: bool) -> void:
	hazardlive = v
