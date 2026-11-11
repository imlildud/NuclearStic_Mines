# ==============================================================
# ===================== BOARD CONTROLLER =======================
# ==============================================================
# Handles procedural board generation for standard game modes.
# Extends BaseBoardController and overrides generation methods.
#
# All randomness goes through `random()` / `rand_int()` from the base
# class so a seed produces the same board every time.

extends BaseBoardController

# ======================= DIFFICULTY LOADERS =======================
# Returns the board size for a given level.
# Formula: 8 + floor(4 * (level / 5))
# Level 0 → 8x8, Level 5 → 12x12, Level 10 → 16x16, ...
func load_difficulty(level: int) -> int:
	var start_size: int = 8
	var step: int = 4
	return start_size + floori(float(step) * (float(level) / 5.0))


# Returns the number of hazards for a given level.
# Formula: 7 + floor(7 * (level / 5))
func load_number_of_hazard(level: int) -> int:
	var start_hazards: int = 7
	var step: int = 7
	return start_hazards + floori(float(step) * (float(level) / 5.0))


# Returns the number of hazards for a given board size
# (used when the size was computed independently of level).
# Formula: 7 + floor((size - 8) / 4) * 7
func load_number_of_hazard_by_size(size: int) -> int:
	var base_size: int = 8
	var base_hazards: int = 7
	var step: int = 4
	var hazard_step: int = 7
	var increment: int = floori(float(size - base_size) / float(step)) * hazard_step
	return base_hazards + increment


# Returns the number of goals (pals to rescue) for a given level.
# Formula: 1 + floor(1 * (level / 5))
func load_number_of_goals(level: int) -> int:
	var start_goals: int = 1
	var step: int = 1
	return start_goals + floori(float(step) * (float(level) / 5.0))


# Returns the biome/zone name for a given level.
# 0-9 → desert, 10-19 → snow,...
func load_type_of_zone(level: int) -> String:
	var lvl: int = floori(float(level))
	if lvl <= 9:
		return "desert"
	if lvl <= 19:
		return "snow"
	if lvl <= 29:
		return "scrapland"
	if lvl <= 39:
		return "roots"
	if lvl <= 49:
		return "glowyland"
	return "ash"


# ======================= BOARD GENERATION =======================

# Creates and returns an empty board of the given size.
# Does NOT place start, pals, hazards or anything — just tiles.
func generate_board(board_size: int) -> Array:
	return create_empty_board(board_size)


# Places the player start tile on a random edge and distributes
# `num_pals` rescue targets across the opposite half of the board.
# Pal types are filtered by `min_level`; unavailable pals are skipped.
# Returns the modified board.
func generate_start_and_pal(board: Array, num_pals: int, level: int) -> Array:
	var board_size: int = board.size()
	var probability: int = rand_int(0, 3)
	var edge_min: int = 0
	var edge_max: int = board_size - 1
	var random_pos: int = rand_int(0, board_size - 1)

	# Pal types with min level requirement
	var pal_types := [
		{"type": "charlie", "min_level": 0},
		{"type": "joni", "min_level": 5},
		{"type": "ru", "min_level": 9999},
		{"type": "evy", "min_level": 9999},
		{"type": "zac", "min_level": 9999}
	]

	# Keep only the pals available at this level
	var valid_pals: Array = []
	for g in pal_types:
		if level >= g["min_level"]:
			valid_pals.append(g)

	# Pick which edge the player starts on (top, left, bottom, right)
	match probability:
		0: board[edge_min][random_pos].set_start(true)
		1: board[random_pos][edge_min].set_start(true)
		2: board[edge_max][random_pos].set_start(true)
		3: board[random_pos][edge_max].set_start(true)

	if valid_pals.is_empty():
		push_warning("No valid pals")
		return board

	# Place pals on the half of the board opposite to the start edge.
	# Attempts are capped to avoid infinite loops on small boards.
	var remaining_pals: int = num_pals
	var attempts: int = 0
	var max_attempts: int = 5000

	while remaining_pals > 0 and attempts < max_attempts:
		attempts += 1
		var pal_x: int = rand_int(0, board_size - 1)
		var pal_y: int = rand_int(0, board_size - 1)

		# Push the pal toward the opposite half of the board
		match probability:
			0:
				if pal_x <= board_size / 2:
					pal_x = floori(board_size / 2.0 + random() * (board_size / 2.0))
			1:
				if pal_y <= board_size / 2:
					pal_y = floori(board_size / 2.0 + random() * (board_size / 2.0))
			2:
				if pal_x >= board_size / 2:
					pal_x = floori(random() * (board_size / 2.0))
			3:
				if pal_y >= board_size / 2:
					pal_y = floori(random() * (board_size / 2.0))

		var tile = board[pal_x][pal_y]

		# Only place on free, non-start tiles
		if tile.get_pal_type() == "none" and not tile.is_start():
			var pal_index: int = rand_int(0, valid_pals.size() - 1)
			var chosen = valid_pals[pal_index]
			tile.set_pal_type(chosen["type"])
			tile.set_pal_alive(true)

			# Joni uses a hidden safe zone; everyone else uses a visible one
			if chosen["type"] == "joni":
				tile.set_securehidden(true)
			else:
				tile.set_secure(true)

			print("Pal tile generated at [%d,%d]: %s" % [pal_x, pal_y, chosen["type"]])
			remaining_pals -= 1

		if attempts >= max_attempts:
			push_warning("Pal generation stopped by safety")

	return board


# Reveals the whole board and marks safe zones around the start
# and around every pal. Joni's pal uses `securehidden`, others use
# `secure`. Returns the modified board.
func set_safe_tiles(board: Array, _size: int) -> Array:
	var board_size: int = board.size()
	var directions := [
		[-1, 0], [1, 0], [0, -1], [0, 1],
		[-1, 1], [-1, -1], [1, 1], [1, -1]
	]

	for i in range(board_size):
		for j in range(board_size):
			board[i][j].set_hide(false)

			if board[i][j].get_pal_type() == "joni":
				for d in directions:
					var x: int = i + d[0]
					var y: int = j + d[1]
					if x >= 0 and x < board_size and y >= 0 and y < board_size:
						board[x][y].set_securehidden(true)
			elif board[i][j].is_start() or board[i][j].get_pal_type() != "none":
				for d in directions:
					var x: int = i + d[0]
					var y: int = j + d[1]
					if x >= 0 and x < board_size and y >= 0 and y < board_size:
						board[x][y].set_secure(true)

	return board


# Generates terrain heights starting at level 3.
# 1. Picks `total_heights` random free tiles and assigns a weighted
#    height type (1–4) that becomes more varied at higher levels.
# 2. Propagates the influence: each tall tile spreads a lower height
#    to neighbors in a random pattern, so hills look natural.
# Returns the modified board.
func generate_heights(board: Array, level: int, size: int) -> Array:
	var board_size: int = size

	if level >= 3:
		var total_heights: int = rand_int(5, floori(float(board_size - 1) / 2.0) + level)

		# Available height types with weights and min levels
		var height_types := [
			{"type": 1, "weight": 0.45, "min_level": 3},
			{"type": 2, "weight": 0.35, "min_level": 5},
			{"type": 3, "weight": 0.3, "min_level": 10},
			{"type": 4, "weight": 0.25, "min_level": 15}
		]

		# Filter by level and normalize weights to sum 1.0
		var valid_heights: Array = []
		for ht in height_types:
			if level >= ht["min_level"]:
				valid_heights.append(ht)

		var total_weight: float = 0.0
		for ht in valid_heights:
			total_weight += ht["weight"]
		for ht in valid_heights:
			ht["weight"] /= total_weight

		var remaining: int = total_heights

		# Place random height seeds
		while remaining > 0:
			var roll: float = random()
			var acc: float = 0.0
			var chosen_type: int = 1

			for ht in valid_heights:
				acc += ht["weight"]
				if roll <= acc:
					chosen_type = ht["type"]
					break

			var x: int = rand_int(0, board_size - 1)
			var y: int = rand_int(0, board_size - 1)
			var tile = board[x][y]

			# Only place on completely free tiles
			if not tile.is_start() and tile.get_pal_type() == "none" \
				and not tile.is_secure() and not tile.is_securehidden() \
				and not tile.is_marked() and tile.get_hazardtype() == "none" \
				and tile.get_obstacletype() == "none":
				tile.set_tileheight(chosen_type)
				remaining -= 1

	# Propagate height influence to neighbors (makes hills organic)
	for i in range(board_size):
		for j in range(board_size):
			var tile = board[i][j]

			if tile.get_tileheight() > 1:
				var height_founded: int = tile.get_tileheight()
				var pattern_type: int = rand_int(0, 5)
				var directions: Array = []

				# Six propagation patterns: cross, line, X, 2-step cross,
				# 2-step X, or a random far neighbor.
				match pattern_type:
					0:
						directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]
					1:
						directions = [[-1,0],[1,0],[0,-1],[0,1]]
					2:
						directions = [[-1,-1],[-1,1],[1,-1],[1,1]]
					3:
						directions = [[-2,0],[2,0],[0,-2],[0,2],[-1,0],[1,0],[0,-1],[0,1]]
					4:
						directions = [[-2,-2],[-2,2],[2,-2],[2,2],[-1,-1],[-1,1],[1,-1],[1,1]]
					5:
						var dx: int = rand_int(-4, 4)
						var dy: int = rand_int(-4, 4)
						directions = [[dx, dy]]

				# Spread a lower height to each neighbor
				for d in directions:
					var x: int = i + d[0]
					var y: int = j + d[1]
					if x >= 0 and x < board_size and y >= 0 and y < board_size:
						var target_tile = board[x][y]

						if not target_tile.is_start() \
							and target_tile.get_pal_type() == "none" \
							and not target_tile.is_secure() \
							and not target_tile.is_securehidden() \
							and not target_tile.is_marked() \
							and target_tile.get_hazardtype() == "none" \
							and target_tile.get_obstacletype() == "none":
							var new_height: int = maxi(1, height_founded - 1)
							target_tile.set_tileheight(new_height)

	return board


# Generates obstacles starting at level 3.
# Types unlock by level: natural (3), river (5), spikes (10), pit (15).
# Returns the modified board.
func generate_obstacles(board: Array, level: int, size: int) -> Array:
	var board_size: int = size

	if level >= 3:
		var total_obstacles: int = rand_int(5, floori(float(board_size - 1) / 2.0) + level)

		# Available obstacle types with weights and min levels
		var obstacle_types := [
			{"type": "natural", "weight": 0.45, "min_level": 3},
			{"type": "river", "weight": 0.35, "min_level": 5},
			{"type": "spikes", "weight": 0.25, "min_level": 10},
			{"type": "pit", "weight": 0.15, "min_level": 15}
		]

		# Filter by level and normalize weights
		var valid_obstacles: Array = []
		for ot in obstacle_types:
			if level >= ot["min_level"]:
				valid_obstacles.append(ot)

		var total_weight: float = 0.0
		for ot in valid_obstacles:
			total_weight += ot["weight"]
		for ot in valid_obstacles:
			ot["weight"] /= total_weight

		var remaining: int = total_obstacles
		while remaining > 0:
			var roll: float = random()
			var acc: float = 0.0
			var chosen_type: String = "natural"

			for ot in valid_obstacles:
				acc += ot["weight"]
				if roll <= acc:
					chosen_type = ot["type"]
					break

			var x: int = rand_int(0, board_size - 1)
			var y: int = rand_int(0, board_size - 1)
			var tile = board[x][y]

			# Only place on completely free tiles
			if not tile.is_start() and tile.get_pal_type() == "none" \
				and not tile.is_secure() and not tile.is_securehidden() \
				and not tile.is_marked() and tile.get_hazardtype() == "none" \
				and tile.get_obstacletype() == "none":
				tile.set_obstacletype(chosen_type)
				remaining -= 1

	return board


# Generates hazards up to `total_hazards`.
# Types unlock by level: mine/cactus (0), pipe (5), nest (8),
# radioactive (10). Several types are reserved for future levels
# (min_level 9999) to keep them in the data table.
# Also applies radius effects (smoke, damage, detection) with a
# height check so higher tiles are not affected.
# Returns the modified board.
func generate_hazards(board: Array, total_hazards: int, level: int, size: int) -> Array:
	var board_size: int = size

	# Hazard type table with weights and min levels.
	# Types with min_level 9999 are placeholders for future content.
	var hazard_types := [
		{"type": "mine", "weight": 0.3, "min_level": 0},
		{"type": "cactus", "weight": 0.3, "min_level": 0},
		{"type": "deadbush", "weight": 0.3, "min_level": 9999},
		{"type": "pipe", "weight": 0.15, "min_level": 5},
		{"type": "nest", "weight": 0.02, "min_level": 8},
		{"type": "radioactive", "weight": 0.1, "min_level": 10},
		{"type": "spiderMine", "weight": 0.2, "min_level": 9999},
		{"type": "bandit", "weight": 0.1, "min_level": 9999},
		{"type": "liberal", "weight": 0.0, "min_level": 9999},
		{"type": "sandsnake", "weight": 0.1, "min_level": 9999},
		{"type": "dunecrawler", "weight": 0.01, "min_level": 9999}
	]

	# Filter by level and normalize weights
	var valid_hazards: Array = []
	for ht in hazard_types:
		if level >= ht["min_level"]:
			valid_hazards.append(ht)

	var total_weight: float = 0.0
	for ht in valid_hazards:
		total_weight += ht["weight"]
	if total_weight <= 0.0:
		return board
	for ht in valid_hazards:
		ht["weight"] /= total_weight

	var remaining: int = total_hazards
	var attempts: int = 0
	var max_attempts: int = 5000

	while remaining > 0 and attempts < max_attempts:
		attempts += 1
		var roll: float = random()
		var acc: float = 0.0
		var chosen_type: String = "mine"

		for ht in valid_hazards:
			acc += ht["weight"]
			if roll <= acc:
				chosen_type = ht["type"]
				break

		var x: int = rand_int(0, board_size - 1)
		var y: int = rand_int(0, board_size - 1)
		var tile = board[x][y]

		# Only place on completely free tiles
		if not tile.is_start() and tile.get_pal_type() == "none" \
			and not tile.is_secure() and not tile.is_securehidden() \
			and not tile.is_marked() and tile.get_hazardtype() == "none" \
			and tile.get_obstacletype() == "none":

			tile.set_hazardtype(chosen_type)
			tile.set_hazardlive(false)

			# Moving hazards start "alive"
			if chosen_type in ["deadbush", "bandit", "liberal", "dunecrawler"]:
				tile.set_hazardlive(true)

			# Radius effects for specific hazard types
			if chosen_type == "pipe":
				apply_radius_with_height_check(tile, board, x, y, "set_smoke")
			if chosen_type == "radioactive":
				apply_radius_with_height_check(tile, board, x, y, "set_damageratio")
			if chosen_type in ["spiderMine", "liberal", "sandsnake"]:
				apply_radius_with_height_check(tile, board, x, y, "set_detectionratio")

			tile.set_unhideable(false)
			remaining -= 1

	if remaining > 0:
		push_warning("Only %d of %d can be placed" % [total_hazards - remaining, total_hazards])

	return board


# Computes hazard adjacency counts and radius effects.
# Pass 1: every tile next to a hazard gets +1 hazardcount.
# Pass 2: radioactive/spidermine apply damage/detection radius,
#         but only to tiles whose height is <= the source height.
# Returns the modified board.
func track_hazard_count(board: Array, _size: int = 0) -> Array:
	var board_size: int = board.size()
	var directions := [
		[-1, 0], [1, 0], [0, -1], [0, 1],
		[-1, 1], [-1, -1], [1, 1], [1, -1]
	]

	# First pass: hazardcount (ignores height)
	for i in range(board_size):
		for j in range(board_size):
			var tile = board[i][j]
			if tile.get_hazardtype() != "none":
				for d in directions:
					var x: int = i + d[0]
					var y: int = j + d[1]
					if x >= 0 and x < board_size and y >= 0 and y < board_size:
						board[x][y].increment_hazardcount()

	# Second pass: radius effects (respects height)
	for i in range(board_size):
		for j in range(board_size):
			var tile = board[i][j]
			var hazard_type: String = tile.get_hazardtype()
			var source_height: int = tile.get_tileheight()

			if hazard_type == "radioactive":
				for d in directions:
					var x: int = i + d[0]
					var y: int = j + d[1]
					if x >= 0 and x < board_size and y >= 0 and y < board_size:
						var target_tile = board[x][y]
						if target_tile.get_tileheight() <= source_height:
							target_tile.set_damageratio(true)

			if hazard_type == "spidermine":
				for d in directions:
					var x: int = i + d[0]
					var y: int = j + d[1]
					if x >= 0 and x < board_size and y >= 0 and y < board_size:
						var target_tile = board[x][y]
						if target_tile.get_tileheight() <= source_height:
							target_tile.set_detectionratio(true)

	return board


# Places 0–N treasure tiles on the board.
# Base probability and max count scale with board size; the Greed
# and Fortune keychains add +10% probability each, and Greed also
# adds +1 to the max count. Probability is capped at 95%.
# Returns the modified board.
func generate_treasures(board: Array, size: int) -> Array:
	var probability: float = 0.0
	var max_treasures: int = 0

	# ===== GREED & FORTUNE: Stacking effects =====
	var saved_keychains: Array = _get_legacy_keychains()
	var has_greed: bool = saved_keychains.has("greed")
	var has_fortune: bool = saved_keychains.has("fortune")

	# Base values by size
	var base_probability: float = 0.0
	var base_max_treasures: int = 0

	if size <= 8:
		base_probability = 0.35
		base_max_treasures = 1
	elif size <= 12:
		base_probability = 0.45
		base_max_treasures = 1
	elif size <= 16:
		base_probability = 0.55
		base_max_treasures = 2
	elif size <= 20:
		base_probability = 0.70
		base_max_treasures = 3
	else:
		base_probability = 0.80
		base_max_treasures = 3

	# Apply Greed (+10% probability, +1 max treasure)
	if has_greed:
		probability = base_probability + 0.10
		max_treasures = base_max_treasures + 1
	else:
		probability = base_probability
		max_treasures = base_max_treasures

	# Apply Fortune (+10% probability, stacks with Greed)
	if has_fortune:
		probability += 0.10

	# Cap probability at 95%
	probability = minf(probability, 0.95)

	print("[Treasure] Greed: %s, Fortune: %s, Probability: %d%%, Max: %d" % [has_greed, has_fortune, int(round(probability * 100.0)), max_treasures])

	# Roll to see if any treasure spawns at all
	var r: float = random()
	if r > probability:
		print("[Treasure] No treasures generated (%d%% chance)" % int(round(probability * 100.0)))
		return board

	# Decide how many treasures (1 to max_treasures)
	var count: int = 1
	if max_treasures > 1 and random() < 0.5:
		count = mini(max_treasures, floori(random() * max_treasures) + 1)

	print("[Treasure] Generating %d treasure(s) on %dx%d board" % [count, size, size])

	# Gather every valid tile for treasure placement
	var available_tiles: Array = []
	for i in range(board.size()):
		for j in range(board.size()):
			var tile = board[i][j]
			if not tile.is_start() \
				and tile.get_pal_type() == "none" \
				and tile.get_hazardtype() == "none" \
				and tile.get_obstacletype() == "none" \
				and not tile.have_treasure():
				available_tiles.append({"x": i, "y": j})

	# Pick `count` distinct tiles at random
	var selected: Array = []
	for _i in range(count):
		if available_tiles.is_empty():
			break
		var index: int = floori(random() * available_tiles.size())
		var pos = available_tiles[index]
		available_tiles.remove_at(index)
		selected.append(pos)

	# Apply treasure to each selected tile
	for pos in selected:
		board[pos["x"]][pos["y"]].set_treasure(true)
		print("[Treasure] Placed at (%d, %d)" % [pos["x"], pos["y"]])

	return board


# ======================= LEGACY KEYCHAINS HELPER =======================
# Returns the list of keychains active in the current Legacy run.
func _get_legacy_keychains() -> Array:
	if game_manager != null and game_manager.has_method("get_legacy_keychains"):
		return game_manager.get_legacy_keychains()
	return []
