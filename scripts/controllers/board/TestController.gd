# ==============================================================
# ===================== TEST CONTROLLER ========================
# ==============================================================
# Handles a test board generation with a fixed map.
# Extends BaseBoardController and overrides generation methods
# to provide pre-designed boards for each tutorial phase.

extends BaseBoardController


func _init(player_ref = null) -> void:
	player = player_ref
	is_procedural = false


# ===================== GENERATE BOARD ======================

func generate_board(_board_size: int = 24) -> Array:
	return get_test_board()


# ===================== TEST BOARD ======================

func get_test_board() -> Array:
	var size: int = 24
	var board: Array = create_empty_board(size)

	board[12][0].set_start(true)
	board[13][0].set_treasure(true)
	board[14][0].set_treasure(true)
	board[15][0].set_treasure(true)
	board[16][0].set_treasure(true)
	board[17][0].set_treasure(true)
	board[18][0].set_treasure(true)
	board[19][0].set_treasure(true)
	board[20][0].set_treasure(true)
	board[21][0].set_treasure(true)
	board[22][0].set_treasure(true)
	board[23][0].set_treasure(true)

	# Test row 1 (Heights)
	board[1][3].set_tileheight(1)
	board[2][3].set_tileheight(2)
	board[3][3].set_tileheight(3)
	board[4][3].set_tileheight(4)

	# Test row 2 (Natural)
	board[0][5].set_obstacletype("natural")
	board[1][5].set_obstacletype("natural")
	board[2][5].set_obstacletype("natural")
	board[3][5].set_obstacletype("natural")
	board[4][5].set_obstacletype("natural")

	board[1][5].set_tileheight(1)
	board[2][5].set_tileheight(2)
	board[3][5].set_tileheight(3)
	board[4][5].set_tileheight(4)

	# Test row 3 (River)
	board[0][7].set_obstacletype("river")
	board[1][7].set_obstacletype("river")
	board[2][7].set_obstacletype("river")
	board[3][7].set_obstacletype("river")
	board[4][7].set_obstacletype("river")

	board[1][7].set_tileheight(1)
	board[2][7].set_tileheight(2)
	board[3][7].set_tileheight(3)
	board[4][7].set_tileheight(4)

	# Test row 4 (Pit)
	board[0][9].set_obstacletype("pit")
	board[1][9].set_obstacletype("pit")
	board[2][9].set_obstacletype("pit")
	board[3][9].set_obstacletype("pit")
	board[4][9].set_obstacletype("pit")

	board[1][9].set_tileheight(1)
	board[2][9].set_tileheight(2)
	board[3][9].set_tileheight(3)
	board[4][9].set_tileheight(4)

	# Test row 5 (Safe Pit)
	board[0][11].set_obstacletype("safepit")
	board[1][11].set_obstacletype("safepit")
	board[2][11].set_obstacletype("safepit")
	board[3][11].set_obstacletype("safepit")
	board[4][11].set_obstacletype("safepit")

	board[1][11].set_tileheight(1)
	board[2][11].set_tileheight(2)
	board[3][11].set_tileheight(3)
	board[4][11].set_tileheight(4)

	# Test row 6 (Spikes)
	board[0][13].set_obstacletype("spikes")
	board[1][13].set_obstacletype("spikes")
	board[2][13].set_obstacletype("spikes")
	board[3][13].set_obstacletype("spikes")
	board[4][13].set_obstacletype("spikes")

	board[1][13].set_tileheight(1)
	board[2][13].set_tileheight(2)
	board[3][13].set_tileheight(3)
	board[4][13].set_tileheight(4)

	# Test row 7 (Flags)
	board[0][15].set_flagged(true)
	board[1][15].set_marked(true)
	board[2][15].set_jumpflagged(true)
	board[3][15].set_flaggoal(true)

	# Test row 8 (Pals)
	board[1][17].set_pal_type("charlie")
	board[1][17].set_pal_alive(true)
	board[3][17].set_pal_type("joni")
	board[3][17].set_pal_alive(true)
	board[2][18].set_pal_type("ru")
	board[2][18].set_pal_alive(true)

	# Test row 9 (Treasure)
	board[1][20].set_treasure(true)
	board[2][20].set_treasure(true)
	board[3][20].set_treasure(true)

	# Test row 8 (Hazards)
	board[6][3].set_hazardtype("mine")
	board[6][5].set_tileheight(1)
	board[6][5].set_hazardtype("mine")
	board[6][7].set_tileheight(2)
	board[6][7].set_hazardtype("mine")
	board[6][9].set_tileheight(3)
	board[6][9].set_hazardtype("mine")
	board[6][11].set_tileheight(4)
	board[6][11].set_hazardtype("mine")

	board[8][3].set_hazardtype("cactus")
	board[8][5].set_tileheight(1)
	board[8][5].set_hazardtype("cactus")
	board[8][7].set_tileheight(2)
	board[8][7].set_hazardtype("cactus")
	board[8][9].set_tileheight(3)
	board[8][9].set_hazardtype("cactus")
	board[8][11].set_tileheight(4)
	board[8][11].set_hazardtype("cactus")

	board[10][3].set_hazardtype("pipe")
	board[10][5].set_tileheight(1)
	board[10][5].set_hazardtype("pipe")
	board[10][7].set_tileheight(2)
	board[10][7].set_hazardtype("pipe")
	board[10][9].set_tileheight(3)
	board[10][9].set_hazardtype("pipe")
	board[10][11].set_tileheight(4)
	board[10][11].set_hazardtype("pipe")

	board[12][3].set_hazardtype("radioactive")
	board[12][5].set_tileheight(1)
	board[12][5].set_hazardtype("radioactive")
	board[12][7].set_tileheight(2)
	board[12][7].set_hazardtype("radioactive")
	board[12][9].set_tileheight(3)
	board[12][9].set_hazardtype("radioactive")
	board[12][11].set_tileheight(4)
	board[12][11].set_hazardtype("radioactive")

	board[14][3].set_hazardtype("nest")
	board[14][5].set_tileheight(1)
	board[14][5].set_hazardtype("nest")
	board[14][7].set_tileheight(2)
	board[14][7].set_hazardtype("nest")
	board[14][9].set_tileheight(3)
	board[14][9].set_hazardtype("nest")
	board[14][11].set_tileheight(4)
	board[14][11].set_hazardtype("nest")

	# Test row 9 (Hazard count)
	board[5][16].set_hazardcount(1)
	board[6][16].set_hazardcount(2)
	board[7][16].set_hazardcount(3)
	board[8][16].set_hazardcount(4)
	board[9][16].set_hazardcount(5)
	board[10][16].set_hazardcount(6)
	board[11][16].set_hazardcount(7)
	board[12][16].set_hazardcount(8)
	board[13][16].set_hazardcount(9)

	# Test row 10 (Radius effects)
	_apply_radius_effect(board, 17, 4, "set_hide", true)
	board[17][4].set_hazardtype("mine")
	_apply_radius_effect(board, 17, 4, "set_hazardcount", 1)
	_apply_radius_effect(board, 17, 8, "set_smoke", true)
	_apply_radius_effect(board, 17, 12, "set_damageratio", true)

	return board


# Helper method to apply radius effect (8 directions + center).
func _apply_radius_effect(board: Array, x: int, y: int, method_name: String, value) -> void:
	var board_size: int = board.size()
	var directions := [
		[-1, 0], [1, 0], [0, -1], [0, 1],
		[-1, 1], [-1, -1], [1, 1], [1, -1]
	]

	board[x][y].call(method_name, value)

	for d in directions:
		var nx: int = x + d[0]
		var ny: int = y + d[1]
		if nx >= 0 and nx < board_size and ny >= 0 and ny < board_size:
			board[nx][ny].call(method_name, value)


# ======================= REQUIRED OVERRIDES =======================

func generate_start_and_goal(board: Array, _num_goals: int = 3, _level: int = 24) -> Array:
	return board

func set_safe_tiles(board: Array, _size: int = 24) -> Array:
	return board

func generate_heights(board: Array, _level: int = 24, _size: int = 24) -> Array:
	return board

func generate_obstacles(board: Array, _level: int = 24, _size: int = 24) -> Array:
	return board

func generate_hazards(board: Array, _total_hazards: int = 0, _level: int = 24, _size: int = 24) -> Array:
	return board

func track_hazard_count(board: Array, _size: int = 24) -> Array:
	return board


# ======================= HELPER METHODS =======================

func load_difficulty() -> int:
	return 24

func load_number_of_hazard() -> int:
	return 0

func load_number_of_goals() -> int:
	return 3

func load_type_of_zone() -> String:
	return "backyard"
