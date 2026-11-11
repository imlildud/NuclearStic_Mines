# ==============================================================
# ==================== LINK MANAGER =============================
# ==============================================================
# Handles the Link curse (voodoo pal).
#
# The Link keychain binds the player to a random pal on the board.
# Every time the player takes damage, the linked pal dies and a new
# one is selected. Dead pals reduce `remaining_pals`, making the
# level harder to complete.

extends RefCounted
class_name LinkManager

var game_manager = null
var linked_pal = null  # {"x": int, "y": int, "type": String} or null


func _init(gm = null) -> void:
	game_manager = gm


# ===== SET LINKED PAL =====
# Selects a random alive pal on the board to link to.
# Skips Joni (special hidden pal) and empty tiles.
func set_linked_pal(board: Array) -> void:
	var player = game_manager.get_player()
	if player == null or not player.has_keychain("link"):
		linked_pal = null
		return

	# Find all alive pals (exclude joni)
	var pals: Array = []
	for i in range(board.size()):
		for j in range(board.size()):
			var pal_type: String = board[i][j].get_pal_type()
			var pal_alive: bool = board[i][j].is_pal_alive()
			if pal_type != "none" and pal_type != "joni" and pal_alive:
				pals.append({"x": i, "y": j, "type": pal_type})

	if pals.is_empty():
		linked_pal = null
		return

	var random_entry = pals[randi_range(0, pals.size() - 1)]
	linked_pal = random_entry
	print("[Link] Linked to pal at %d, %d type: %s" % [random_entry["x"], random_entry["y"], random_entry["type"]])


# Returns the currently linked pal, or null.
func get_linked_pal():
	return linked_pal


# ===== ON PLAYER DAMAGE =====
# Kills the linked pal when the player takes damage, then selects
# a new one. Called from CharacterController.hurt_character().
func on_player_damage() -> void:
	var player = game_manager.get_player()
	if player == null or not player.has_keychain("link"):
		return
	if linked_pal == null:
		return

	var board: Array = game_manager.get_board()
	if board.is_empty():
		return

	var tile = board[linked_pal["x"]][linked_pal["y"]]
	if tile == null or tile.get_pal_type() == "none" or not tile.is_pal_alive():
		linked_pal = null
		return

	# Kill the pal
	tile.set_pal_alive(false)

	if player != null:
		player.increment_dead_pals()

	# Update remaining pals
	var char_ctrl = game_manager.char_ctrl
	if char_ctrl != null:
		char_ctrl.remaining_pals -= 1
		print("[Link] Remaining pals: %d" % char_ctrl.remaining_pals)

	print("[Link] Pal died at %d, %d" % [linked_pal["x"], linked_pal["y"]])

	# Select new linked pal
	set_linked_pal(board)
