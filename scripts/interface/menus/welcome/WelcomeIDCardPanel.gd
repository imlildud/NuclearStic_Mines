# ==============================================================
# ================= WELCOME ID CARD PANEL ======================
# ==============================================================
# Panel that shows the player's ID Card with stats.
# Emits `play_pressed`, `edit_pressed`, `delete_pressed`.

extends Control

signal play_pressed
signal edit_pressed
signal delete_pressed

const ICONS_PATH := "res://assets/hud/menu/icons/icon%d.png"
const BADGES_PATH := "res://assets/hud/badges/%s"

@onready var avatar_image: TextureRect = $AvatarImage
@onready var edit_button: TextureButton = $EditButton
@onready var name_label: Label = $NameLabel
@onready var level_label: Label = $LevelLabel
@onready var rank_badge: TextureRect = $RankBadge
@onready var rank_bar_bg: ColorRect = $RankBarBg
@onready var rank_bar_fill: ColorRect = $RankBarFill
@onready var rank_text: Label = $RankText
@onready var legacy_badge: TextureRect = $LegacyBadge
@onready var record_label: Label = $RecordLabel
@onready var streak_frame: TextureRect = $StreakFrame
@onready var streak_fire: TextureRect = $StreakFire
@onready var streak_number: Label = $StreakNumber
@onready var hardcore_frame: TextureRect = $HardcoreFrame
@onready var hardcore_label: Label = $HardcoreLabel
@onready var daily_record_frame: TextureRect = $DailyRecordFrame
@onready var daily_record_label: Label = $DailyRecordLabel
@onready var play_button: Button = $PlayButton
@onready var delete_button: Button = $DeleteButton


func _ready() -> void:
	play_button.pressed.connect(func(): play_pressed.emit())
	delete_button.pressed.connect(func(): delete_pressed.emit())
	edit_button.pressed.connect(func(): edit_pressed.emit())
	play_button.mouse_entered.connect(func(): AudioManager.play_hover_sfx())
	delete_button.mouse_entered.connect(func(): AudioManager.play_hover_sfx())
	ButtonFeedback.attach_all(self)


# Refreshes the ID Card with the current save data.
# If `animate_points` is true, animates the rank bar / total from
# the stored "old total points" to the current total.
func refresh(username: String, avatar_id: int, animate_points: bool = false) -> void:
	var legacy_level: int = SaveManager.get_legacy_level()
	var legacy_high: int = SaveManager.get_legacy_high_score()
	var daily_streak: int = SaveManager.get_daily_streak()
	var hardcore_high: int = SaveManager.get_hardcore_high_score()
	var daily_record: int = SaveManager.get_daily_record()

	var is_hardcore: bool = SaveManager.is_hardcore_enabled()
	var total_points: int = RankManager.get_total_points(is_hardcore)
	var rank_data: Dictionary = RankManager.get_rank_data(total_points, is_hardcore)

	avatar_image.texture = load(ICONS_PATH % avatar_id)
	name_label.text = username
	level_label.text = "%d" % legacy_level

	var rank_file: String = "rank_%s.png" % rank_data["rank"].to_lower()
	rank_badge.texture = load(BADGES_PATH % rank_file)
	rank_bar_fill.size.x = rank_bar_bg.size.x * (rank_data["percent"] / 100.0)
	rank_text.text = "%s / %s" % [RankManager.format_number(total_points), RankManager.format_number(rank_data["max"])]

	legacy_badge.texture = load(BADGES_PATH % _get_legacy_badge(legacy_high))
	record_label.text = str(legacy_high)

	streak_number.text = str(daily_streak)
	streak_fire.texture = load(BADGES_PATH % _get_daily_fire_image(daily_streak))

	hardcore_label.text = str(hardcore_high)
	daily_record_label.text = str(daily_record)

	if animate_points:
		_animate_points_delta(is_hardcore)


# Animates the rank display from the stored "old" total to the
# current total, then syncs the old value so it doesn't replay.
func _animate_points_delta(is_hardcore: bool) -> void:
	var old_points: int = RankManager.get_old_total_points(is_hardcore)
	var new_points: int = RankManager.get_total_points(is_hardcore)

	if old_points == new_points:
		# Nothing to animate (e.g. no delta), but keep old value in sync.
		RankManager.sync_old_total_points(is_hardcore)
		return

	RankManager.animate_total_points(
		old_points,
		new_points,
		is_hardcore,
		rank_badge,
		rank_bar_fill,
		rank_bar_bg,
		rank_text,
		func() -> void:
			# Once the animation is done, sync old -> new so the next
			# return to the menu doesn't replay the same delta.
			RankManager.sync_old_total_points(is_hardcore)
	)


func _get_legacy_badge(level: int) -> String:
	if level <= 5:  return "paper.png"
	if level <= 10: return "cardboard.png"
	if level <= 20: return "telegram.png"
	if level <= 30: return "bronze.png"
	if level <= 40: return "silver.png"
	if level <= 50: return "gold.png"
	return "platinum.png"


func _get_daily_fire_image(streak: int) -> String:
	if streak <= 0:   return "fire0.png"
	if streak <= 6:   return "fire1.png"
	if streak <= 13:  return "fire2.png"
	if streak <= 29:  return "fire3.png"
	if streak <= 179: return "fire4.png"
	return "fire5.png"
