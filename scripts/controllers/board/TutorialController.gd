# ==============================================================
# =================== TUTORIAL CONTROLLER ======================
# ==============================================================
# Handles tutorial board generation with fixed maps.
# Extends BaseBoardController and overrides generation methods
# to provide pre-designed boards for each tutorial phase.

extends BaseBoardController
class_name TutorialController

var current_phase: int = 0


func _init(player_ref = null) -> void:
	player = player_ref
	is_procedural = false


# ===================== TUTORIAL PHASE BOARDS ======================

func get_movement_board() -> Array:
	var size: int = 5
	var board: Array = create_empty_board(size)

	board[0][4].set_start(true)

	# Goal (child) at top-right corner
	board[4][0].set_flaggoal(true)

	# Natural obstacles (walls) forming a path
	board[1][1].set_obstacletype("safepit")
	board[2][1].set_obstacletype("natural")
	board[3][1].set_obstacletype("natural")
	board[4][1].set_obstacletype("natural")
	board[0][3].set_obstacletype("natural")
	board[1][3].set_obstacletype("natural")
	board[2][3].set_obstacletype("natural")

	return board


func get_hazard_board() -> Array:
	var size: int = 5
	var board: Array = create_empty_board(size)

	board[4][2].set_start(true)
	board[0][2].set_flaggoal(true)
	board[0][2].set_secure(true)

	board[2][2].set_hazardtype("cactus")
	_set_hazard_count_around(board, 2, 2)

	board[2][0].set_obstacletype("natural")
	board[2][4].set_obstacletype("natural")

	return board


func get_flagged_board() -> Array:
	var size: int = 5
	var board: Array = create_empty_board(size)

	board[2][4].set_start(true)
	board[4][0].set_flaggoal(true)

	board[0][0].set_hazardtype("cactus")
	_set_hazard_count_around(board, 0, 0)
	board[2][0].set_hazardtype("cactus")
	_set_hazard_count_around(board, 2, 0)
	board[1][2].set_hazardtype("cactus")
	_set_hazard_count_around(board, 1, 2)
	board[3][2].set_hazardtype("cactus")
	_set_hazard_count_around(board, 3, 2)

	board[3][4].set_obstacletype("natural")
	board[4][4].set_obstacletype("natural")

	return board


func get_flagged_board_2() -> Array:
	var size: int = 5
	var board: Array = create_empty_board(size)

	board[0][4].set_start(true)
	board[4][0].set_flaggoal(true)

	board[0][0].set_hazardtype("cactus")
	_set_hazard_count_around(board, 0, 0)
	board[1][1].set_hazardtype("cactus")
	_set_hazard_count_around(board, 1, 1)
	board[2][2].set_hazardtype("cactus")
	_set_hazard_count_around(board, 2, 2)
	board[4][4].set_hazardtype("cactus")
	_set_hazard_count_around(board, 4, 4)

	# Row 0: [4][3][2][1][0]
	board[0][0].set_tileheight(4)
	board[0][1].set_tileheight(3)
	board[0][2].set_tileheight(2)
	board[0][3].set_tileheight(1)
	board[0][4].set_tileheight(0)

	# Row 1: [3][4][3][2][1]
	board[1][0].set_tileheight(3)
	board[1][1].set_tileheight(4)
	board[1][2].set_tileheight(3)
	board[1][3].set_tileheight(2)
	board[1][4].set_tileheight(1)

	# Row 2: [2][3][4][3][2]
	board[2][0].set_tileheight(2)
	board[2][1].set_tileheight(3)
	board[2][2].set_tileheight(4)
	board[2][3].set_tileheight(3)
	board[2][4].set_tileheight(2)

	# Row 3: [1][2][3][4][3]
	board[3][0].set_tileheight(1)
	board[3][1].set_tileheight(2)
	board[3][2].set_tileheight(3)
	board[3][3].set_tileheight(4)
	board[3][4].set_tileheight(3)

	# Row 4: [0][1][2][3][4]
	board[4][0].set_tileheight(0)
	board[4][1].set_tileheight(1)
	board[4][2].set_tileheight(2)
	board[4][3].set_tileheight(3)
	board[4][4].set_tileheight(4)

	return board


func get_rescue_board() -> Array:
	var size: int = 5
	var board: Array = create_empty_board(size)

	board[4][2].set_start(true)
	board[0][3].set_pal_type("dummie")
	board[0][3].set_pal_alive(true)
	board[0][3].set_secure(true)

	board[0][1].set_hazardtype("cactus")
	_set_hazard_count_around(board, 0, 1)
	board[2][2].set_hazardtype("cactus")
	_set_hazard_count_around(board, 2, 2)
	board[3][4].set_hazardtype("cactus")
	_set_hazard_count_around(board, 3, 4)
	board[4][4].set_hazardtype("cactus")
	_set_hazard_count_around(board, 4, 4)

	return board


# ===================== NEW TUTORIAL BOARDS ======================

# Phase 3 (first flag): transposed version of the numbers board, so the
# player does not just replay the same crossing. Start bottom-center,
# goal top-center, one cactus in the middle of a 3-wide crossing.
func get_flag_board() -> Array:
	var board: Array = create_empty_board(5)

	board[2][4].set_start(true)
	board[2][0].set_flaggoal(true)
	board[2][0].set_secure(true)

	board[2][2].set_hazardtype("cactus")
	_set_hazard_count_around(board, 2, 2)

	board[0][2].set_obstacletype("natural")
	board[4][2].set_obstacletype("natural")

	return board


# Phase 5 (terrain): heights only, no hazards. Indexed [y][x].
#  - Start is (0,4) at height 0; the tile to its right is height 2,
#    so the straight walk is blocked (climb limit is 1).
#  - A zero-damage route exists (stairs up, plateau, stairs down).
#  - The ledge at (2,0) drops 2 levels to (3,0): the "reckless" way.
const TERRAIN_HEIGHTS := [
	[3, 3, 3, 1, 0],
	[2, 3, 3, 2, 1],
	[1, 2, 3, 2, 1],
	[0, 1, 2, 1, 0],
	[0, 2, 2, 1, 0],
]

func get_terrain_board() -> Array:
	var board: Array = create_empty_board(5)

	for y in range(5):
		for x in range(5):
			board[x][y].set_tileheight(TERRAIN_HEIGHTS[y][x])

	board[0][4].set_start(true)
	board[4][0].set_flaggoal(true)

	return board


# Phase 8 (force + moving hazards): two dummies, hazard layout A.
# After the first pickup the manager calls shuffle_tutorial_hazards():
# unmarked hazards move from layout A to layout B, marked ones stay.
const RESCUE2_PALS := [[0, 0], [4, 0]]
const RESCUE2_LAYOUT_A := [[2, 2], [0, 2], [4, 3]]
const RESCUE2_LAYOUT_B := [[1, 1], [3, 1], [2, 3]]

func get_rescue_board_2() -> Array:
	var board: Array = create_empty_board(5)

	board[2][4].set_start(true)

	for p in RESCUE2_PALS:
		board[p[0]][p[1]].set_pal_type("dummie")
		board[p[0]][p[1]].set_pal_alive(true)
		board[p[0]][p[1]].set_secure(true)

	_apply_hazard_layout(board, RESCUE2_LAYOUT_A)
	return board


# Moves the hazards the player did NOT mark (A[i] -> B[i]); marked
# hazards stay where they are. Every hazard count is recomputed.
# Tile visibility is NOT touched (the player keeps what they saw).
# Any mix of A and B positions keeps both dummies reachable.
func shuffle_tutorial_hazards(board: Array) -> void:
	var final_hazards: Array = []
	for i in range(RESCUE2_LAYOUT_A.size()):
		var a: Array = RESCUE2_LAYOUT_A[i]
		if board[a[0]][a[1]].is_marked():
			final_hazards.append(a)
		else:
			final_hazards.append(RESCUE2_LAYOUT_B[i])
	_apply_hazard_layout(board, final_hazards)


func _apply_hazard_layout(board: Array, layout: Array) -> void:
	for x in range(board.size()):
		for y in range(board.size()):
			board[x][y].set_hazardtype("none")
			board[x][y].set_hazardcount(0)
	for p in layout:
		board[p[0]][p[1]].set_hazardtype("cactus")
		_set_hazard_count_around(board, p[0], p[1])


# ======================= PRIVATE HELPERS =======================

func _set_hazard_count_around(board: Array, x: int, y: int) -> void:
	var directions := [
		[-1, 0], [1, 0], [0, -1], [0, 1],
		[-1, 1], [-1, -1], [1, 1], [1, -1]
	]

	for d in directions:
		var nx: int = x + d[0]
		var ny: int = y + d[1]
		if nx >= 0 and nx < board.size() and ny >= 0 and ny < board.size():
			board[nx][ny].increment_hazardcount()


# ======================= VISION CONTROL =======================

func reveal_all_tiles(board: Array) -> void:
	for i in range(board.size()):
		for j in range(board.size()):
			board[i][j].set_hide(false)


func hide_all_tiles(board: Array) -> void:
	for i in range(board.size()):
		for j in range(board.size()):
			var tile = board[i][j]
			if not tile.is_start() and tile.get_pal_type() == "none" and not tile.is_flaggoal():
				tile.set_hide(true)


func update_vision(board: Array, character) -> void:
	# For phases that need normal vision (2, 3, 4), don't reveal all
	if current_phase >= 2:
		super.update_vision(board, character)
	else:
		reveal_all_tiles(board)


func update_vision_around_player(board: Array, character) -> void:
	if current_phase >= 2:
		super.update_vision_around_player(board, character)
	else:
		reveal_all_tiles(board)


# ======================= OVERRIDDEN METHODS =======================

func generate_board(_size: int = 0) -> Array:
	# Phase map (see TutorialManager.PHASES):
	#   1 movement | 2 numbers | 3 first flag | 4 several flags
	#   5 terrain  | 6 heights + hazards | 7 rescue | 8 force + shuffle
	match current_phase:
		1: return get_movement_board()
		2: return get_hazard_board()      # numbers (no flags)
		3: return get_flag_board()
		4: return get_flagged_board()
		5: return get_terrain_board()
		6: return get_flagged_board_2()
		7: return get_rescue_board()
		8: return get_rescue_board_2()
		_: return get_movement_board()


func generate_start_and_goal(board: Array, _num_goals: int = 1, _level: int = 5) -> Array:
	return board

func set_safe_tiles(board: Array, _size: int = 5) -> Array:
	return board

func generate_heights(board: Array, _level: int = 5, _size: int = 5) -> Array:
	return board

func generate_obstacles(board: Array, _level: int = 5, _size: int = 5) -> Array:
	return board

func generate_hazards(board: Array, _total_hazards: int = 0, _level: int = 5, _size: int = 5) -> Array:
	return board

func track_hazard_count(board: Array, _size: int = 5) -> Array:
	return board

func regenerate_hazards(board: Array, _total_hazards: int = 0, _level: int = 5, _size: int = 5) -> Array:
	return board

func reset_hazard_count(board: Array) -> Array:
	return board


# ======================= HELPER METHODS =======================

func load_difficulty() -> int:
	return 5

func load_number_of_hazard() -> int:
	return 0

func load_number_of_goals() -> int:
	return 1

func load_type_of_zone() -> String:
	return "backyard"
