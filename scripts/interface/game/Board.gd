# ==============================================================
# ========================= BOARD ==============================
# ==============================================================

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


# Forces a redraw of the tile layer.
func refresh() -> void:
	tile_layer.queue_redraw()


# Converts a (x, y) tile coordinate to a world position (pixel).
func tile_to_world(tile_pos: Vector2i) -> Vector2:
	var board_size: int = GameManager.board.size()
	var half: float = (board_size * TILE_SIZE) / 2.0
	return Vector2(
		tile_pos.x * TILE_SIZE - half + TILE_SIZE / 2.0,
		tile_pos.y * TILE_SIZE - half + TILE_SIZE / 2.0
	)


func get_tile_size() -> int:
	return TILE_SIZE
