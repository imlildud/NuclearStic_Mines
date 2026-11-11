# ==============================================================
# ==================== CHARACTER FACTORY =======================
# ==============================================================
# Factory pattern implementation for creating character instances
# with predefined stats based on character type.
#
# CHARACTERS:
#   chef      Balanced (5 HP, 3 force, vision 2, ability 1)
#   mosquito  Recon    (3 HP, 2 force, vision 5, ability 2)
#   mommy     Tank     (10 HP, 3 AP, 1 force, vision 1, ability 3)
#   scout     Glass    (1 HP, 5 force, vision 2, ability 4)
#   student   Tutorial (2 HP, 4 flags, ability 1, vision 3)
#
# HARDCORE MODE:
# Hardcore uses different stat blocks for each character. Read from
# SaveManager at creation time.
#
# All methods are static: call as `CharacterFactory.create_character("chef")`.

class_name CharacterFactory
extends RefCounted


# ======================= HARDCORE CHECK =======================

# Returns true if Hardcore mode is enabled in the current save.
static func is_hardcore_enabled() -> bool:
	return SaveManager.is_hardcore_enabled()


# ======================= MAIN FACTORY METHOD =======================

# Creates a character based on the given type.
# Returns a CharacterModel with the appropriate stats.
# Pushes an error and returns a default chef if the type is unknown.
static func create_character(character_type: String):
	var is_hardcore: bool = is_hardcore_enabled()
	var character := CharacterModel.new()
	character.dead_pals = 0
	character.set_type(character_type)

	match character_type:
		"scout":    return _create_scout(character, is_hardcore)
		"mosquito": return _create_mosquito(character, is_hardcore)
		"mommy":    return _create_mommy(character, is_hardcore)
		"chef":     return _create_chef(character, is_hardcore)
		"student":  return _create_student(character, is_hardcore)
		_:
			push_error("Unknown character: " + character_type)
			return _create_chef(character, is_hardcore)


# ======================= CHARACTER STATS =======================

# ----- CHEF CHARACTER -----
# Balanced character with good health and force.
# Ability 1: Marks hazards on correct flag placement.
static func _create_chef(character, is_hardcore: bool):
	if is_hardcore:
		character.set_hp(5)
		character.set_ap(0)
		character.set_flags(0)
		character.max_inventory_size = 3
		character.set_ability_id(1)
		character.set_vision(2)
		character.set_force(1)
	else:
		character.set_hp(5)
		character.set_ap(0)
		character.set_flags(0)
		character.max_inventory_size = 5
		character.set_ability_id(1)
		character.set_vision(2)
		character.set_force(3)
	return character


# ----- MOSQUITO CHARACTER -----
# Recon character with high vision and flags, low health.
# Ability 2: Detection avoidance.
static func _create_mosquito(character, is_hardcore: bool):
	if is_hardcore:
		character.set_hp(3)
		character.set_ap(0)
		character.set_flags(0)
		character.max_inventory_size = 3
		character.set_ability_id(2)
		character.set_vision(5)
		character.set_force(1)
	else:
		character.set_hp(3)
		character.set_ap(0)
		character.set_flags(0)
		character.max_inventory_size = 5
		character.set_ability_id(2)
		character.set_vision(5)
		character.set_force(2)
	return character


# ----- MOMMY CHARACTER -----
# Tank character with high health, armor, but low flags and vision.
# Ability 3: Armor-based defense + smoke clearing + delivery buffs.
static func _create_mommy(character, is_hardcore: bool):
	if is_hardcore:
		character.set_hp(1)
		character.set_ap(1)
		character.set_flags(0)
		character.max_inventory_size = 3
		character.set_ability_id(3)
		character.set_vision(1)
		character.set_force(1)
	else:
		character.set_hp(10)
		character.set_ap(3)
		character.set_flags(0)
		character.max_inventory_size = 5
		character.set_ability_id(3)
		character.set_vision(1)
		character.set_force(1)
	return character


# ----- SCOUT CHARACTER -----
# Glass cannon with high force, low health.
# Ability 4: Climber — ignores terrain restrictions.
static func _create_scout(character, is_hardcore: bool):
	if is_hardcore:
		character.set_hp(1)
		character.set_ap(0)
		character.set_flags(0)
		character.max_inventory_size = 3
		character.set_ability_id(4)
		character.set_vision(2)
		character.set_force(1)
	else:
		character.set_hp(1)
		character.set_ap(0)
		character.set_flags(0)
		character.max_inventory_size = 5
		character.set_ability_id(4)
		character.set_vision(2)
		character.set_force(5)
	return character


# ----- STUDENT CHARACTER -----
# Tutorial character. Same stats in both modes.
static func _create_student(character, _is_hardcore: bool):
	character.set_hp(2)
	character.set_flags(4)
	character.set_inventory_size(0)
	character.set_ability_id(1)
	character.set_vision(3)
	character.set_force(1)
	return character
