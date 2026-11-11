# ==============================================================
# ==================== BUTTON FEEDBACK =========================
# ==============================================================
# Pure helper that attaches hover / press / release animations
# to any BaseButton (Button, TextureButton, etc.).
#
# Usage:
#   ButtonFeedback.attach(self, $MyButton)
#   ButtonFeedback.attach_all(self)   # all buttons in the subtree
#
# The animations:
#   - Hover:    scale 1.05, modulate 1.15 (brighter)
#   - Pressed:  scale 0.95, modulate 0.85 (darker)
#   - Released: scale 1.05, modulate 1.15 (back to hover)
#   - Exited:   scale 1.00, modulate 1.00 (normal)
#
# All methods are static.

class_name ButtonFeedback
extends RefCounted

const HOVER_SCALE: float = 1.05
const PRESSED_SCALE: float = 0.95
const NORMAL_SCALE: float = 1.0

const HOVER_BRIGHTNESS: float = 1.15
const PRESSED_BRIGHTNESS: float = 0.85
const NORMAL_BRIGHTNESS: float = 1.0

const ANIM_DURATION: float = 0.1


# Attaches feedback to a single button.
# `with_sound` toggles the hover / click SFX.
static func attach(button: BaseButton, with_sound: bool = true) -> void:
	if button == null:
		return

	# Set the pivot to the center so scaling looks correct.
	button.resized.connect(func():
		if button is Control:
			button.pivot_offset = button.size / 2.0
	)
	if button is Control:
		button.pivot_offset = button.size / 2.0

	# Hover in.
	button.mouse_entered.connect(func():
		if with_sound:
			AudioManager.play_hover_sfx()
		_tween(button, HOVER_SCALE, HOVER_BRIGHTNESS)
	)

	# Hover out.
	button.mouse_exited.connect(func():
		_tween(button, NORMAL_SCALE, NORMAL_BRIGHTNESS)
	)

	# Pressed (mouse down).
	button.button_down.connect(func():
		_tween(button, PRESSED_SCALE, PRESSED_BRIGHTNESS)
	)

	# Released (mouse up).
	button.button_up.connect(func():
		_tween(button, HOVER_SCALE, HOVER_BRIGHTNESS)
	)


# Attaches feedback to every BaseButton found in the subtree of `root`.
# Returns the number of buttons wired.
static func attach_all(root: Node, with_sound: bool = true) -> int:
	if root == null:
		return 0

	var count: int = 0
	for child in root.get_children():
		if child is BaseButton:
			attach(child, with_sound)
			count += 1
		count += attach_all(child, with_sound)
	return count


# Internal: animates the button's scale and modulate.
static func _tween(button: BaseButton, target_scale: float, target_brightness: float) -> void:
	if button == null or not (button is Control):
		return

	var control: Control = button

	# Kill any previous tween attached to this button.
	if control.has_meta("_button_feedback_tween"):
		var previous: Tween = control.get_meta("_button_feedback_tween")
		if previous != null and previous.is_valid():
			previous.kill()

	var tween: Tween = control.create_tween()
	tween.set_parallel(true)
	tween.tween_property(control, "scale", Vector2(target_scale, target_scale), ANIM_DURATION)
	tween.tween_property(control, "modulate", Color(target_brightness, target_brightness, target_brightness, 1.0), ANIM_DURATION)

	control.set_meta("_button_feedback_tween", tween)
