// ==============================================================
// ===================== TEST CONTROLLER ========================
// ==============================================================
// Handles a test board generation with a fixed map.
// Extends BaseBoardController and overrides generation methods
// to provide pre-designed boards for each tutorial phase.

import { BaseBoardController } from "./base/BaseBoardController.js";

export class TestController extends BaseBoardController {
    
    constructor(player) {
        super(player);
        this.isProcedural = false;
    }
    
    // ===================== GENERATE BOARD ======================
    
    generateBoard(boardSize) {
        return this.getTestBoard();
    }
    
    // ===================== TEST BOARD ======================
    
    getTestBoard() {
        const size = 24;
        const board = this.createEmptyBoard(size);
        
        board[12][0].setStart(true);

        // Test row 1 (Heights)
        board[1][3].setTileheight(1);
        board[2][3].setTileheight(2);
        board[3][3].setTileheight(3);
        board[4][3].setTileheight(4);

        // Test row 2 (Natural)
        board[0][5].setObstacletype("natural");
        board[1][5].setObstacletype("natural");
        board[2][5].setObstacletype("natural");
        board[3][5].setObstacletype("natural");
        board[4][5].setObstacletype("natural");

        board[1][5].setTileheight(1);
        board[2][5].setTileheight(2);
        board[3][5].setTileheight(3);
        board[4][5].setTileheight(4);

        // Test row 3 (River)
        board[0][7].setObstacletype("river");
        board[1][7].setObstacletype("river");
        board[2][7].setObstacletype("river");
        board[3][7].setObstacletype("river");
        board[4][7].setObstacletype("river");

        board[1][7].setTileheight(1);
        board[2][7].setTileheight(2);
        board[3][7].setTileheight(3);
        board[4][7].setTileheight(4);

        // Test row 4 (Pit)
        board[0][9].setObstacletype("pit");
        board[1][9].setObstacletype("pit");
        board[2][9].setObstacletype("pit");
        board[3][9].setObstacletype("pit");
        board[4][9].setObstacletype("pit");

        board[1][9].setTileheight(1);
        board[2][9].setTileheight(2);
        board[3][9].setTileheight(3);
        board[4][9].setTileheight(4);

        // Test row 5 (Safe Pit)
        board[0][11].setObstacletype("safepit");
        board[1][11].setObstacletype("safepit");
        board[2][11].setObstacletype("safepit");
        board[3][11].setObstacletype("safepit");
        board[4][11].setObstacletype("safepit");

        board[1][11].setTileheight(1);
        board[2][11].setTileheight(2);
        board[3][11].setTileheight(3);
        board[4][11].setTileheight(4);

        // Test row 6 (Flags)
        board[0][13].setFlagged(true);
        board[1][13].setMarked(true);
        board[2][13].setJumpflagged(true);
        board[3][13].setFlaggoal(true);

        // Test row 7 (Goals)
        board[1][16].setGoaltype("charlie");
        board[3][16].setGoaltype("joni");
        board[2][17].setGoaltype("ru");

        // Test row 8 (Hazards)
        board[6][3].setHazardtype("mine");
        board[6][5].setTileheight(1);
        board[6][5].setHazardtype("mine");
        board[6][7].setTileheight(2);
        board[6][7].setHazardtype("mine");
        board[6][9].setTileheight(3);
        board[6][9].setHazardtype("mine");
        board[6][11].setTileheight(4);
        board[6][11].setHazardtype("mine");

        board[8][3].setHazardtype("cactus");
        board[8][5].setTileheight(1);
        board[8][5].setHazardtype("cactus");
        board[8][7].setTileheight(2);
        board[8][7].setHazardtype("cactus");
        board[8][9].setTileheight(3);
        board[8][9].setHazardtype("cactus");
        board[8][11].setTileheight(4);
        board[8][11].setHazardtype("cactus");

        board[10][3].setHazardtype("pipe");
        board[10][5].setTileheight(1);
        board[10][5].setHazardtype("pipe");
        board[10][7].setTileheight(2);
        board[10][7].setHazardtype("pipe");
        board[10][9].setTileheight(3);
        board[10][9].setHazardtype("pipe");
        board[10][11].setTileheight(4);
        board[10][11].setHazardtype("pipe");

        board[12][3].setHazardtype("radioactive");
        board[12][5].setTileheight(1);
        board[12][5].setHazardtype("radioactive");
        board[12][7].setTileheight(2);
        board[12][7].setHazardtype("radioactive");
        board[12][9].setTileheight(3);
        board[12][9].setHazardtype("radioactive");
        board[12][11].setTileheight(4);
        board[12][11].setHazardtype("radioactive");

        // Test row 9 (Hazard count)
        board[5][16].setHazardcount(1);
        board[6][16].setHazardcount(2);
        board[7][16].setHazardcount(3);
        board[8][16].setHazardcount(4);
        board[9][16].setHazardcount(5);
        board[10][16].setHazardcount(6);
        board[11][16].setHazardcount(7);
        board[12][16].setHazardcount(8);
        board[13][16].setHazardcount(9);

        // Test row 10 (Radius effects)
        this.applyRadiusEffect(board, 17, 4, "setHide", true);
        this.applyRadiusEffect(board, 17, 8, "setSmoke", true);
        this.applyRadiusEffect(board, 17, 12, "setDamageratio", true);
        
        return board;
    }
    
    // Helper method to apply radius effect (8 directions)
    applyRadiusEffect(board, x, y, method, value) {
        const boardSize = board.length;
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, 1], [-1, -1], [1, 1], [1, -1]
        ];
        
        board[x][y][method](value);
        
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
                board[nx][ny][method](value);
            }
        }
    }
    
    // ======================= REQUIRED OVERRIDES =======================
    
    generateStartAndGoal(board, numGoals, level) { 
        return board; 
    }
    
    setSafeTiles(board, size) { 
        return board; 
    }
    
    generateHeights(board, level, size) { 
        return board; 
    }
    
    generateObstacles(board, level, size) { 
        return board; 
    }
    
    generateHazards(board, totalHazards, level, size) { 
        return board; 
    }
    
    trackHazardCount(board, size) { 
        return board; 
    }
    
    // ======================= HELPER METHODS =======================

    updateVision(board, character) {
        this.revealAllTiles(board);
    }

    updateVisionAroundPlayer(board, character) {
        this.revealAllTiles(board);
    }

    revealAllTiles(board) {
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                board[i][j].setHide(false);
            }
        }
    }
    
    loadDifficulty() { return 24; }
    loadNumberOfHazard() { return 0; }
    loadNumberOfGoals() { return 3; }
    loadTypeOfZone() { return "backyard"; }
}