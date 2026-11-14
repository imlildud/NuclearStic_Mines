# ==============================================================
# ==================== CHARACTER CONTROLLER ====================
# ==============================================================
# Handles character movement, tile interaction, combat,
# goal delivery, and game status management.

extends Node
class_name CharacterController

# ======================= SIGNALS =======================

# Emitted when the player rescues a pal on the current tile.
# Used by Game.gd to refresh the full vision after a rescue.
signal pal_rescued

# ======================= STATE =======================

var character = null              # CharacterModel
var board_controller = null       # BaseBoardController
var game_manager = null           # GameManager
var total_pals: int = 0           # Total pals to rescue
var remaining_pals: int = 0       # Pals still needing rescue


func _init(char = null, board_ctrl = null, gm = null) -> void:
	character = char
	board_controller = board_ctrl
	game_manager = gm


# Helper: checks if fall damage is enabled in the current save.
func is_fall_damage_enabled() -> bool:
	return game_manager != null and game_manager.is_fall_damage_enabled()


# ======================= GOAL SETTER =======================

# Set the number of goals for the current mission.
func set_character_pals(v: int) -> void:
	remaining_pals = v
	total_pals = v


# ======================= START POSITION =======================

# Find the start tile on the board and set the character's position.
func get_start_coords(board: Array) -> void:
	var boardsize: int = board.size()
	for i in range(boardsize):
		for j in range(boardsize):
			if board[i][j].is_start():
				character.set_pos_x(i)
				character.set_pos_y(j)
				return


# ======================= MOVEMENT SYSTEM =======================

# Move the character in a direction, handling obstacles and terrain.
# `river_depth` prevents infinite recursion when crossing rivers.
func move_character(direction: String, board: Array, river_depth: int = 0) -> void:
	var boardsize: int = board.size()
	var new_x: int = character.get_pos_x()
	var new_y: int = character.get_pos_y()

	var old_x: int = character.get_pos_x()
	var old_y: int = character.get_pos_y()
	var old_tile = board[old_x][old_y]

	# Calculate new position based on direction
	match direction:
		"Up":    new_y -= 1
		"Down":  new_y += 1
		"Left":  new_x -= 1
		"Right": new_x += 1

	var has_continuity: bool = character.has_keychain("continuity")
	if has_continuity:
		# Wrap around edges
		if new_x < 0: new_x = boardsize - 1
		elif new_x >= boardsize: new_x = 0
		if new_y < 0: new_y = boardsize - 1
		elif new_y >= boardsize: new_y = 0
	else:
		# Boundary check
		if new_x < 0 or new_x >= boardsize or new_y < 0 or new_y >= boardsize:
			return

	var current_tile = board[character.get_pos_x()][character.get_pos_y()]
	var target_tile = board[new_x][new_y]

	# ===== HEIGHT DIFFERENCE CHECK =====
	var height_diff: int = target_tile.get_tileheight() - current_tile.get_tileheight()

	# Ability 4 (Scout) ignores all height restrictions
	if character.get_ability_id() != 4:
		var has_ascent: bool = character.has_keychain("ascent")
		var max_climb: int = 2 if has_ascent else 1

		# Can't climb up more than max_climb levels
		if height_diff > max_climb:
			return

		# Can fall down 2 or more levels
		if height_diff < -1:
			var fall_distance: int = absi(height_diff)
			var has_descent: bool = character.has_keychain("descent")
			var has_stealth: bool = character.has_keychain("stealth")

			if has_ascent and fall_distance < 3:
				pass
			elif has_descent:
				if not character.use_keychain("descent"):
					return
			else:
				var fall_damage_enabled: bool = is_fall_damage_enabled()

				if fall_damage_enabled:
					var fall_damage: int = fall_distance - 1
					if has_stealth:
						fall_damage = maxi(0, fall_damage - 1)
					if fall_damage > 0:
						character.decrement_hp(fall_damage)
						character.increment_damage_taken(fall_damage)

						# Play hurt sound
						if game_manager != null:
							AudioManager.play_hurt_sfx()

						# Trigger visual damage flash
						character.set_damage_flash(true)
						get_tree().create_timer(0.15).timeout.connect(func():
							if character != null:
								character.set_damage_flash(false)
						)
						character.increment_damage_taken(1)

						if character.get_hp() <= 0:
							kill_character()
							return
				else:
					return

	# ===== OBSTACLE HANDLING =====
	var obst: String = target_tile.get_obstacletype()
	var pipe: bool = target_tile.get_hazardtype() == "pipe"

	# ===== SPIKE CHECK =====
	if obst == "spikes":
		if game_manager != null and game_manager.spike_controller != null:
			var spike_state: String = game_manager.spike_controller.get_state_at(new_x, new_y)
			var has_stealth: bool = character.has_keychain("stealth")
			if spike_state == "on" and not has_stealth:
				character.set_pos_x(new_x)
				character.set_pos_y(new_y)
				hurt_character()
				return
		# OFF, PREPARED, or STEALTH → movement normal
		character.set_pos_x(new_x)
		character.set_pos_y(new_y)
		return

	match obst:
		"natural":
			if character.get_ability_id() == 4:
				character.set_pos_x(new_x)
				character.set_pos_y(new_y)
			return
		"river":
			character.set_pos_x(new_x)
			character.set_pos_y(new_y)
			if character.get_ability_id() != 4:
				if river_depth < 5:
					move_character(direction, board, river_depth + 1)
				else:
					character.set_hp(0)
					kill_character()
			return
		"pit":
			character.set_pos_x(new_x)
			character.set_pos_y(new_y)
			if character.get_ability_id() != 4:
				# Check for Salvation keychain
				if character.has_keychain("salvation") and character.is_keychain_active("salvation"):
					character.use_keychain("salvation")

					if game_manager != null:
						AudioManager.play_rescue_sfx()

					var remaining: int = character.get_keychain_uses("salvation")
				else:
					character.set_hp(0)
					kill_character()
			return
		"safepit":
			character.set_pos_x(new_x)
			character.set_pos_y(new_y)
			if board_controller != null and board_controller.game_manager != null:
				board_controller.game_manager.on_tutorial_pit_fall()
			return

	if pipe:
		if character.get_ability_id() == 4:
			character.set_pos_x(new_x)
			character.set_pos_y(new_y)
		return

	# Normal movement (no obstacle)
	character.set_pos_x(new_x)
	character.set_pos_y(new_y)

	# ===== MOMMY SMOKE CLEARING ABILITY (Ability 3) =====
	if character.get_ability_id() == 3:
		# Restore smoke on previous tile if it was cleared by Mommy
		if old_tile.was_smoke_cleared():
			old_tile.set_smoke(true)
			old_tile.set_smoke_cleared(false)

		# Clear smoke on new tile
		var new_tile = board[new_x][new_y]
		if new_tile.is_smoke():
			new_tile.set_smoke(false)
			new_tile.set_smoke_cleared(true)


# ======================= TILE VERIFICATION =======================

# Verify and handle tile effects when stepping on a tile.
func verify_tile(board: Array) -> void:
	var tile = board[character.get_pos_x()][character.get_pos_y()]
	var ability: int = character.get_ability_id()

	var hazard_type: String = tile.get_hazardtype()
	var is_marked: bool = tile.is_marked()
	var has_damage_ratio: bool = tile.get_damageratio()
	var has_detection_ratio: bool = tile.get_detectionratio()
	var pal_type: String = tile.get_pal_type()
	var is_start_tile: bool = tile.is_start()

	# ===================== HAZARD HANDLING =====================

	# ----- LETHAL HAZARDS (Mine) -----
	if hazard_type == "mine":
		# Ability 1 (Chef) survives if mine is marked
		if ability == 1 and is_marked:
			return

		# Check if character has armor points
		if character.get_ap() > 0:
			character.decrement_ap(1)

			if game_manager != null:
				AudioManager.play_hurt_metal_sfx()

			# Trigger screen blackout effect for dramatic mine explosion
			if game_manager != null and game_manager.renderer != null:
				game_manager.renderer.trigger_mine_flash()
			return

		# No armor - die
		character.set_hp(0)
		kill_character()
		return

	# ----- DAMAGE HAZARDS (Cactus, Deadbush, Radioactive radius) -----
	if hazard_type == "cactus" or hazard_type == "deadbush" or has_damage_ratio:
		# Chef survives if marked
		if ability == 1 and is_marked:
			return

		var has_protection: bool = character.has_keychain("protection")
		var has_judgment: bool = character.has_keychain("judgment")
		if has_protection and is_marked:
			return

		# Check if character has armor points
		if character.get_ap() > 0:
			character.decrement_ap(1)

			if game_manager != null:
				AudioManager.play_hurt_metal_sfx()
			return

		# Criticker damage
		if character.is_criticized() and not has_judgment:
			character.set_criticized(false)
			hurt_character()

			if game_manager != null and game_manager.criticker != null:
				game_manager.criticker.abandon()

		# Normal damage
		hurt_character()
		return

	# ===== CRITICKER NEST HANDLING =====
	if hazard_type == "nest":
		var has_stealth: bool = character.has_keychain("stealth")

		if not character.is_criticized() and not has_stealth:
			character.set_criticized(true)

			var goal: int = randi_range(1, 5)
			character.set_criticker_goal(goal)
			character.set_criticker_progress(0)

			tile.set_hazardtype("nest_open")

			if game_manager != null and game_manager.criticker != null:
				game_manager.criticker.activate(goal)
			return
		else:
			tile.set_hazardtype("nest_open")
			if not has_stealth:
				hurt_character()

	# ----- DETECTION HAZARDS (SpiderMine, Bandit, Sandsnake) -----
	if has_detection_ratio:
		if ability == 2 and randi_range(0, 3) == 0:
			# Mosquito ability has chance to avoid detection
			pass
		elif ability != 2:
			# Normal detection behavior
			pass

	# ===================== PAL HANDLING =====================

	# Rescue pals if conditions are met
	if pal_type != "none" and tile.is_pal_alive():
		if character.get_force() > character.get_rescued():
			character.increment_rescue()
			tile.set_pal_type("none")
			tile.set_pal_alive(false)
			character.set_regen(true)

			# Reset destiny target when a pal is rescued
			if game_manager != null:
				game_manager.reset_destiny_target()

			# ===== SCOUT: Convert Jump Flags to Marked =====
			if character.get_ability_id() == 4 and game_manager != null:
				var flag_manager = game_manager.get_flag_manager()
				var converted: int = flag_manager.convert_jump_flags_to_marked(board)
				if converted > 0:
					print("[Scout] %d Jump Flags converted to Marked" % converted)

			if game_manager != null:
				AudioManager.play_rescue_sfx()

			# Notify listeners (Game.gd uses this to refresh vision).
			pal_rescued.emit()

	# ===================== DELIVERY HANDLING =====================

	# Deliver rescued children at the start tile
	if is_start_tile:
		deliver_pal(board)


# ======================= PAL DELIVERY =======================

# Deliver rescued pals at the start tile and apply rewards.
func deliver_pal(board: Array) -> void:
	var tile = board[character.get_pos_x()][character.get_pos_y()]

	if tile.is_start() and character.get_rescued() > 0:
		var rescued: int = character.get_rescued()

		# Play deliver sound
		if game_manager != null:
			AudioManager.play_deliver_sfx()

		# ===== MOMMY ABILITY (Ability 3) =====
		# Each rescued pal grants armor, health and force.
		if character.get_ability_id() == 3:
			for _i in range(rescued):
				if character.get_ap() < 3:
					character.increment_ap(1)
				else:
					character.increment_hp(2)
				character.increment_force(1)

		# Update mission stats
		remaining_pals -= rescued
		character.decrement_rescue(rescued)
		character.increment_total_rescued(rescued)


# ======================= WIN CONDITION =======================

# Check if the player has won (all goals rescued and returned to start).
func win_condition(board: Array) -> bool:
	var has_judgment: bool = character.has_keychain("judgment")
	var current_tile = board[character.get_pos_x()][character.get_pos_y()]
	var all_rescued: bool = current_tile.is_start() and character.get_rescued() == remaining_pals

	if has_judgment:
		# Must have 0 flags remaining
		return all_rescued and character.get_flags() == 0

	return all_rescued


# ======================= DAMAGE HANDLING =======================

# Apply damage to the character.
func hurt_character() -> void:
	var has_judgment: bool = character.has_keychain("judgment")
	var has_oblivion: bool = character.has_keychain("oblivion")

	character.decrement_hp(1)
	character.increment_damage_taken(1)

	if game_manager != null:
		AudioManager.play_hurt_sfx()

	character.set_damage_flash(true)
	get_tree().create_timer(0.15).timeout.connect(func():
		if character != null:
			character.set_damage_flash(false)
	)

	# If Judgment, stay criticized
	if has_judgment:
		character.set_criticized(true)

	if has_oblivion and game_manager != null:
		var board: Array = game_manager.get_board()
		var flag_manager = game_manager.get_flag_manager()
		if not board.is_empty() and flag_manager != null and flag_manager.has_method("remove_marked_hazard"):
			flag_manager.remove_marked_hazard(board)

	# ===== LINK: Kill linked pal on damage =====
	if game_manager != null:
		game_manager.on_player_damage()

	if character.get_hp() <= 0:
		kill_character()


# Kill the character and trigger game over.
func kill_character() -> void:
	# ===== CHECK FOR REVERSION AUTO-ACTIVATE =====
	if game_manager != null:
		var reversion_manager = game_manager.get_reversion_manager()
		if reversion_manager != null and reversion_manager.auto_activate_on_death():
			print("[KillCharacter] Reversion activated, preventing death")
			return

	print("[KillCharacter] Killing character")
	character.set_alive(false)
	character.increment_damage_taken(10)

	if game_manager != null:
		game_manager.handle_game_over()
	else:
		push_error("[KillCharacter] CRITICAL: No game_manager!")


# ======================= GETTERS =======================

func get_total_pals() -> int:
	return total_pals

func get_remaining_pals() -> int:
	return remaining_pals

func get_rescued_pals() -> int:
	return character.get_rescued()
