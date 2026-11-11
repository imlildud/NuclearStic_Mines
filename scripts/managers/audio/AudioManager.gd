# ==============================================================
# ====================== AUDIO MANAGER =========================
# ==============================================================
# Handles all sound effects and music playback.
# Provides volume control, looping, and prevents audio spam.
#
# AUTOLOAD: Available as `AudioManager` from any scene.
# SFX are pooled in a small set of AudioStreamPlayer nodes to
# avoid creating/destroying players on every call.

extends Node

# ======================= STATE =======================

var sfx_enabled: bool = true
var music_volume: float = 0.5
var sfx_volume: float = 0.3

var current_music: AudioStreamPlayer = null
var music_started: bool = false

# Trackers for looping animation sounds
var is_score_animating: bool = false
var is_write_animating: bool = false
var score_audio: AudioStreamPlayer = null
var text_audio: AudioStreamPlayer = null

# Players reused for short SFX (avoids spam and allocation)
var _move_audio: AudioStreamPlayer = null
var _flag_audio: AudioStreamPlayer = null

# Pool of generic SFX players
var _sfx_pool: Array[AudioStreamPlayer] = []
const SFX_POOL_SIZE: int = 8
var _sfx_pool_index: int = 0


# ======================= LIFECYCLE =======================

# Creates the SFX pool and the music player once at startup.
func _ready() -> void:
	for _i in range(SFX_POOL_SIZE):
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_sfx_pool.append(p)

	current_music = AudioStreamPlayer.new()
	current_music.bus = "Master"
	add_child(current_music)


# ======================= SFX METHODS =======================

# Enable or disable all sound effects.
# When disabled, every playing SFX is stopped immediately.
func set_sfx_enabled(enabled: bool) -> void:
	sfx_enabled = enabled
	if not enabled:
		stop_all_sfx()


# Set SFX volume (0.0 to 1.0). Updates every currently playing SFX.
func set_sfx_volume(volume: float) -> void:
	sfx_volume = clampf(volume, 0.0, 1.0)
	for p in _sfx_pool:
		if p.playing:
			p.volume_db = linear_to_db(sfx_volume)


# Set music volume (0.0 to 1.0). Updates the current music in real time.
func set_music_volume(volume: float) -> void:
	music_volume = clampf(volume, 0.0, 1.0)
	if current_music != null:
		current_music.volume_db = linear_to_db(music_volume)


# Play a sound effect. Returns the player used, or null if disabled.
# `loop` keeps the sound playing until explicitly stopped.
# `volume` overrides the current SFX volume for this sound only.
func play_sfx(sound_file: String, loop: bool = false, volume: float = -1.0) -> AudioStreamPlayer:
	if not sfx_enabled:
		return null
	if sfx_volume <= 0.0:
		return null

	var vol: float = volume if volume >= 0.0 else sfx_volume
	var path: String = "res://assets/audio/sfx/%s" % sound_file
	var stream: AudioStream = load(path)
	if stream == null:
		push_warning("SFX not found: " + path)
		return null

	var player: AudioStreamPlayer = _get_pooled_sfx_player()
	player.stream = stream
	player.volume_db = linear_to_db(vol)
	player.play()

	# For looping sounds, the caller keeps the player reference.
	if loop:
		return player
	return null


# Stop all currently playing SFX (music is not affected).
func stop_all_sfx() -> void:
	for p in _sfx_pool:
		if p.playing:
			p.stop()
	if score_audio != null:
		score_audio.stop()
		score_audio = null
	if text_audio != null:
		text_audio.stop()
		text_audio = null
	_move_audio = null
	_flag_audio = null


# Stop all audio, including music.
func stop_all_audio() -> void:
	stop_all_sfx()
	if current_music != null:
		current_music.stop()
	current_music = null
	music_started = false


# Play movement sound. Prevents spam if the previous move sound
# is still playing.
func play_move_sfx() -> void:
	if _move_audio != null and _move_audio.playing:
		return
	_move_audio = play_sfx("move.mp3", false, 0.5)


# Play flag placement sound.
func play_flag_sfx() -> void:
	_flag_audio = play_sfx("flag.mp3", false, 0.5)


# Play death sound.
func play_death_sfx() -> void:
	if not sfx_enabled or sfx_volume <= 0.0:
		return
	play_sfx("death.mp3", false, 0.5)


# Play rescue sound (when picking up a child).
func play_rescue_sfx() -> void:
	if not sfx_enabled or sfx_volume <= 0.0:
		return
	play_sfx("rescued.mp3", false, 0.4)


# Play rewind sound (when using Reversion).
func play_rewind_sfx() -> void:
	if not sfx_enabled or sfx_volume <= 0.0:
		return
	play_sfx("rewind.mp3", false, 0.4)


# Play deliver sound (when delivering children to the start).
func play_deliver_sfx() -> void:
	if not sfx_enabled or sfx_volume <= 0.0:
		return
	play_sfx("deliver.mp3", false, 0.4)


# Play hurt sound (when taking damage).
func play_hurt_sfx() -> void:
	if not sfx_enabled or sfx_volume <= 0.0:
		return
	play_sfx("hurt.mp3", false, 0.4)


# Play armor hurt sound (when Mommy takes damage).
func play_hurt_metal_sfx() -> void:
	if not sfx_enabled or sfx_volume <= 0.0:
		return
	play_sfx("hurtMetal.mp3", false, 0.4)


# Play crunch sound (when stepping on a nest).
func play_crunch_sfx() -> void:
	if not sfx_enabled or sfx_volume <= 0.0:
		return
	play_sfx("crunch.mp3", false, 0.35)


# Play hover sound for UI buttons.
func play_hover_sfx() -> void:
	if not sfx_enabled or sfx_volume <= 0.0:
		return
	play_sfx("hover.mp3", false, 0.2)


# Play click sound for UI buttons.
func play_click_sfx() -> void:
	if not sfx_enabled or sfx_volume <= 0.0:
		return
	play_sfx("active.mp3", false, 0.3)


# Play grade reveal sound.
func play_grade_sfx() -> void:
	if not sfx_enabled or sfx_volume <= 0.0:
		return
	play_sfx("grade.mp3", false, 0.5)


# Start the looping score animation sound.
func start_score_animation_sfx() -> void:
	if is_score_animating:
		return
	if not sfx_enabled or sfx_volume <= 0.0:
		return
	is_score_animating = true
	score_audio = play_sfx("score.mp3", true, 0.3)


# Stop the score animation sound.
func stop_score_animation_sfx() -> void:
	if score_audio != null:
		score_audio.stop()
		score_audio = null
	is_score_animating = false


# Start the looping text animation sound.
func start_write_animation_sfx() -> void:
	if is_write_animating:
		return
	is_write_animating = true
	text_audio = play_sfx("writing.mp3", true, 0.3)


# Stop the text animation sound.
func stop_write_animation_sfx() -> void:
	if text_audio != null:
		text_audio.stop()
		text_audio = null
	is_write_animating = false


# ======================= MUSIC METHODS =======================

# Load and play the music for the given zone.
# `auto_start` begins playback immediately (requires user interaction
# on some platforms, but desktop Godot plays right away).
func play_music(zone: String, auto_start: bool = false) -> void:
	_stop_current_music()

	var music_file: String = ""
	match zone:
		"desert":     music_file = "desert.mp3"
		"snow":       music_file = "snow.mp3"
		"scrapland":  music_file = "scrapland.mp3"
		"roots":      music_file = "roots.mp3"
		"glowyland":  music_file = "glowyland.mp3"
		"ash":        music_file = "ash.mp3"
		"backyard":   music_file = "backyard.mp3"
		_:            return

	var path: String = "res://assets/audio/music/%s" % music_file
	var stream: AudioStream = load(path)
	if stream == null:
		push_warning("Music not found: " + path)
		return

	current_music.stream = stream
	current_music.volume_db = linear_to_db(music_volume)

	if auto_start:
		start_music()


# Start playing the current music.
func start_music() -> void:
	if music_started:
		return
	if current_music != null and current_music.stream != null:
		current_music.play()
		music_started = true


# Stop music and reset it.
func stop_music() -> void:
	if current_music != null:
		current_music.stop()
	music_started = false


# Pause music without resetting its position.
func pause_music() -> void:
	if current_music != null:
		current_music.stream_paused = true


# Resume paused music.
func resume_music() -> void:
	if current_music != null and music_started:
		current_music.stream_paused = false


# ======================= MENU MUSIC =======================

# Load and optionally play the menu music.
func play_menu_music(auto_start: bool = false) -> void:
	_stop_current_music()

	var stream: AudioStream = load("res://assets/audio/music/menu.mp3")
	if stream == null:
		push_warning("Menu music not found")
		return

	current_music.stream = stream
	current_music.volume_db = linear_to_db(music_volume)

	if auto_start:
		start_music()


# ======================= CONFIG MUSIC =======================

# Load and optionally play the configuration menu music.
func play_config_music(auto_start: bool = false) -> void:
	_stop_current_music()

	var stream: AudioStream = load("res://assets/audio/music/configs.mp3")
	if stream == null:
		push_warning("Config music not found")
		return

	current_music.stream = stream
	current_music.volume_db = linear_to_db(music_volume)

	if auto_start:
		start_music()


# ======================= UTILITY =======================

# Returns true if music is currently playing.
func is_music_playing() -> bool:
	return music_started and current_music != null and current_music.playing


# Force-update every volume. Useful after loading settings.
func update_all_volumes() -> void:
	for p in _sfx_pool:
		if p.playing:
			p.volume_db = linear_to_db(sfx_volume)
	if current_music != null and current_music.playing:
		current_music.volume_db = linear_to_db(music_volume)


# ======================= INTERNAL HELPERS =======================

# Returns the next available SFX player from the pool (round-robin).
func _get_pooled_sfx_player() -> AudioStreamPlayer:
	var player: AudioStreamPlayer = _sfx_pool[_sfx_pool_index]
	_sfx_pool_index = (_sfx_pool_index + 1) % SFX_POOL_SIZE
	return player


# Stops and resets the current music so a new one can play.
func _stop_current_music() -> void:
	if current_music != null:
		current_music.stop()
		current_music.stream = null
	music_started = false
