# ==============================================================
# ===================== MESSAGE MODAL ==========================
# ==============================================================
# Reusable modal overlay for the game scene.
#
# The modal is built once per scene instance. Callers use the
# public API below; Game.gd wires GameManager signals into it.

extends CanvasLayer
class_name MessageModal


var _panel: PanelContainer = null
var _label: Label = null
var _ok_btn: Button = null
var _yes_btn: Button = null
var _no_btn: Button = null

var _on_close: Callable = Callable()
var _on_yes: Callable = Callable()
var _on_no: Callable = Callable()


func _ready() -> void:
	layer = 200  # Above the HUD
	visible = false
	_build()


func _build() -> void:
	var bg := ColorRect.new()
	bg.color = Color(0, 0, 0, 0.85)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(600, 0)
	center.add_child(_panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 30)
	margin.add_theme_constant_override("margin_right", 30)
	margin.add_theme_constant_override("margin_top", 30)
	margin.add_theme_constant_override("margin_bottom", 30)
	_panel.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 20)
	margin.add_child(vbox)

	_label = Label.new()
	_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.custom_minimum_size = Vector2(540, 0)
	vbox.add_child(_label)

	var hbox := HBoxContainer.new()
	hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	hbox.add_theme_constant_override("separation", 20)
	vbox.add_child(hbox)

	_ok_btn = Button.new()
	_ok_btn.text = "OK"
	_ok_btn.custom_minimum_size = Vector2(120, 50)
	_ok_btn.pressed.connect(_on_ok_pressed)
	hbox.add_child(_ok_btn)

	_yes_btn = Button.new()
	_yes_btn.text = "Yes"
	_yes_btn.custom_minimum_size = Vector2(120, 50)
	_yes_btn.pressed.connect(_on_yes_pressed)
	hbox.add_child(_yes_btn)

	_no_btn = Button.new()
	_no_btn.text = "No"
	_no_btn.custom_minimum_size = Vector2(120, 50)
	_no_btn.pressed.connect(_on_no_pressed)
	hbox.add_child(_no_btn)


# ======================= PUBLIC API =======================

# Simple message with a single OK button.
# `message` may contain newlines (kept as-is, wrapped by the Label).
func show_message(message: String, on_close: Callable = Callable()) -> void:
	_label.text = message
	_on_close = on_close
	_on_yes = Callable()
	_on_no = Callable()
	_ok_btn.visible = true
	_yes_btn.visible = false
	_no_btn.visible = false
	visible = true


# Question with Yes/No buttons.
func show_question(message: String, yes_text: String, no_text: String,
		on_yes: Callable, on_no: Callable) -> void:
	_label.text = message
	_on_close = Callable()
	_on_yes = on_yes
	_on_no = on_no
	_yes_btn.text = yes_text
	_no_btn.text = no_text
	_ok_btn.visible = false
	_yes_btn.visible = true
	_no_btn.visible = true
	visible = true


func close() -> void:
	visible = false


# ======================= INTERNAL =======================

func _on_ok_pressed() -> void:
	visible = false
	var cb := _on_close
	_on_close = Callable()
	if cb.is_valid():
		cb.call()


func _on_yes_pressed() -> void:
	visible = false
	var cb := _on_yes
	_on_yes = Callable()
	if cb.is_valid():
		cb.call()


func _on_no_pressed() -> void:
	visible = false
	var cb := _on_no
	_on_no = Callable()
	if cb.is_valid():
		cb.call()
