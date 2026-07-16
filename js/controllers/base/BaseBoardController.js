// ==============================================================
// =================== BASE BOARD CONTROLLER ====================
// ==============================================================
// Abstract base class for all board controllers.
// Provides common methods for board generation, hazard placement,
// vision system, and hazard regeneration.
// Child classes should override generation-specific methods.

import { TileModel } from "../../models/TileModel.js";

export class BaseBoardController {
    
    // ======================= CONSTRUCTOR =======================
    
    constructor(player) {
        this.player = player;           // Reference to player character
        this.gameManager = null;        // Reference to game manager
        
        // Flag to indicate if this controller uses procedural generation
        this.isProcedural = true;
        
        // ======================= SEED SYSTEM =======================
        this.seed = null;
        this.randomGenerator = null;
    }
    
    // ======================= SEED METHODS =======================
    
    // Set seed for deterministic generation
    setSeed(seed) {
        this.seed = seed;
        this.randomGenerator = this.createSeededRandom(seed);
        console.log(`[BaseBoardController] Seed set to: ${seed}`);
    }
    
    // Create seeded pseudo-random generator (linear congruential)
    createSeededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
    
    // Get random number between 0 and 1 (uses seed if available)
    random() {
        if (this.randomGenerator) {
            return this.randomGenerator();
        }
        return Math.random();
    }
    
    // Generate random integer between min and max (inclusive)
    randInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }
    
    // ======================= ABSTRACT METHODS (Override in child classes) =======================
    
    // Generate the board (must be implemented by child classes)
    generateBoard(boardSize) {
        throw new Error("generateBoard() must be implemented by child class");
    }
    
    // Place start and goal tiles (override for custom placement)
    generateStartAndPal(board, numPals, level) {
        throw new Error("generateStartAndPal() must be implemented by child class");
    }
    
    // Set safe tiles around start and goals (override for custom logic)
    setSafeTiles(board, size) {
        throw new Error("setSafeTiles() must be implemented by child class");
    }
    
    // Generate terrain heights (override for custom height logic)
    generateHeights(board, level, size) {
        // Default: no heights
        return board;
    }
    
    // Generate obstacles (override for custom obstacle logic)
    generateObstacles(board, level, size) {
        // Default: no obstacles
        return board;
    }
    
    // Generate hazards (override for custom hazard logic)
    generateHazards(board, totalHazards, level, size) {
        // Default: no hazards
        return board;
    }
    
    // Track hazard counts (override for custom counting)
    trackHazardCount(board, size) {
        // Default: no counting
        return board;
    }
    
    // ======================= COMMON UTILITY METHODS =======================
    
    // Create empty board with TileModel instances
    createEmptyBoard(boardSize) {
        const board = Array.from({ length: boardSize }, () =>
            Array.from({ length: boardSize }, () => new TileModel())
        );
        return board;
    }
    
    // Apply radius with height check (does NOT affect higher tiles)
    applyRadiusWithHeightCheck(tile, board, x, y, method) {
        const boardSize = board.length;
        const sourceHeight = tile.getTileheight();
    
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, 1], [-1, -1], [1, 1], [1, -1], [0, 0]
        ];
    
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
                const targetTile = board[nx][ny];
                if (targetTile.getTileheight() <= sourceHeight) {
                    targetTile[method](true);
                }
            }
        }
    }
    
    // ======================= HAZARD REGENERATION (Common) =======================
    
    // Regenerate hazards after player actions (flagging, etc.)
    regenerateHazards(board, totalHazards, level, size) {
        const boardSize = size;
        const hasConcentration = this.player.hasKeychain('concentration');
        this.resetHazardCount(board, boardSize);
        let remainingHazards = 0;
        let markedHazards = 0;
        let failedFlags = 0;
        let failedJumpFlags = 0;
        
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];
                
                if (tile.getHazardtype() !== "none") {
                    // ===== NORMAL FLAG → MARKED =====
                    if (tile.isFlagged() || tile.isJumpflagged()) {
                        tile.setMarked(true);
                        tile.setFlagged(false);
                        markedHazards++;
                        
                        if (hasConcentration) {
                            this.revealConcentration(board, i, j, boardSize);
                        }
                        continue;
                    }
                    
                    // ===== SCOUT: JUMP FLAG MARKED =====
                    if (tile.isJumpflagged() && tile.isMarked()) {
                        markedHazards++;
                        continue;
                    }
                    
                    if (tile.isMarked()) {
                        markedHazards++;
                        continue;
                    }
                    
                    tile.setHazardtype("none");
                    remainingHazards++;
                }

                if (tile.isFlagged() && tile.getHazardtype() === "none") {
                    tile.setFlagged(false);
                    failedFlags++;
                }
                
                if (tile.isJumpflagged() && tile.getHazardtype() === "none" && !tile.isMarked()) {
                    failedJumpFlags++;
                }
            }
        }
        
        this.player.incrementFailedFlags(failedFlags);
        this.player.incrementJumpFailedFlags(failedJumpFlags);
        
        return this.generateHazards(board, remainingHazards, level, size);
    }
    
    // Reset hazard counts and radius flags
    resetHazardCount(board) {
        const boardSize = board.length;
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];
                tile.setHazardcount(0);
                tile.setDamageratio(false);
                tile.setSmoke(false);
                tile.setDetectionratio(false);
                if (tile.isHazardlive()) tile.setHazardlive(false);
            }
        }
        return board;
    }
    
    // ======================= VISION SYSTEM (Common) =======================
    
    // Update tile visibility based on character position
    updateVision(board, character) {
        const boardSize = board.length;
        const visionX = character.getPosX();
        const visionY = character.getPosY();
        const visionRange = character.getVision();
        
        // Hide all non-secure tiles first
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];
                
                if (tile.getPalType() === "joni") {
                    tile.setHide(true);
                } else if (!tile.isStart() && tile.getPalType() === "none" && !tile.isSecure() && !tile.isUnhideable()) {
                    tile.setHide(true);
                }
            }
        }
        
        // Reveal player's current tile
        board[visionX][visionY].setHide(false);
        
        const minX = Math.max(0, visionX - visionRange);
        const maxX = Math.min(boardSize - 1, visionX + visionRange);
        const minY = Math.max(0, visionY - visionRange);
        const maxY = Math.min(boardSize - 1, visionY + visionRange);
        
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const visible = Array.from({ length: boardSize }, () => Array(boardSize).fill(false));
        visible[visionX][visionY] = true;
        
        // Reveal in cardinal directions
        for (const [dx, dy] of directions) {
            if (board[visionX][visionY].getHazardcount() > 0) break;
            
            let x = visionX;
            let y = visionY;
            
            while (true) {
                x += dx;
                y += dy;
                
                if (x < minX || x > maxX || y < minY || y > maxY) break;
                
                const tile = board[x][y];
                if (tile.getHazardtype() !== "none") break;
                
                tile.setHide(false);
                visible[x][y] = true;
                
                if (tile.getHazardcount() > 0) break;
            }
        }
        
        // Reveal diagonal tiles
        const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        
        for (const [dx, dy] of diagonals) {
            const dx1 = visionX + dx;
            const dy1 = visionY + dy;
            if (dx1 < minX || dx1 > maxX || dy1 < minY || dy1 > maxY) continue;
            
            const cx1 = visionX + dx;
            const cy1 = visionY;
            const cx2 = visionX;
            const cy2 = visionY + dy;
            
            let canSee = true;
            
            if (cx1 >= minX && cx1 <= maxX && cy1 >= minY && cy1 <= maxY) {
                const tile1 = board[cx1][cy1];
                if (!visible[cx1][cy1] || tile1.getHazardcount() > 0) canSee = false;
                if (tile1.getHazardtype() !== "none") canSee = false;
                if (tile1.getObstacletype() !== "none") canSee = false;
                if (tile1.getTileheight() > board[visionX][visionY].getTileheight()) canSee = false;
            }
            
            if (cx2 >= minX && cx2 <= maxX && cy2 >= minY && cy2 <= maxY) {
                const tile2 = board[cx2][cy2];
                if (!visible[cx2][cy2] || tile2.getHazardcount() > 0) canSee = false;
                if (tile2.getHazardtype() !== "none") canSee = false;
                if (tile2.getObstacletype() !== "none") canSee = false;
                if (tile2.getTileheight() > board[visionX][visionY].getTileheight()) canSee = false;
            }
            
            if (canSee) {
                board[dx1][dy1].setHide(false);
            }
        }
    }
    
    // Alternative vision update (used after player movement)
    updateVisionAroundPlayer(board, character) {
        const boardSize = board.length;
        const visionX = character.getPosX();
        const visionY = character.getPosY();
        const visionRange = character.getVision();

        const minX = Math.max(0, visionX - visionRange);
        const maxX = Math.min(boardSize - 1, visionX + visionRange);
        const minY = Math.max(0, visionY - visionRange);
        const maxY = Math.min(boardSize - 1, visionY + visionRange);

        const hasVision = character.hasKeychain('vision');
        const hasHorizon = character.hasKeychain('horizon');
        const hasTopography = character.hasKeychain('topography');
        const maxHeightDiff = hasTopography ? 2 : 1;

        // Hide all non-secure tiles in range first
        for (let i = minX; i <= maxX; i++) {
            for (let j = minY; j <= maxY; j++) {
                const tile = board[i][j];

                if (tile.isUnhideable()){
                    tile.setHide(false);
                    continue;
                }

                if (hasHorizon && tile.getObstacletype() === "natural") {
                    tile.setHide(false);
                    continue;
                }

                if (!tile.isStart() && tile.getPalType() === "none" && !tile.isSecure()) {
                    if (!hasVision){
                        tile.setHide(true);
                    }
                }
            }
        }

        const playerTile = board[visionX][visionY];
        const playerHeight = playerTile.getTileheight();
        const playerHazardCount = playerTile.getHazardcount();

        if (playerHazardCount > 0) {
            playerTile.setHide(false);
            return;
        }

        playerTile.setHide(false);

        // Reveal in cardinal directions with height blocking
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dx, dy] of directions) {
            let x = visionX;
            let y = visionY;
            let heightBlocked = false;

            while (true) {
                x += dx;
                y += dy;
                if (x < minX || x > maxX || y < minY || y > maxY) break;

                const tile = board[x][y];
                
                // ===== TOPOGRAPHY: Allow seeing up to 2 levels above =====
                if (tile.getTileheight() > playerHeight + maxHeightDiff) {
                    heightBlocked = true;
                    break;
                }
                if (tile.getHazardtype() !== "none") break;
                if (tile.isUnhideable()){
                    tile.setHide(false);
                    continue;
                }
                if (hasHorizon && tile.getObstacletype() === "natural") {
                    tile.setHide(false);
                } else {
                    tile.setHide(false);
                }

                if (tile.getHazardcount() > 0) break;
            }
            if (heightBlocked) continue;
        }

        // Reveal diagonal tiles
        if (visionRange >= 2) {
            const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            for (const [dx, dy] of diagonals) {
                const diagX = visionX + dx;
                const diagY = visionY + dy;
                if (diagX < minX || diagX > maxX || diagY < minY || diagY > maxY) continue;

                const card1X = visionX + dx;
                const card1Y = visionY;
                const card2X = visionX;
                const card2Y = visionY + dy;

                let canSee = true;

                if (card1X >= minX && card1X <= maxX && card1Y >= minY && card1Y <= maxY) {
                    const tile1 = board[card1X][card1Y];
                    if (tile1.isHide() || tile1.getHazardcount() > 0 ||
                        tile1.getHazardtype() !== "none" ||
                        tile1.getTileheight() > playerHeight + maxHeightDiff) {
                        canSee = false;
                    }
                } else {
                    canSee = false;
                }

                if (canSee && card2X >= minX && card2X <= maxX && card2Y >= minY && card2Y <= maxY) {
                    const tile2 = board[card2X][card2Y];
                    if (tile2.isHide() || tile2.getHazardcount() > 0 ||
                        tile2.getHazardtype() !== "none" ||
                        tile2.getTileheight() > playerHeight + maxHeightDiff) {
                        canSee = false;
                    }
                } else if (canSee) {
                    canSee = false;
                }

                if (canSee) {
                    const diagTile = board[diagX][diagY];
                    if (diagTile.getTileheight() > playerHeight + maxHeightDiff){
                        canSee = false;
                    }
                }

                if (canSee){
                    const diagTile = board[diagX][diagY];

                    if (diagTile.isUnhideable()){
                        diagTile.setHide(false);
                    } else if (hasHorizon && diagTile.getObstacletype() === "natural") {
                        diagTile.setHide(false);
                    } else {
                        diagTile.setHide(false);
                    }
                }
            }
        }
    }

    // ===== CONCENTRATION HELPER =====
    revealConcentration(board, x, y, size) {
        const directions = [
            [-1,-1], [-1,0], [-1,1],
            [0,-1],  [0,0],  [0,1],
            [1,-1],  [1,0],  [1,1]
        ];

        let revealedCount = 0;
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                const tile = board[nx][ny];
                
                const hazardType = tile.getHazardtype();
                if (hazardType !== "none") {
                    console.log(`[Concentration] Skipping (${nx},${ny}) - has hazard: ${hazardType}`);
                    continue;
                }
                
                tile.setUnhideable(true);
                tile.setHide(false);
                revealedCount++;
            }
        }
        
        return revealedCount;
    }
    
    // ======================= GAME MANAGER SETTER =======================
    
    setGameManager(gm) {
        this.gameManager = gm;
    }
}
