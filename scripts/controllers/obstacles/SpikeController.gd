# ==============================================================
# ===================== SPIKE CONTROLLER =======================
# ==============================================================
# Manages spike tiles: states (OFF, PREPARED, ON), turn-based cycling,
# and damage application when stepped on.
#
# CYCLE (5 turns):
#   turn % 5 == 0 → OFF
#   turn % 5 == 1 → PREPARED
#   turn % 5 == 2 → PREPARED
#   turn % 5 == 3 → ON
#   turn % 5 == 4 → ON
#
# The controller registers a listener on TurnManager so every
# increment_turn() updates the spike states automatically.

extends RefCounted
class_name SpikeController

# ======================= STATE =======================

var game_manager = null
var spike_tiles: Array = []          # Array of {"x", "y", "state", "tile"}
var turn_listener: Callable = Callable()


func _init(gm = null) -> void:
	game_manager = gm


# ======================= REGISTRATION =======================

# Scans the board and registers every tile with obstacletype "spikes".
# All spikes start in the OFF state.
# Returns the number of spikes registered.
func register_spikes(board: Array) -> int:
	spike_tiles = []

	for x in range(board.size()):
		for y in range(board.size()):
			var tile = board[x][y]
			if tile.get_obstacletype() == "spikes":
				spike_tiles.append({
					"x": x,
					"y": y,
					"state": "off",
					"tile": tile
				})
				# Start all spikes in OFF state
				tile.set_spike_state("off")

	# Register turn listener if spikes exist
	if not spike_tiles.is_empty() and game_manager.turn_manager != null:
		turn_listener = func(turn: int) -> void:
			update_spikes(turn)
		game_manager.turn_manager.add_listener(turn_listener)

	return spike_tiles.size()


# ======================= TURN UPDATE =======================

# Updates all spike states based on the current turn counter.
func update_spikes(turn: int) -> void:
	var cycle: int = turn % 5

	# Cycle: 0 → OFF, 1 → PREPARED, 2 → PREPARED, 3 → ON, 4 → ON
	var state: String
	if cycle == 0:
		state = "off"
	elif cycle == 1 or cycle == 2:
		state = "prepared"
	elif cycle == 3 or cycle == 4:
		state = "on"
	else:
		state = "off"

	for spike in spike_tiles:
		spike["state"] = state
		spike["tile"].set_spike_state(state)


# ======================= QUERIES =======================

# Returns true if the tile at (x, y) has an active spike (ON state).
func is_active_at(x: int, y: int) -> bool:
	for spike in spike_tiles:
		if spike["x"] == x and spike["y"] == y:
			return spike["state"] == "on"
	return false


# Returns true if the tile at (x, y) has a spike (any state).
func has_spike_at(x: int, y: int) -> bool:
	for spike in spike_tiles:
		if spike["x"] == x and spike["y"] == y:
			return true
	return false


# Returns the spike state at (x, y), or "" if no spike.
func get_state_at(x: int, y: int) -> String:
	for spike in spike_tiles:
		if spike["x"] == x and spike["y"] == y:
			return spike["state"]
	return ""


# ======================= CLEANUP =======================

# Removes the turn listener and clears the spike list.
func destroy() -> void:
	if turn_listener.is_valid() and game_manager.turn_manager != null:
		game_manager.turn_manager.remove_listener(turn_listener)
	spike_tiles = []
	turn_listener = Callable()
