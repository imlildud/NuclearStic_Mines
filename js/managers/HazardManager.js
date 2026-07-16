// ==============================================================
// ==================== HAZARD MANAGER ===========================
// ==============================================================
// Handles hazard regeneration

import { DifficultyScaler } from "./DifficultyScaler.js";

export class HazardManager {
    
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    regenerate(game) {
        console.log("Regenerating hazards - Rescued:" + game.player.getRescued());
        let hazardAmount, hazardIntensity, size;
        
        const config = game.config;
        const player = game.player;
        const boardCtrl = game.boardCtrl;
        const currentLevel = game.currentLevel;
        const isHardcore = game.isHardcoreEnabled();
        
        if (config.mode === "legacy") {
            if (isHardcore) {
                size = config.size;
                hazardIntensity = config.hazards;
                hazardAmount = DifficultyScaler.getHazardCountBySize(size);
                console.log(`[Hardcore Regen] Size: ${size}, Amount: ${hazardAmount}`);
            } else {
                size = DifficultyScaler.getBoardSize(currentLevel);
                hazardAmount = DifficultyScaler.getHazardCount(currentLevel);
                hazardIntensity = currentLevel;
            }
        } else {
            size = config.size;
            hazardAmount = DifficultyScaler.getHazardCountBySize(size);
            hazardIntensity = config.hazards;
        }
        
        boardCtrl.regenerateHazards(game.board, hazardAmount, hazardIntensity, size);
        boardCtrl.trackHazardCount(game.board);
        boardCtrl.updateVision(game.board, player);
        player.setRegen(false);
    }
}