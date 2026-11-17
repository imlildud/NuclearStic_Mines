# ==============================================================
# ===================== BOARD VIEWPORT =========================
# ==============================================================
# Calculates which board tiles are inside the camera view, so the
# TileRenderer only draws those (+ a margin ring) instead of the
# whole board on every refresh().
#
# Camera facts this relies on (read from the user's files):
# - Game.tscn has a Camera2D with no zoom set (zoom = 1,1) and
#   position smoothing on; Game.gd moves it to the player tile.
# - The board is centred at the origin: tile (x, y) spans
#   [x * TILE_SIZE - half, (x + 1) * TILE_SIZE - half) in the
#   TileRenderer's local space, half = board_size * TILE_SIZE / 2.
# - The range is computed with renderer.to_local(), so it still
#   works if the Board node is ever moved off the origin.

class_name BoardViewport
extends RefCounted

# Extra ring of tiles drawn around the camera view.
const DEFAULT_MARGIN: int = 2
const MIN_MARGIN: int = 0
const MAX_MARGIN: int = 4


# Returns the tile range to draw, as a Rect2i where position is
# the first tile (inclusive) and size is the tile count per axis.
# Falls back to the full board when there is no camera yet
# (scene just loading, no current camera, zero-size viewport),
# so drawing never goes blank because of a missing camera.
static func visible_range(renderer: Node2D, board_size: int, tile_size: int, margin: int = DEFAULT_MARGIN) -> Rect2i:
	var full := Rect2i(0, 0, board_size, board_size)
	if board_size <= 0 or tile_size <= 0:
		return full

	var viewport: Viewport = null
	var camera: Camera2D = null
	if renderer != null:
		viewport = renderer.get_viewport()
		if viewport != null:
			camera = viewport.get_camera_2d()
	if camera == null or viewport == null:
		return full

	var view_size: Vector2 = viewport.get_visible_rect().size
	if view_size == Vector2.ZERO:
		return full
	var zoom: Vector2 = camera.zoom
	if zoom.x == 0.0 or zoom.y == 0.0:
		return full

	# Half of what the camera sees, in world pixels.
	var half_view := Vector2(view_size.x / absf(zoom.x), view_size.y / absf(zoom.y)) * 0.5
	var center: Vector2 = camera.get_screen_center_position()
	return visible_range_for_world_rect(
		renderer, board_size, tile_size,
		center - half_view, center + half_view, margin
	)


# Same as visible_range(), but from an explicit world-space rect.
# Kept separate so the math can be reasoned about (and tested)
# without a live camera: pass the two world corners of the view.
static func visible_range_for_world_rect(renderer: Node2D, board_size: int, tile_size: int, top_left_world: Vector2, bottom_right_world: Vector2, margin: int = DEFAULT_MARGIN) -> Rect2i:
	var full := Rect2i(0, 0, board_size, board_size)
	if board_size <= 0 or tile_size <= 0 or renderer == null:
		return full

	var clamped_margin: int = clampi(margin, MIN_MARGIN, MAX_MARGIN)
	var half_board: float = (board_size * tile_size) / 2.0
	var top_left_local: Vector2 = renderer.to_local(top_left_world)
	var bottom_right_local: Vector2 = renderer.to_local(bottom_right_world)

	# Tile (x, y) starts at local (x * tile_size - half_board, ...).
	var min_x: int = floori((top_left_local.x + half_board) / tile_size) - clamped_margin
	var min_y: int = floori((top_left_local.y + half_board) / tile_size) - clamped_margin
	var max_x: int = floori((bottom_right_local.x + half_board) / tile_size) + clamped_margin
	var max_y: int = floori((bottom_right_local.y + half_board) / tile_size) + clamped_margin

	min_x = maxi(0, min_x)
	min_y = maxi(0, min_y)
	max_x = mini(board_size - 1, max_x)
	max_y = mini(board_size - 1, max_y)

	if min_x > max_x or min_y > max_y:
		return full
	return Rect2i(min_x, min_y, max_x - min_x + 1, max_y - min_y + 1)


# How many tiles a range draws (for the math check in the notes).
static func tiles_in_range(tile_range: Rect2i) -> int:
	return tile_range.size.x * tile_range.size.y
