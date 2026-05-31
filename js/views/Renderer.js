// ==============================================================
// ======================== RENDERER ============================
// ==============================================================
// Handles all game rendering including tiles, hazards, obstacles,
// flags, characters, and animations. Manages camera following,
// sprite loading, and visual effects.

export class Renderer {
    
    // ======================= CONSTRUCTOR =======================
    
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.game = game;
        
        // Camera position for following the player
        this.camera = { x: 0, y: 0 };
        this.TILE_SIZE = 90;
        
        // Sprite cache
        this.images = {};
        this.zone = game.getZone ? game.getZone() : "desert";
        
        this.loadImages();
        
        // Initialize resize handler
        this.resize();
        window.addEventListener("resize", () => this.resize());
        
        // Cache for height offset calculations (performance)
        this.heightOffsetCache = new Map();
        
        // Animation state
        this.justMoved = false;
        this.isScoutJump = false;
        this.justMovedFrames = 0;
    }
    
    // ======================= HEIGHT OFFSET CACHE =======================
    
    // Get cached height offset for mountain tiles (optimization)
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
    
    // ======================= RESIZE HANDLER =======================
    
    // Handle canvas resize and recalculate tile size
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
    
    // ======================= SPRITE LOADING =======================
    
    // Load all game sprites (biome, global, and character textures)
    loadImages() {
        const biomePath = `../../assets/sprites/tiles/${this.zone}`;
        const globalPath = `../../assets/sprites/tiles`;
        const charPath = `../../assets/sprites/characters`;
        
        // Biome-specific textures (desert/snow/ash)
        const biomeTextures = [
            "tile",          // Base ground tile
            "mountain1",     // Height level 1
            "mountain2",     // Height level 2
            "mountain3",     // Height level 3
            "mountain4",     // Height level 4
            "hide",          // Hidden tile cover
            "natural",       // Natural obstacle
            "pit",           // Pit obstacle
            "safepit",       // Pit without death
            "river"          // River obstacle
        ];
        
        // Global textures (shared across all biomes)
        const globalTextures = [
            "start",         // Start tile
            "mine",          // Mine hazard
            "pipe",          // Pipe hazard
            "radioactive",   // Radioactive hazard
            "cactus",        // Cactus hazard
            "flagged",       // Flag marker
            "flaggoal",      // Goal
            "jumpflag",      // Jump flag (Scout ability)
            "marked",        // Marked hazard (Chef ability)
            "toxic",         // Damage radius indicator
            "smoke",         // Smoke radius
            "1","2","3","4","5","6","7","8","9"  // Hazard count numbers
        ];
        
        // Character and goal sprites
        const characterTextures = [
            "chef",          // Chef character
            "mosquito",      // Mosquito character
            "mommy",         // Mommy character
            "scout",         // Scout character
            "student",       // Tutorial character
            "dummie",        // Tutorial goal
            "charlie",       // Goal type
            "joni",          // Hidden goal type
            "ru"             // Goal type
        ];
        
        // Helper function to load an image
        const load = (name, path) => {
            const img = new Image();
            img.src = `${path}/${name}.png`;
            this.images[name] = img;
        };
        
        // Load all texture categories
        biomeTextures.forEach(name => load(name, biomePath));
        globalTextures.forEach(name => load(name, globalPath));
        characterTextures.forEach(name => load(name, charPath));
    }
    
    // ======================= MAIN RENDER LOOP =======================
    
    // Render the entire game board
    render() {
        const board = this.game.getBoard();
        const player = this.game.getPlayer();
        if (!board || !player) return;
        
        const ctx = this.ctx;
        const TILE_SIZE = this.TILE_SIZE;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update camera to follow player
        this.camera.x = player.getPosX() * TILE_SIZE - this.canvas.width / 2 + TILE_SIZE / 2;
        this.camera.y = player.getPosY() * TILE_SIZE - this.canvas.height / 2 + TILE_SIZE / 2;
        
        // Render each tile
        for (let x = 0; x < board.length; x++) {
            for (let y = 0; y < board.length; y++) {
                
                const tile = board[x][y];
                const drawX = x * TILE_SIZE - this.camera.x;
                const drawY = y * TILE_SIZE - this.camera.y;
                const height = tile.getTileheight();
                
                // Calculate mountain offset and size
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
                
                // ===== LAYER 0: BASE / MOUNTAIN =====
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
                
                // ===== LAYER 1: HAZARD =====
                const hazard = tile.getHazardtype();
                if (hazard !== "none" && !tile.isHide()) {
                    this.safeDraw(
                        hazard,
                        drawX - offsetX,
                        drawY - offsetY,
                        spriteSize
                    );
                }
                
                // ===== LAYER 2: OBSTACLE =====
                const obstacle = tile.getObstacletype();
                if (obstacle !== "none" && !tile.isHide()) {
                    this.safeDraw(
                        obstacle,
                        drawX - offsetX,
                        drawY - offsetY,
                        spriteSize
                    );
                }
                
                // ===== LAYER 3: HAZARD COUNT =====
                const count = tile.getHazardcount();
                if (count > 0 && !tile.isHide() && obstacle === "none" && hazard === "none") {
                    this.safeDraw(
                        String(count),
                        drawX - offsetX,
                        drawY - offsetY,
                        spriteSize
                    );
                }
                
                // ===== LAYER 4: COVER (HIDE) =====
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
                
                // ===== LAYER 5: DAMAGE RATIO (Toxic radius) =====
                if (tile.getDamageratio()) {
                    this.safeDraw(
                        "toxic",
                        drawX - offsetX,
                        drawY - offsetY,
                        spriteSize
                    );
                }
                
                // ===== LAYER 6: FLAG / MARKED =====
                if (tile.isMarked() && !tile.isSmoke()) {
                    const flagHeight = spriteSize * 1.3;
                    this.safeDraw(
                        "marked",
                        drawX - offsetX,
                        drawY - offsetY - (flagHeight - spriteSize),
                        spriteSize
                    );
                } else if (tile.isFlagged() && !tile.isSmoke()) {
                    const flagHeight = spriteSize * 1.3;
                    this.safeDraw(
                        "flagged",
                        drawX - offsetX,
                        drawY - offsetY - (flagHeight - spriteSize),
                        spriteSize
                    );
                } else if (tile.isJumpflagged() && !tile.isSmoke()) {
                    const flagHeight = spriteSize * 1.3;
                    this.safeDraw(
                        "jumpflag",
                        drawX - offsetX,
                        drawY - offsetY - (flagHeight - spriteSize),
                        spriteSize
                    );
                }
                
                // ===== LAYER 7: START TILE =====
                if (tile.isStart()) {
                    this.safeDraw(
                        "start",
                        drawX - offsetX,
                        drawY - offsetY,
                        spriteSize
                    );
                }
                
                // ===== LAYER 7.5: GOALS (Children to rescue) =====
                const goalType = tile.getGoaltype();
                if (goalType !== "none" && !tile.isSmoke()) {
                    // Joni is only visible when tile is revealed
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

                // ===== LAYER 7.6: FLAGGOAL ====
                if (tile.isFlaggoal()){
                    this.safeDraw(
                        "flaggoal",
                        drawX - offsetX,
                        drawY - offsetY,
                        spriteSize
                    )
                }
                
                // ===== LAYER 8: PLAYER CHARACTER =====
                if (player.getPosX() === x && player.getPosY() === y && !tile.isSmoke()) {
                    const playerHeight = spriteSize * 1.2;
                    const img = this.images[player.getType()];
                    
                    if (img && img.complete && img.naturalWidth !== 0) {
                        let drawPlayerX = drawX - offsetX;
                        let drawPlayerY = drawY - offsetY - (playerHeight - spriteSize);
                        
                        // ===== MOVEMENT ANIMATION =====
                        if (this.justMoved && this.justMovedFrames > 0) {
                            ctx.save();
                            
                            const centerX = drawPlayerX + spriteSize / 2;
                            const centerY = drawPlayerY + spriteSize / 2;
                            const progress = 1 - (this.justMovedFrames / 12);
                            
                            let yOffset = 0;
                            let tilt = 0;
                            const isScoutJump = this.isScoutJump || false;
                            
                            // Scout jump animation (higher arc)
                            if (isScoutJump) {
                                if (progress < 0.5) {
                                    // Ascending phase
                                    const liftProgress = progress / 0.5;
                                    tilt = -Math.PI / 2 * liftProgress;
                                    yOffset = -liftProgress * 25;
                                } else {
                                    // Descending phase
                                    const dropProgress = (progress - 0.5) / 0.5;
                                    tilt = -Math.PI / 2 * (1 - dropProgress);
                                    yOffset = -25 * (1 - dropProgress);
                                }
                            } 
                            // Normal movement animation
                            else {
                                if (progress < 0.5) {
                                    // Ascending phase
                                    const liftProgress = progress / 0.5;
                                    yOffset = -liftProgress * 40;
                                    tilt = liftProgress * 0.3;
                                } else {
                                    // Descending phase
                                    const dropProgress = (progress - 0.3) / 0.5;
                                    yOffset = -40 * (1 - dropProgress);
                                    tilt = 0.3 * (1 - dropProgress);
                                }
                            }
                            
                            // Apply transform and draw
                            ctx.translate(centerX, centerY + yOffset);
                            ctx.rotate(tilt);
                            ctx.drawImage(img, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
                            ctx.restore();
                            
                            // Decrement animation counter
                            this.justMovedFrames--;
                            if (this.justMovedFrames <= 0) {
                                this.justMoved = false;
                                this.isScoutJump = false;
                            }
                        } else {
                            // Static draw (no animation)
                            ctx.drawImage(img, drawPlayerX, drawPlayerY, spriteSize, spriteSize);
                        }
                    }
                }

                // ===== LAYER 9: SMOKE =====
                if (tile.isSmoke()) {
                    this.safeDraw(
                        "smoke",
                        drawX - offsetX,
                        drawY - offsetY,
                        spriteSize
                    );
                }
            }
        }
    }
    
    // ======================= SAFE DRAWING HELPERS =======================
    
    // Safely draw an image (checks if loaded)
    safeDraw(name, x, y, size) {
        const img = this.images[name];
        if (!img) return;
        if (!img.complete || img.naturalWidth === 0) return;
        
        this.ctx.drawImage(img, x, y, size, size);
    }
    
    // Draw mountain tile (separate method for clarity)
    mountainDraw(name, x, y, size) {
        const img = this.images[name];
        if (!img) return;
        if (!img.complete || img.naturalWidth === 0) return;
        
        this.ctx.drawImage(img, x, y, size, size);
    }
}
