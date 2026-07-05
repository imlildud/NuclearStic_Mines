// ==============================================================
// ==================== LEVEL CONFIGURATOR =======================
// ==============================================================
// Handles board configuration and level setup

import { DifficultyScaler } from "./DifficultyScaler.js";

export class LevelConfigurator {
    
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    configure(game) {
        let size, pals, hazardAmount, hazardIntensity, heightIntensity, obstacleIntensity, zone, childLevel;
        const config = game.config;
        const player = game.player;
        const boardCtrl = game.boardCtrl;
        const charCtrl = game.charCtrl;
        const currentLevel = game.currentLevel;
        const isHardcore = game.isHardcoreEnabled();
        
        // ===== TUTORIAL MODE =====
        if (config.mode === "tutorial") {
            game.board = boardCtrl.generateBoard(5);
            charCtrl.getStartCoords(game.board);
            boardCtrl.updateVision(game.board, player);
            return;
        }

        // ===== TEST MODE =====
        if (config.mode === "test") {
            game.board = boardCtrl.generateBoard(24);
            charCtrl.getStartCoords(game.board);
            boardCtrl.updateVision(game.board, player);
            return;
        }
        
        // ===== LEGACY MODE =====
        if (config.mode === "legacy") {
            if (isHardcore) {
                size = 12 + currentLevel;
                pals = DifficultyScaler.getPalCount(currentLevel) + 4;
                hazardAmount = DifficultyScaler.getHazardCountBySize(size);
                hazardIntensity = config.hazards;
                heightIntensity = config.obstacles;
                obstacleIntensity = config.obstacles;
                zone = config.zone;
                childLevel = currentLevel;
            } else {
                size = DifficultyScaler.getBoardSize(currentLevel);
                hazardAmount = DifficultyScaler.getHazardCount(currentLevel);
                pals = DifficultyScaler.getPalCount(currentLevel);
                heightIntensity = currentLevel;
                obstacleIntensity = currentLevel;
                zone = DifficultyScaler.getZoneByLevel(currentLevel);
                childLevel = currentLevel;
            }
        }
        // ===== CUSTOM / DAILY MODE =====
        else {
            size = config.size;
            pals = config.pals;
            hazardAmount = DifficultyScaler.getHazardCountBySize(size);
            hazardIntensity = config.hazards;
            heightIntensity = config.obstacles;
            obstacleIntensity = config.obstacles;
            zone = config.zone;
            childLevel = 10;
        }
        
        // Generate board
        game.board = boardCtrl.generateBoard(size);
        if (config.seed) {
            boardCtrl.setSeed(config.seed);
            console.log(`[GameManager] Setting board seed: ${config.seed}`);
        }
        game.board = boardCtrl.generateStartAndPal(game.board, pals, childLevel);
        game.board = boardCtrl.setSafeTiles(game.board, size);
        game.board = boardCtrl.generateHeights(game.board, heightIntensity, size);
        game.board = boardCtrl.generateObstacles(game.board, obstacleIntensity, size);
        game.board = boardCtrl.generateHazards(game.board, hazardAmount, hazardIntensity, size);
        game.board = boardCtrl.trackHazardCount(game.board, size);
        
        if (config.mode === "legacy") {
            game.board = boardCtrl.generateTreasures(game.board, size);
        }
        
        charCtrl.setCharacterPals(pals);
        charCtrl.getStartCoords(game.board);
        boardCtrl.updateVision(game.board, player);
        
        // Debug
        console.log("========== GAME CONFIGURATION ==========");
        console.log(`Mode: ${config.mode}`);
        console.log(`Seed: ${config.seed}`);
        console.log(`Size: ${size}`);
        console.log(`Pals: ${pals}`);
        console.log(`Hazard Amount: ${hazardAmount}`);
        console.log(`Zone: ${zone}`);
        console.log(`Character: ${config.character}`);
        console.log("========================================");
    }
}