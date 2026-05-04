export class Renderer {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.game = game;

        this.camera = { x: 0, y: 0 };
        this.TILE_SIZE = 90;

        this.images = {};
        this.zone = game.getZone ? game.getZone() : "desert"

        this.loadImages();

        this.resize();
        window.addEventListener("resize", () => this.resize());
        this.heightOffsetCache = new Map();

        this.justMoved = false;
        this.isScoutJump = false;
        this.justMovedFrames = 0;
    }

    getCachedHeightOffset(height, tileSize) {
        const key = `${height}_${tileSize}`;
        if (this.heightOffsetCache.has(key)) {
            return this.heightOffsetCache.get(key);
        }
    
        let result = { offsetX: 0, offsetY: 0, size: tileSize };
    
        if (height > 0) {
            const scaleMap = { 1: 1.15, 2: 1.35, 3: 1.55, 4: 1.75 };
            const scale = scaleMap[height] || 1;
            const size = tileSize * scale;
            result = {
                offsetX: size - tileSize,
                offsetY: size - tileSize,
                size: size
            };
        }
    
        this.heightOffsetCache.set(key, result);
        return result;
    }

    resize() {
        const board = this.game.getBoard();
        if (!board) return;
    
        const boardSize = board.length;
    
        const rect = this.canvas.getBoundingClientRect();
        const canvasSize = Math.min(rect.width, rect.height);
    
        this.canvas.width = canvasSize;
        this.canvas.height = canvasSize;
        this.TILE_SIZE = Math.floor(this.canvas.width / 7);
        this.TILE_SIZE = Math.max(12, Math.min(100, this.TILE_SIZE));
    }
    
    loadImages() {
        const biomePath = `../assets/sprites/tiles/${this.zone}`;
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
            "start",
            "mine",
            "radioactive",
            "cactus",
            "flagged",
            "jumpflag",
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

                let offsetX = 0, offsetY = 0, spriteSize = TILE_SIZE;
            
                if (height > 0) {
                    const mountainScaleMap = {
                        1: 1.15,
                        2: 1.35,
                        3: 1.55,
                        4: 1.75
                    };
                    const scale = mountainScaleMap[height] || 1;
                    spriteSize = TILE_SIZE * scale;
                    offsetX = spriteSize - TILE_SIZE;
                    offsetY = spriteSize - TILE_SIZE;
                }

            // ───────── LAYER 0: BASE / MOUNTAIN ─────────
            if (height === 0) {
                this.safeDraw("tile", drawX, drawY, TILE_SIZE);
            } else {
                this.mountainDraw(
                    "mountain" + height,
                    drawX - offsetX,
                    drawY - offsetY,
                    spriteSize
                );
            }

            // ───────── LAYER 1: HAZARD ─────────
            const hazard = tile.getHazardtype();
            if (hazard !== "none" && !tile.isHide()) {
                this.safeDraw(
                    hazard,
                    drawX - offsetX,
                    drawY - offsetY,
                    spriteSize
                );
            }

            // ───────── LAYER 2: OBSTACLE ─────────
            const obstacle = tile.getObstacletype();
            if (obstacle !== "none" && !tile.isHide()) {
                this.safeDraw(
                    obstacle,
                    drawX - offsetX,
                    drawY - offsetY,
                    spriteSize
                );
            }

            // ───────── LAYER 3: HAZARD COUNT ─────────
            const count = tile.getHazardcount();
            if (count > 0 && !tile.isHide() && obstacle === "none" && hazard === "none") {
                this.safeDraw(
                    String(count),
                    drawX - offsetX,
                    drawY - offsetY,
                    spriteSize
                );
            }

            // ───────── LAYER 4: COVER (HIDE) ─────────
            if (tile.isHide()) {
                if (height === 0) {
                    this.safeDraw("hide", drawX, drawY, TILE_SIZE);
                } else {
                    const hideScaleMap = {
                        1: 1.15,
                        2: 1.3,
                        3: 1.5,
                        4: 1.6
                    };
        
                    const hideScale = hideScaleMap[height] || 1;
                    const hideSize = TILE_SIZE * hideScale;
        
                    const extraOffset = 4;
                    const hideOffsetX = (hideSize - TILE_SIZE) + extraOffset;
                    const hideOffsetY = (hideSize - TILE_SIZE) + extraOffset;
        
                    this.safeDraw(
                        "hide",
                        drawX - hideOffsetX,
                        drawY - hideOffsetY,
                        hideSize
                    );
                }
            }

            // ───────── LAYER 5: DAMAGE RATIO ─────────
            if (tile.getDamageratio()) {
                this.safeDraw(
                    "toxic",
                    drawX - offsetX,
                    drawY - offsetY,
                    spriteSize
                );
            }

            // ───────── LAYER 6: FLAG / MARKED ─────────
            if (tile.isMarked()) {
                const flagHeight = spriteSize * 1.3;
                this.safeDraw(
                    "marked",
                    drawX - offsetX,
                    drawY - offsetY - (flagHeight - spriteSize),
                    spriteSize
                );
            } else if (tile.isFlagged()) {
                const flagHeight = spriteSize * 1.3;
                this.safeDraw(
                    "flagged",
                    drawX - offsetX,
                    drawY - offsetY - (flagHeight - spriteSize),
                    spriteSize
                );
            } else if (tile.isJumpflagged()){
                const flagHeight = spriteSize * 1.3;
                this.safeDraw(
                    "jumpflag",
                    drawX - offsetX,
                    drawY - offsetY - (flagHeight - spriteSize),
                    spriteSize
                );
            }

            // ───────── LAYER 7: START ─────────
            if (tile.isStart()) {
                this.safeDraw(
                    "start",
                    drawX - offsetX,
                    drawY - offsetY,
                    spriteSize
                );
            }

            // ───────── LAYER 7.5: GOALS ─────────
            const goalType = tile.getGoaltype();
            if (goalType !== "none") {
                const shouldDraw = (goalType !== "joni") || (goalType === "joni" && !tile.isHide());
                if (shouldDraw) {
                    const goalHeight = spriteSize * 1.3;
                    this.safeDraw(
                        goalType,
                        drawX - offsetX,
                        drawY - offsetY - (goalHeight - spriteSize),
                        spriteSize
                    );
                }
            }

            // ───────── LAYER 8: PLAYER ─────────
            if (player.getPosX() === x && player.getPosY() === y) {
                const playerHeight = spriteSize * 1.2;
                const img = this.images[player.getType()];

                if (img && img.complete && img.naturalWidth !== 0) {
                    let drawPlayerX = drawX - offsetX;
                    let drawPlayerY = drawY - offsetY - (playerHeight - spriteSize);
        
                    if (this.justMoved && this.justMovedFrames > 0) {
                    ctx.save();
            
                        const centerX = drawPlayerX + spriteSize / 2;
                        const centerY = drawPlayerY + spriteSize / 2;
            
                        const progress = 1 - (this.justMovedFrames / 12);
            
                        let yOffset = 0;
                        let tilt = 0;
                        
                        const isScoutJump = this.isScoutJump || false;
            
                        if (isScoutJump) {
                            if (progress < 0.5) {

                                const liftProgress = progress / 0.5;
                                tilt = -Math.PI / 2 * liftProgress;
                                yOffset = -liftProgress * 25;
                            } else {
                                const dropProgress = (progress - 0.5) / 0.5;
                                tilt = -Math.PI / 2 * (1 - dropProgress); // -90° → 0°
                                yOffset = -25 * (1 - dropProgress);
                            }
                        } else {
                            if (progress < 0.5) {
                                const liftProgress = progress / 0.5;
                                yOffset = -liftProgress * 40;
                                tilt = liftProgress * 0.3;
                            } else {
                                const dropProgress = (progress - 0.3) / 0.5;
                                yOffset = -40 * (1 - dropProgress);
                                tilt = 0.3 * (1 - dropProgress);
                            }
                        }
            
                        ctx.translate(centerX, centerY + yOffset);
                        ctx.rotate(tilt);
                        ctx.drawImage(img, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
                        ctx.restore();
            
                        this.justMovedFrames--;
                        if (this.justMovedFrames <= 0) {
                            this.justMoved = false;
                            this.isScoutJump = false;
                        }
                    } else {
                        ctx.drawImage(img, drawPlayerX, drawPlayerY, spriteSize, spriteSize);
                    }
                }
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