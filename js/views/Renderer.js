// ==============================================================
// ======================== RENDERER ============================
// ==============================================================
// Handles all game rendering including tiles, hazards, obstacles,
// flags, characters, and animations. Manages camera following,
// sprite loading, and visual effects.

import { PathResolver } from "../utils/PathResolver.js";

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
            const scaleMap = { 
                1: 1.05, 
                2: 1.08, 
                3: 1.10, 
                4: 1.12  
            };
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
        if (!board || board.length === 0) {
            setTimeout(() => this.resize(), 100);
            return;
        }
        
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
        const biomePath = `../assets/sprites/tiles/${this.zone}`;
        const globalPath = `../assets/sprites/tiles`;
        const charPath = `../assets/sprites/characters`;
        
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
            "nest",          // Nest hazard
            "nest_marked",
            "nest_open",
            "radioactive",   // Radioactive hazard
            "cactus",        // Cactus hazard
            "flagged",       // Flag marker
            "flaggoal",      // Goal
            "jumpflag",      // Jump flag (Scout ability)
            "marked",        // Marked hazard (Chef ability)
            "treasure",      // X
            "toxic",         // Damage radius indicator
            "smoke",         // Smoke radius
            "spikes_off",     // Spike obstacle
            "spikes_prepared", 
            "spikes_on",       
            "1","2","3","4","5","6","7","8","9","?"  // Hazard count numbers
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
            const fullPath = path ? `${path}/${name}.png` : `${globalPath}/${name}.png`;
            img.src = fullPath;
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
                
                // Base mountain dimensions and offsets
                let mountainOffsetX = 0, mountainOffsetY = 0, mountainSize = TILE_SIZE;
                
                if (height > 0) {
                    const mountainScaleMap = {
                        1: 1.15,
                        2: 1.35,
                        3: 1.55,
                        4: 1.75
                    };
                    const scale = mountainScaleMap[height] || 1;
                    mountainSize = TILE_SIZE * scale;
                    mountainOffsetX = mountainSize - TILE_SIZE;
                    mountainOffsetY = mountainSize - TILE_SIZE;
                }

                // Upper elements dimensions and custom fine-tuned offsets
                let objOffsetX = 0;
                let objOffsetY = 0;
                let objSize = TILE_SIZE;

                if (height > 0) {
                    const objectScaleMap = { 
                        1: 1.1, 
                        2: 1.18, 
                        3: 1.28, 
                        4: 1.38  
                    };
                    const scale = objectScaleMap[height] || 1;
                    objSize = TILE_SIZE * scale;

                    const pushRatioX = { 1: 0.15, 2: 0.30, 3: 0.50, 4: 0.68 }; 
                    const pushRatioY = { 1: 0.13, 2: 0.31, 3: 0.51, 4: 0.70 }; 

                    objOffsetX = TILE_SIZE * (pushRatioX[height] || 0);
                    objOffsetY = TILE_SIZE * (pushRatioY[height] || 0);
                }
                
                // ===== LAYER 0: BASE / MOUNTAIN =====
                if (height === 0) {
                    this.safeDraw("tile", drawX, drawY, TILE_SIZE);
                } else {
                    this.mountainDraw(
                        "mountain" + height,
                        drawX - mountainOffsetX,
                        drawY - mountainOffsetY,
                        mountainSize
                    );
                }
                
                // ===== LAYER 1: HAZARD =====
                const hazard = tile.getHazardtype();
                if (hazard !== "none" && !tile.isHide()) {
                    this.safeDraw(
                        hazard,
                        drawX - objOffsetX,
                        drawY - objOffsetY,
                        objSize
                    );
                }
                
                // ===== LAYER 2: OBSTACLE =====
                const obstacle = tile.getObstacletype();
                if (obstacle !== "none" && !tile.isHide()) {
                    
                    // ===== SPIKE SPECIAL RENDERING =====
                    if (obstacle === "spikes") {
                        const spikeState = tile.getSpikeState(); // "off" | "prepared" | "on"
                        let spriteName = "spikes_off"; // fallback
                        
                        if (spikeState === "prepared") {
                            spriteName = "spikes_prepared";
                        } else if (spikeState === "on") {
                            spriteName = "spikes_on";
                        } else {
                            spriteName = "spikes_off";
                        }
                        
                        this.safeDraw(
                            spriteName,
                            drawX - objOffsetX,
                            drawY - objOffsetY,
                            objSize
                        );
                    } else {
                        // Normal obstacle rendering (natural, river, pit, safepit)
                        this.safeDraw(
                            obstacle,
                            drawX - objOffsetX,
                            drawY - objOffsetY,
                            objSize
                        );
                    }
                }
                
                // ===== LAYER 3: HAZARD COUNT =====
                const count = tile.getHazardcount();
                if (count > 0 && !tile.isHide() && obstacle === "none" && hazard === "none") {
                    this.safeDraw(
                        String(count),
                        drawX - objOffsetX,
                        drawY - objOffsetY,
                        objSize
                    );
                }
                
                // ===== LAYER 4: COVER (HIDE) =====
                if (tile.isHide()) {
                    if (height === 0) {
                        this.safeDraw("hide", drawX, drawY, TILE_SIZE);
                    } else {
                        this.safeDraw(
                            "hide",
                            drawX - objOffsetX,
                            drawY - objOffsetY,
                            objSize
                        );
                    }
                }

                // ===== LAYER 4.5: COVER MARKERS =====
                if (tile.haveTreasure()) {
                    this.safeDraw(
                        "treasure",
                        drawX - objOffsetX,
                        drawY - objOffsetY,
                        objSize
                    );
                }
                
                
                // ===== LAYER 5: DAMAGE RATIO (Toxic radius) =====
                if (tile.getDamageratio()) {
                    this.safeDraw(
                        "toxic",
                        drawX - objOffsetX,
                        drawY - objOffsetY,
                        objSize
                    );
                }
                
                // ===== LAYER 6: FLAG / MARKED =====
                if (tile.isMarked() && tile.getHazardtype() === "nest" && !tile.isSmoke()) {
                    const flagHeight = objSize * 1.3;
                    this.safeDraw(
                        "nest_marked",
                        drawX - objOffsetX,
                        drawY - objOffsetY - (flagHeight - objSize),
                        objSize
                    );
                }
                else if (tile.isMarked() && !tile.isSmoke()) {
                    const flagHeight = objSize * 1.3;
                    this.safeDraw(
                        "marked",
                        drawX - objOffsetX,
                        drawY - objOffsetY - (flagHeight - objSize),
                        objSize
                    );
                } else if (tile.isFlagged() && !tile.isSmoke()) {
                    const flagHeight = objSize * 1.3;
                    this.safeDraw(
                        "flagged",
                        drawX - objOffsetX,
                        drawY - objOffsetY - (flagHeight - objSize),
                        objSize
                    );
                } else if (tile.isJumpflagged() && !tile.isSmoke()) {
                    const flagHeight = objSize * 1.3;
                    this.safeDraw(
                        "jumpflag",
                        drawX - objOffsetX,
                        drawY - objOffsetY - (flagHeight - objSize),
                        objSize
                    );
                } 
                
                // ===== LAYER 7: START TILE =====
                if (tile.isStart()) {
                    this.safeDraw(
                        "start",
                        drawX - objOffsetX,
                        drawY - objOffsetY,
                        objSize
                    );
                }
                
                // ===== LAYER 7.5: GOALS (Children to rescue) =====
                const goalType = tile.getGoaltype();
                if (goalType !== "none" && !tile.isSmoke()) {
                    const shouldDraw = (goalType !== "joni") || (goalType === "joni" && !tile.isHide());
                    if (shouldDraw) {
                        const goalHeight = objSize * 1.3;
                        this.safeDraw(
                            goalType,
                            drawX - objOffsetX,
                            drawY - objOffsetY - (goalHeight - objSize),
                            objSize
                        );
                    }
                }

                // ===== LAYER 7.6: FLAGGOAL ====
                if (tile.isFlaggoal()){
                    this.safeDraw(
                        "flaggoal",
                        drawX - objOffsetX,
                        drawY - objOffsetY,
                        objSize
                    )
                }
                
                // ===== LAYER 8: PLAYER CHARACTER =====
                if (player.getPosX() === x && player.getPosY() === y && !tile.isSmoke()) {
                    const playerHeight = objSize * 1.2;
                    const img = this.images[player.getType()];
                    
                    if (img && img.complete && img.naturalWidth !== 0) {
                        let drawPlayerX = drawX - objOffsetX;
                        let drawPlayerY = drawY - objOffsetY - (playerHeight - objSize);
                        
                        // ===== MOVEMENT ANIMATION =====
                        if (this.justMoved && this.justMovedFrames > 0) {
                            ctx.save();
                            
                            const centerX = drawPlayerX + objSize / 2;
                            const centerY = drawPlayerY + objSize / 2;
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
                            
                            // ===== DAMAGE FLASH EFFECT (white flash) =====
                            if (player.isDamageFlash && player.isDamageFlash()) {
                                ctx.globalAlpha = 0.8;
                                ctx.filter = "brightness(1.8) contrast(1.1)";
                                ctx.shadowBlur = 8;
                                ctx.shadowColor = "red";
                            }
                            
                            ctx.drawImage(img, -objSize / 2, -objSize / 2, objSize, objSize);
                            ctx.restore();
                            
                            // Decrement animation counter
                            this.justMovedFrames--;
                            if (this.justMovedFrames <= 0) {
                                this.justMoved = false;
                                this.isScoutJump = false;
                            }
                        } else {
                            // Static draw (no animation)
                            // ===== DAMAGE FLASH EFFECT (white flash) =====
                            if (player.isDamageFlash && player.isDamageFlash()) {
                                ctx.save();
                                ctx.globalAlpha = 0.8;
                                ctx.filter = "brightness(1.8) contrast(1.1)";
                                ctx.shadowBlur = 8;
                                ctx.shadowColor = "white";
                                ctx.drawImage(img, drawPlayerX, drawPlayerY, objSize, objSize);
                                ctx.restore();
                            } else {
                                ctx.drawImage(img, drawPlayerX, drawPlayerY, objSize, objSize);
                            }
                        }
                    }
                }

                // ===== LAYER 9: SMOKE =====
                if (tile.isSmoke()) {
                    this.safeDraw(
                        "smoke",
                        drawX - objOffsetX,
                        drawY - objOffsetY,
                        objSize
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

    // Trigger mine explosion effect (blackout + blur recovery)
    triggerMineFlash() {
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'black';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '20000';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.15s ease';
        
        document.body.appendChild(overlay);
        
        // Apply blur to canvas
        const canvas = this.canvas;
        const originalFilter = canvas.style.filter;
        canvas.style.transition = 'filter 0.2s ease';
        canvas.style.filter = 'blur(8px) brightness(0.3)';
        
        // Blackout
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 90);
        
        // Hold blackout + blur
        setTimeout(() => {
            // Start recovery - fade out black overlay
            overlay.style.opacity = '0';
            
            // Gradually remove blur
            canvas.style.filter = 'blur(4px) brightness(0.5)';
            
            setTimeout(() => {
                canvas.style.filter = 'blur(2px) brightness(0.7)';
                
                setTimeout(() => {
                    canvas.style.filter = 'blur(1px) brightness(0.9)';
                    
                    setTimeout(() => {
                        canvas.style.filter = originalFilter || 'none';
                        canvas.style.transition = '';
                        overlay.remove();
                    }, 6000);
                }, 6000);
            }, 3000);
        }, 3000);
    }
}
