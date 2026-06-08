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
    
    // ===================== TEST BOARD ======================
    
    getTestBoard() {
        const size = 20;
        const board = this.createEmptyBoard(size);
        
        board[0][0].setStart(true);

        // Test row 1 (Heights)
        board[3][1].setTileheight(1);
        board[3][2].setTileheight(2);
        board[3][3].setTileheight(3);
        board[3][4].setTileheight(4);

        // Test row 2 (Natural)
        board[5][0].setObstacletype("natural");
        board[5][1].setObstacletype("natural");
        board[5][2].setObstacletype("natural");
        board[5][3].setObstacletype("natural");
        board[5][4].setObstacletype("natural");

        board[5][1].setTileheight(1);
        board[5][2].setTileheight(2);
        board[5][3].setTileheight(3);
        board[5][4].setTileheight(4);

        // Test row 3 (River)
        board[7][0].setObstacletype("river");
        board[7][1].setObstacletype("river");
        board[7][2].setObstacletype("river");
        board[7][3].setObstacletype("river");
        board[7][4].setObstacletype("river");

        board[7][1].setTileheight(1);
        board[7][2].setTileheight(2);
        board[7][3].setTileheight(3);
        board[7][4].setTileheight(4);

        // Test row 4 (Pit)
        board[9][0].setObstacletype("pit");
        board[9][1].setObstacletype("pit");
        board[9][2].setObstacletype("pit");
        board[9][3].setObstacletype("pit");
        board[9][4].setObstacletype("pit");

        board[9][1].setTileheight(1);
        board[9][2].setTileheight(2);
        board[9][3].setTileheight(3);
        board[9][4].setTileheight(4);

        // Test row 5 (Safe Pit)
        board[11][0].setObstacletype("safepit");
        board[11][1].setObstacletype("safepit");
        board[11][2].setObstacletype("safepit");
        board[11][3].setObstacletype("safepit");
        board[11][4].setObstacletype("safepit");

        board[11][1].setTileheight(1);
        board[11][2].setTileheight(2);
        board[11][3].setTileheight(3);
        board[11][4].setTileheight(4);

        // Test row 6 (Flags)
        board[13][0].isFlagged(true);
        board[13][1].isMarked(true);
        board[13][2].isJumpflagged(true);
        board[13][3].isFlaggoal(true);

        // Test row 7 (Goals)
        
        // Natural obstacles (walls) forming a path
        board[1][1].setObstacletype("safepit");
        board[2][1].setObstacletype("natural");
        board[3][1].setObstacletype("natural");
        board[4][1].setObstacletype("natural");
        board[0][3].setObstacletype("natural");
        board[1][3].setObstacletype("natural");
        board[2][3].setObstacletype("natural");
        
        return board;
    }
    
    // ======================= HELPER METHODS =======================
    
    loadDifficulty() { return 5; }
    loadNumberOfHazard() { return 0; }
    loadNumberOfGoals() { return 1; }
    loadTypeOfZone() { return "backyard"; }
}