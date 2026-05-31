// ==============================================================
// =================== TUTORIAL CONTROLLER ======================
// ==============================================================
// Handles tutorial board generation with fixed maps.
// Extends BaseBoardController and overrides generation methods
// to provide pre-designed boards for each tutorial phase.

import { BaseBoardController } from "./base/BaseBoardController.js";

export class TutorialController extends BaseBoardController {
    
    constructor(player) {
        super(player);
        this.currentPhase = 0;
        this.isProcedural = false;
    }
    
    // ===================== TUTORIAL PHASE BOARDS ======================
    
    getMovementBoard() {
        const size = 5;
        const board = this.createEmptyBoard(size);
        
        board[4][0].setStart(true);
        board[0][4].setFlaggoal(true);
        board[0][4].setSecure(true);
        
        board[1][1].setObstacletype("natural");
        board[1][2].setObstacletype("natural");
        board[1][3].setObstacletype("natural");
        board[1][4].setObstacletype("natural");
        board[3][0].setObstacletype("natural");
        board[3][1].setObstacletype("natural");
        board[0][2].setObstacletype("natural");
        
        return board;
    }
    
    getHazardBoard() {
        const size = 5;
        const board = this.createEmptyBoard(size);
        
        board[4][2].setStart(true);
        board[0][2].setFlaggoal(true);
        board[0][2].setSecure(true);
        
        board[2][2].setHazardtype("cactus");
        this._setHazardCountAround(board, 2, 2);
        
        board[2][0].setObstacletype("natural");
        board[2][4].setObstacletype("natural");
        
        return board;
    }
    
    getFlaggedBoard() {
        const size = 5;
        const board = this.createEmptyBoard(size);
        
        board[4][2].setStart(true);
        board[0][4].setFlaggoal(true);
        board[0][4].setSecure(true);
        
        board[0][0].setHazardtype("cactus");
        this._setHazardCountAround(board, 0, 0);
        board[0][2].setHazardtype("cactus");
        this._setHazardCountAround(board, 0, 2);
        board[2][1].setHazardtype("cactus");
        this._setHazardCountAround(board, 2, 1);
        board[2][3].setHazardtype("cactus");
        this._setHazardCountAround(board, 2, 3);
        
        board[4][3].setObstacletype("natural");
        board[4][4].setObstacletype("natural");
        
        return board;
    }
    
    getFlaggedBoard2() {
        const size = 5;
        const board = this.createEmptyBoard(size);
        
        board[4][0].setStart(true);
        board[0][4].setFlaggoal(true);
        board[0][4].setSecure(true);
        
        board[0][0].setHazardtype("mine");
        this._setHazardCountAround(board, 0, 0);
        board[1][1].setHazardtype("mine");
        this._setHazardCountAround(board, 1, 1);
        board[2][2].setHazardtype("mine");
        this._setHazardCountAround(board, 2, 2);
        board[3][3].setHazardtype("mine");
        this._setHazardCountAround(board, 3, 3);
        board[4][4].setHazardtype("mine");
        this._setHazardCountAround(board, 4, 4);
        
        return board;
    }
    
    getRescueBoard() {
        const size = 5;
        const board = this.createEmptyBoard(size);
        
        board[4][2].setStart(true);
        board[0][3].setGoaltype("dummie");
        board[0][3].setSecure(true);
        
        board[0][1].setHazardtype("mine");
        this._setHazardCountAround(board, 0, 1);
        board[2][2].setHazardtype("mine");
        this._setHazardCountAround(board, 2, 2);
        board[3][4].setHazardtype("mine");
        this._setHazardCountAround(board, 3, 4);
        board[4][4].setHazardtype("mine");
        this._setHazardCountAround(board, 4, 4);
        
        return board;
    }
    
    // ======================= PRIVATE HELPERS =======================
    
    _setHazardCountAround(board, x, y) {
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
    
    revealAllTiles(board) {
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                board[i][j].setHide(false);
            }
        }
    }
    
    hideAllTiles(board) {
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                const tile = board[i][j];
                if (!tile.isStart() && tile.getGoaltype() === "none" && !tile.isFlaggoal()) {
                    tile.setHide(true);
                }
            }
        }
    }
    
    // ======================= OVERRIDDEN METHODS =======================
    
    generateBoard(size) {
        switch(this.currentPhase) {
            case 1: return this.getMovementBoard();
            case 2: return this.getHazardBoard();
            case 3: return this.getFlaggedBoard();
            case 4: return this.getFlaggedBoard2();
            case 5: return this.getRescueBoard();
            default: return this.getMovementBoard();
        }
    }
    
    generateStartAndGoal(board, numGoals, level) { return board; }
    setSafeTiles(board, size) { return board; }
    generateHeights(board, level, size) { return board; }
    generateObstacles(board, level, size) { return board; }
    generateHazards(board, totalHazards, level, size) { return board; }
    trackHazardCount(board, size) { return board; }
    
    updateVision(board, character) {
        this.revealAllTiles(board);
    }
    
    updateVisionAroundPlayer(board, character) {
        this.updateVision(board, character);
    }
    
    regenerateHazards(board, totalHazards, level, size) { return board; }
    resetHazardCount(board) { return board; }
    
    // ======================= HELPER METHODS =======================
    
    loadDifficulty() { return 5; }
    loadNumberOfHazard() { return 0; }
    loadNumberOfGoals() { return 1; }
    loadTypeOfZone() { return "backyard"; }
}