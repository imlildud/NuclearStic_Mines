# ==============================================================
# ========================= BOARD ==============================
# ==============================================================
# Board container. Holds the TileLayer and exposes helpers to
# convert tile coordinates to world coordinates.
#
# TILE_SIZE matches the size that TileRenderer draws at.
#
# NOTE: The actual `_draw()` is in TileRenderer.gd (child of TileLayer).
# Use `refresh()` to trigger a redraw, NOT `queue_redraw()` (that
# would only redraw Board, which has no _draw() implementation).

extends Node2D

const TILE_SIZE: int = 90

@onready var tile_layer: Node2D = $TileLayer


# Sets the board data and initializes the renderer for the zone.
func set_board(board: Array) -> void:
	var zone: String = GameManager.config.get("zone", "backyard")
	tile_layer.init_renderer(zone)
	tile_layer.set_board(board)
	tile_layer.set_player(GameManager.player)
	tile_layer.queue_redraw()


# Updates the player reference (call after the player moves).
func update_player() -> void:
	tile_layer.set_player(GameManager.player)


# Forces a redraw of the tile layer (TileRenderer).
func refresh() -> void:
	tile_layer.queue_redraw()


# Converts a (x, y) tile coordinate to a world position (pixel).
# The board is centered at the origin of this node.
func tile_to_world(tile_pos: Vector2i) -> Vector2:
	var board_size: int = GameManager.board.size()
	var half: float = (board_size * TILE_SIZE) / 2.0
	return Vector2(
		tile_pos.x * TILE_SIZE - half + TILE_SIZE / 2.0,
		tile_pos.y * TILE_SIZE - half + TILE_SIZE / 2.0
	)


# Returns the tile size in pixels.
func get_tile_size() -> int:
	return TILE_SIZE
