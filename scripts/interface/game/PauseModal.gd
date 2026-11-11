# ==============================================================
# ======================== PAUSE MODAL =========================
# ==============================================================
# Pause overlay. Shows seed, stats, and the list of children to
# rescue. Two buttons: Continue (resume) and Exit (back to menu).

extends CanvasLayer

signal continue_pressed
signal exit_pressed

const CHAR_PATH := "res://assets/sprites/characters/%s.png"
const CHILD_NAME_KEY := "game.children.%s"

@onready var seed_label: Label = $Root/Card/Content/SeedLabel
@onready var stats_label: Label = $Root/Card/Content/StatsLabel
@onready var children_container: HBoxContainer = $Root/Card/Content/ChildrenContainer
@onready var continue_button: TextureButton = $Root/Card/Content/ButtonsRow/ContinueButton
@onready var exit_button: TextureButton = $Root/Card/Content/ButtonsRow/ExitButton


func _ready() -> void:
	visible = false
	continue_button.pressed.connect(func(): continue_pressed.emit())
	exit_button.pressed.connect(func(): exit_pressed.emit())
	ButtonFeedback.attach_all(self)


func show_modal(char_ctrl, config: Dictionary, board: Array) -> void:
	# Seed.
	var seed_value = config.get("seed", null)
	seed_label.text = "Seed: %s" % (str(seed_value) if seed_value != null else "---")

	# Stats.
	var total_pals: int = char_ctrl.get_total_pals()
	var remaining_pals: int = char_ctrl.get_remaining_pals()
	stats_label.text = "%s: %d  |  %s: %d" % [
		LocaleManager.get_translation("game.wanted"), total_pals,
		LocaleManager.get_translation("game.remaining"), remaining_pals
	]

	# Children.
	for child in children_container.get_children():
		child.queue_free()

	var child_types: Array = _get_child_types(board)
	for child_type in child_types:
		_add_child_icon(child_type)

	visible = true


func _get_child_types(board: Array) -> Array:
	var types: Array = []
	for i in range(board.size()):
		for j in range(board.size()):
			var pal_type: String = board[i][j].get_pal_type()
			if pal_type != "none" and not types.has(pal_type):
				types.append(pal_type)
	return types


func _add_child_icon(child_type: String) -> void:
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)

	var texture_rect := TextureRect.new()
	texture_rect.custom_minimum_size = Vector2(60, 60)
	texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED

	var path: String = CHAR_PATH % child_type
	if ResourceLoader.exists(path):
		texture_rect.texture = load(path)

	vbox.add_child(texture_rect)

	var label := Label.new()
	label.text = LocaleManager.get_translation(CHILD_NAME_KEY % child_type)
	if label.text == CHILD_NAME_KEY % child_type:
		label.text = child_type.capitalize()
	label.add_theme_font_override("font", load("res://assets/font/Shampoos-Regular.ttf"))
	label.add_theme_font_size_override("font_size", 20)
	label.add_theme_color_override("font_color", Color(0, 0, 0, 1))
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(label)

	children_container.add_child(vbox)


func hide_modal() -> void:
	visible = false
