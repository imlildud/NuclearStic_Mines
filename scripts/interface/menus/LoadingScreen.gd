# ==============================================================
# ===================== LOADING SCREEN =========================
# ==============================================================
# Shown by SceneTransition only when the target scene takes longer
# than LOADING_GRACE to load. Cover art background + radio with a
# bubble showing game tips, no effects (no pulse, no typewriter,
# tips just swap). Tips come from the locale files
# ("loading.tips"), English list below as fallback.

extends Control

const TIP_INTERVAL: float = 4.0

const FALLBACK_TIPS: Array[String] = [
	"Revealed tiles show how many hazards hide next to them. Count carefully.",
	"Flags neutralize hazards. Chef flags them automatically.",
	"Rescue every Wanted Pal, then bring them back to the shelter.",
	"Press R to rewind time if you carry the Reversion keychain.",
	"Mountains block your line of sight. Use them as cover.",
	"Falling from high ground hurts. Watch the terrain height.",
	"Treasure tiles hide keychain bundles. You can equip up to 5.",
	"Mommy grows stronger with every pal she rescues.",
]

@onready var _tip_label: Label = $Bottom/TipBubble/TipLabel
@onready var _loading_label: Label = $LoadingLabel

var _tips: Array = []
var _tip_index: int = 0
var _timer: Timer


func _ready() -> void:
	_loading_label.text = _get_text("loading.loading", "Loading...")
	_tips = _load_tips()
	_tips.shuffle()
	_show_tip()
	_timer = Timer.new()
	_timer.wait_time = TIP_INTERVAL
	_timer.autostart = true
	_timer.timeout.connect(_on_tip_timeout)
	add_child(_timer)


func _load_tips() -> Array:
	var strings = LocaleManager.get("strings")
	if strings is Dictionary and strings.has("loading"):
		var loading = strings["loading"]
		if loading is Dictionary and loading.has("tips"):
			var tips = loading["tips"]
			if tips is Array and not tips.is_empty():
				return tips.duplicate()
	return FALLBACK_TIPS.duplicate()


func _show_tip() -> void:
	if _tips.is_empty():
		return
	_tip_label.text = str(_tips[_tip_index % _tips.size()])


func _on_tip_timeout() -> void:
	_tip_index += 1
	_show_tip()


func _get_text(key: String, fallback: String) -> String:
	var result = LocaleManager.get_translation(key)
	if result is String and result != "" and result != key:
		return result
	return fallback
