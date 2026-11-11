# ==============================================================
# ====================== MODAL DIALOG ==========================
# ==============================================================
# Generic message modal. Shows a message and an OK button.
# Used for "tutorial completed", errors, generic notifications.

extends CanvasLayer

signal closed

@onready var message_text: RichTextLabel = $Root/Card/Content/MessageText
@onready var ok_button: Button = $Root/Card/Content/OkButton


func _ready() -> void:
	visible = false
	ok_button.pressed.connect(_on_ok_pressed)


func show_message(message: String) -> void:
	visible = true
	message_text.text = message


func _on_ok_pressed() -> void:
	visible = false
	closed.emit()
