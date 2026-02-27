export class Renderer {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.game = game;

        this.camera = { x: 0, y: 0 };
        this.TILE_SIZE = 70;

        this.images = {};
        this.biome = game.getBiome ? game.getBiome() : "desert";

        this.loadImages();

        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    resize() {
        const size = this.canvas.clientHeight;
        this.canvas.width = size;
        this.canvas.height = size;
    }

    loadImages() {
        const biomePath = `../assets/sprites/tiles/${this.biome}`;
        const globalPath = `../assets/sprites/tiles`;
        const charPath = `../assets/sprites/characters`;

        const biomeTextures = [
            "tile",
            "mountain1",
            "mountain2",
            "mountain3",
            "mountain4",
            "hide",
            "natural",
            "pit",
            "river"
        ];

        const globalTextures = [
            "mine",
            "radioactive",
            "cactus",
            "flagged",
            "marked",
            "toxic",
            "1","2","3","4","5","6","7","8","9"
        ];

        const characterTextures = [
            "chef",
            "mosquito",
            "mommy",
            "scout",
            "charlie",
            "joni",
            "ru"
        ];

        const load = (name, path) => {
            const img = new Image();
            img.src = `${path}/${name}.png`;
            this.images[name] = img;
        };

        biomeTextures.forEach(name => load(name, biomePath));
        globalTextures.forEach(name => load(name, globalPath));
        characterTextures.forEach(name => load(name, charPath));
    }

    render() {
        const board = this.game.getBoard();
        const player = this.game.getPlayer();
        if (!board || !player) return;

        const ctx = this.ctx;
        const TILE_SIZE = this.TILE_SIZE;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.camera.x = player.getPosX() * TILE_SIZE - this.canvas.width / 2 + TILE_SIZE / 2;
        this.camera.y = player.getPosY() * TILE_SIZE - this.canvas.height / 2 + TILE_SIZE / 2;

        for (let x = 0; x < board.length; x++) {
            for (let y = 0; y < board.length; y++) {

                const tile = board[x][y];
                const drawX = x * TILE_SIZE - this.camera.x;
                const drawY = y * TILE_SIZE - this.camera.y;

                const height = tile.getTileheight();

                const elevationOffset = height * 12; 

                // ───────── LAYER 0: BASE ─────────
                if (height === 0) {
                    this.safeDraw("tile", drawX, drawY, TILE_SIZE);
                } else {
                    const scaleMap = {
                        1: 1.15,
                        2: 1.35,
                        3: 1.55,
                        4: 1.75
                    };

                    const scale = scaleMap[height] || 1;
                    const newSize = TILE_SIZE * scale;
                    const offsetX = newSize - TILE_SIZE;
                    const offsetY = newSize - TILE_SIZE;

                    this.mountainDraw(
                        "mountain" + height,
                        drawX - offsetX,
                        drawY - offsetY,
                        newSize
                    );
                }

                // ───────── LAYER 1: HAZARD ─────────
                const hazard = tile.getHazardtype();
                if (hazard !== "none" && !tile.isHide()) {
                    this.safeDraw(
                        hazard,
                        drawX - elevationOffset,
                        drawY - elevationOffset,
                        TILE_SIZE
                    );
                }

                // ───────── LAYER 2: OBSTACLE ─────────
                const obstacle = tile.getObstacletype();
                if (obstacle !== "none" && !tile.isHide()) {
                    this.safeDraw(
                        obstacle,
                        drawX - elevationOffset,
                        drawY - elevationOffset,
                        TILE_SIZE
                    );
                }

                // ───────── LAYER 3: HAZARD COUNT ─────────
                const count = tile.getHazardcount();
                if (
                    count > 0 &&
                    !tile.isHide() &&
                    obstacle === "none" &&
                    hazard === "none"
                ) {
                    this.safeDraw(
                        String(count),
                        drawX - elevationOffset,
                        drawY - elevationOffset,
                        TILE_SIZE
                    );
                }

                // ───────── LAYER 4: COVER ─────────
                if (tile.isHide()) {
                    const height = tile.getTileheight();
                    
                    if (height === 0) {
                        this.safeDraw(
                            "hide",
                            drawX,
                            drawY,
                            TILE_SIZE
                        );
                    } else {
                        const scaleMap = {
                            1: 1.20,
                            2: 1.40,
                            3: 1.60,
                            4: 1.80
                        };

                        const scale = scaleMap[height] || 1;
                        const newSize = TILE_SIZE * scale;
                        const offsetX = newSize - TILE_SIZE;
                        const offsetY = newSize - TILE_SIZE;

                        this.safeDraw(
                            "hide",
                            drawX - offsetX,
                            drawY - offsetY,
                            newSize
                        );
                    }
                }

                // ───────── LAYER 5: DAMAGE RATIO ─────────
                if (tile.getDamageratio()) {
                    this.safeDraw(
                        "toxic",
                        drawX - elevationOffset,
                        drawY - elevationOffset,
                        TILE_SIZE
                    );
                }

                // ───────── LAYER 6: FLAG ─────────
                const flagHeight = TILE_SIZE * 1.3;
                if (tile.isFlagged() || tile.isMarked()) {
                    this.safeDraw(
                        "flagged",
                        drawX - elevationOffset,
                        drawY - elevationOffset - (flagHeight - TILE_SIZE),
                        TILE_SIZE
                    );
                }

                // ───────── LAYER 7: GOALS ─────────
                const goalHeight = TILE_SIZE * 1.3;
                if (tile.getGoaltype() !== "none") {
                    this.safeDraw(
                        tile.getGoaltype(),
                        drawX - elevationOffset,
                        drawY - elevationOffset - (goalHeight - TILE_SIZE),
                        TILE_SIZE
                    );
                }

                // ───────── LAYER 8: PLAYER ─────────
                 const playerHeight = TILE_SIZE * 1.2;
                if (player.getPosX() === x && player.getPosY() === y) {
                    this.safeDraw(
                        player.getType(),
                        drawX - elevationOffset,
                        drawY - elevationOffset - (playerHeight - TILE_SIZE),
                        TILE_SIZE
                    );
                }
            }
        }
    }

    safeDraw(name, x, y, size) {
        const img = this.images[name];
        if (!img) return;
        if (!img.complete || img.naturalWidth === 0) return;

        this.ctx.drawImage(img, x, y, size, size);
    }

    mountainDraw(name, x, y, size) {
        const img = this.images[name];
        if (!img) return;
        if (!img.complete || img.naturalWidth === 0) return;

        this.ctx.drawImage(img, x, y, size, size);
    }
}