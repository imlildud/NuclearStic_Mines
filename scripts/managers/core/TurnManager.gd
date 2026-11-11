# ==============================================================
# ====================== TURN MANAGER ==========================
# ==============================================================
# Handles turn counting and notifies listeners when a turn occurs.
# Used for Spikes, Foes (1.2.0), and any turn-based mechanics.

extends RefCounted

# ======================= STATE =======================

var turn_counter: int = 0
var listeners: Array = []         # Array[Callable]
var is_paused: bool = false


# ======================= TURN COUNTING =======================

# Increment the turn counter and notify listeners.
# Returns the new turn count.
func increment_turn() -> int:
	if is_paused:
		return turn_counter

	turn_counter += 1
	notify_listeners()
	return turn_counter


# Get the current turn count.
func get_turn() -> int:
	return turn_counter


# Reset the turn counter (for new game / level).
func reset() -> void:
	turn_counter = 0


# Pause turn counting (during dialogs, pause menu, etc.).
func pause() -> void:
	is_paused = true


# Resume turn counting.
func resume() -> void:
	is_paused = false


# ======================= LISTENERS =======================

# Register a listener to be notified on each turn.
# `callback` must accept one int argument (the turn counter).
func add_listener(callback: Callable) -> void:
	listeners.append(callback)


# Remove a listener.
func remove_listener(callback: Callable) -> void:
	var index: int = listeners.find(callback)
	if index > -1:
		listeners.remove_at(index)


# Notify all listeners with the current turn counter.
func notify_listeners() -> void:
	for callback in listeners:
		callback.call(turn_counter)
