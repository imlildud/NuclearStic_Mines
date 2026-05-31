// ==============================================================
// =================== TUTORIAL CONTROLLER ======================
// ==============================================================
// Handles tutorial board generation, phase sections, vision system,
// and all grid-related game logic

import { TileModel } from "../models/TileModel.js";

export class TutorialController {
    
    // ======================= CONSTRUCTOR =======================
    
    constructor(player) {
        this.player = player;           // Reference to player character
        this.gameManager = null;        // Reference to game manager
        this.currentPhase = 0;          // Track current tutorial phase
    }
    
    // ===================== AUXILIARY METHODS ======================
    
    generateEmptyBoard(size) {
        const board = Array.from({ length: size }, () =>
            Array.from({ length: size }, () => new TileModel())
        );
        return board;
    }
    
    // Manually set hazard count for adjacent tiles
    setHazardCountAround(board, x, y) {
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, 1], [-1, -1], [1, 1], [1, -1]
        ];
        
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
                board[nx][ny].incrementHazardcount();
            }
        }
    }
    
    // ======================= VISION CONTROL =======================
    
    // Reveals the entire board (used for explanation)
    revealAllTiles(board) {
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                board[i][j].setHide(false);
            }
        }
    }
    
    // Hides all non-secure tiles (used for memorization practice)
    hideAllTiles(board) {
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                const tile = board[i][j];
                // Keep start tiles and secure zones visible
                if (!tile.isStart() && tile.getGoaltype() === "none" && !tile.isFlaggoal()) {
                    tile.setHide(true);
                }
            }
        }
    }
    
    // ======================= TUTORIAL PHASES =======================
    
    // PHASE 1: MOVEMENT TUTORIAL (Learn WASD movement)
    getMovementBoard() {
        const size = 5;
        const board = this.generateEmptyBoard(size);
        
        // Start at bottom-left corner
        board[4][0].setStart(true);
        
        // Goal (child) at top-right corner
        board[0][4].setFlaggoal(true);
        board[0][4].setSecure(true);
        
        // Natural obstacles (walls) forming a path
        board[1][1].setObstacletype("natural");
        board[1][2].setObstacletype("natural");
        board[1][3].setObstacletype("natural");
        board[1][4].setObstacletype("natural");
        board[3][0].setObstacletype("natural");
        board[3][1].setObstacletype("natural");
        board[0][2].setObstacletype("natural");
        
        return board;
    }
    
    // PHASE 2: HAZARD COUNT TUTORIAL (Learn number indicators)
    getHazardBoard() {
        const size = 5;
        const board = this.generateEmptyBoard(size);
        
        // Start at bottom center
        board[4][2].setStart(true);
        
        // Goal at top center
        board[0][2].setFlaggoal(true);
        board[0][2].setSecure(true);
        
        // Hazard (cactus) at center
        board[2][2].setHazardtype("cactus");
        this.setHazardCountAround(board, 2, 2);
        
        // Obstacles to define boundaries
        board[2][0].setObstacletype("natural");
        board[2][4].setObstacletype("natural");
        
        return board;
    }
    
    // PHASE 3: FLAG TUTORIAL (Learn to place flags)
    getFlaggedBoard() {
        const size = 5;
        const board = this.generateEmptyBoard(size);
        
        // Start at bottom center
        board[4][2].setStart(true);
        
        // Goal at top-right corner
        board[0][4].setFlaggoal(true);
        board[0][4].setSecure(true);
        
        // Hazards (cactus)
        board[0][0].setHazardtype("cactus");
        this.setHazardCountAround(board, 0, 0);
        
        board[0][2].setHazardtype("cactus");
        this.setHazardCountAround(board, 0, 2);
        
        board[2][1].setHazardtype("cactus");
        this.setHazardCountAround(board, 2, 1);
        
        board[2][3].setHazardtype("cactus");
        this.setHazardCountAround(board, 2, 3);
        
        // Obstacles
        board[4][3].setObstacletype("natural");
        board[4][4].setObstacletype("natural");
        
        return board;
    }
    
    // PHASE 4: FLAG 2 TUTORIAL (Learn to mark lethal mines)
    getFlaggedBoard2() {
        const size = 5;
        const board = this.generateEmptyBoard(size);
        
        // Start at bottom-left corner
        board[4][0].setStart(true);
        
        // Goal at top-right corner
        board[0][4].setFlaggoal(true);
        board[0][4].setSecure(true);
        
        // Lethal hazards (mines) along diagonal
        board[0][0].setHazardtype("mine");
        this.setHazardCountAround(board, 0, 0);
        
        board[1][1].setHazardtype("mine");
        this.setHazardCountAround(board, 1, 1);
        
        board[2][2].setHazardtype("mine");
        this.setHazardCountAround(board, 2, 2);
        
        board[3][3].setHazardtype("mine");
        this.setHazardCountAround(board, 3, 3);
        
        board[4][4].setHazardtype("mine");
        this.setHazardCountAround(board, 4, 4);
        
        return board;
    }
    
    // PHASE 5: RESCUE TUTORIAL (Rescue a child and return)
    getRescueBoard() {
        const size = 5;
        const board = this.generateEmptyBoard(size);
        
        // Start at bottom center
        board[4][2].setStart(true);
        
        // Goal (child to rescue)
        board[0][3].setGoaltype("dummie");
        board[0][3].setSecure(true);
        
        // Hazards (mines) along the path
        board[0][1].setHazardtype("mine");
        this.setHazardCountAround(board, 0, 1);
        
        board[2][2].setHazardtype("mine");
        this.setHazardCountAround(board, 2, 2);
        
        board[3][4].setHazardtype("mine");
        this.setHazardCountAround(board, 3, 4);
        
        board[4][4].setHazardtype("mine");
        this.setHazardCountAround(board, 4, 4);
        
        return board;
    }
    
    // ======================= GAME MANAGER REQUIRED METHODS =======================
    
    loadDifficulty() { return 5; }
    loadNumberOfHazard() { return 0; }
    loadNumberOfGoals() { return 1; }
    loadTypeOfZone() { return "backyard"; }
    
    generateBoard(size) {
        // Returns current phase board (phase 1 by default)
        return this.getMovementBoard();
    }
    
    generateStartAndGoal(board, goals, level) { return board; }
    setSafeTiles(board, size) { return board; }
    generateHeights(board, level, size) { return board; }
    generateObstacles(board, level, size) { return board; }
    generateHazards(board, totalHazards, level, size) { return board; }
    trackHazardCount(board, size) { return board; }
    
    updateVision(board, character) {
        // Tutorial reveals everything for learning purposes
        this.revealAllTiles(board);
    }
    
    updateVisionAroundPlayer(board, character) {
        this.updateVision(board, character);
    }
    
    regenerateHazards(board, totalHazards, level, size) { return board; }
    resetHazardCount(board) { return board; }
    
    setGameManager(gm) {
        this.gameManager = gm;
    }
}
