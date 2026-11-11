# ==============================================================
# ==================== LEVEL START MODAL =======================
# ==============================================================
# Shows level title, seed, info, and the children to rescue.
# Dismissed by clicking or pressing any key.

extends CanvasLayer

signal dismissed

const CHAR_PATH := "res://assets/sprites/characters/%s.png"
const CHILD_NAME_KEY := "game.children.%s"

@onready var title_label: Label = $Root/Card/Content/TitleLabel
@onready var seed_label: Label = $Root/Card/Content/SeedLabel
@onready var info_label: Label = $Root/Card/Content/InfoLabel
@onready var children_container: HBoxContainer = $Root/Card/Content/ChildrenContainer


func _ready() -> void:
	visible = false
	set_process_input(false)
	ButtonFeedback.attach_all(self)


func show_modal(title: String, seed_text: String, info: String, child_types: Array) -> void:
	title_label.text = title
	seed_label.text = seed_text
	info_label.text = info

	# Clear existing children.
	for child in children_container.get_children():
		child.queue_free()

	# Add new children.
	for child_type in child_types:
		_add_child_icon(child_type)

	visible = true
	set_process_input(true)


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


func _input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		_dismiss()
	elif event is InputEventMouseButton and event.pressed:
		_dismiss()


func _dismiss() -> void:
	visible = false
	set_process_input(false)
	dismissed.emit()
