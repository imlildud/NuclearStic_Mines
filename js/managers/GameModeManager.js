// ==============================================================
// ==================== GAME MODE MANAGER ========================
// ==============================================================
// Handles Legacy, Daily, and Custom mode logic

import { CharacterFactory } from "../factory/CharacterFactory.js";
import { BoardController } from "../controllers/BoardController.js";
import { CharacterController } from "../controllers/CharacterController.js";
import { SpikeController } from "../controllers/obstacles/SpikeController.js";

export class GameModeManager {
    
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    // ======================= LEGACY =======================
    
    handleLegacyVictory(game) {
        console.log(`Legacy: Next level ${game.currentLevel + 1}`);
        
        const isHardcore = game.isHardcoreEnabled();
        const player = game.player;
        const config = game.config;
        
        if (isHardcore) {
            // Save hardcore keychains and uses
            game.keychainManager.saveHardcoreKeychains(player);
            
            // Save character and health
            game.save.setHardcoreCharacter(player.getType());
            game.save.setHardcoreHealth(player.getHp());
            
            game.currentLevel++;
            game.save.setHardcoreLevel(game.currentLevel);
            
            config.level = game.currentLevel;
            config.goals = 5;
            config.size = 12 + game.currentLevel;
            config.hazards = 5 + game.currentLevel;
            config.obstacles = 10 + game.currentLevel;
            config.zone = "ash";
            
            const currentHp = player.getHp();
            const currentType = player.getType();
            game.player = CharacterFactory.createCharacter(currentType);
            game.player.setHp(currentHp);
            
            // Load hardcore keychains into new player
            game.keychainManager.loadHardcoreKeychains(game.player);
        } else {
            // Normal Legacy
            game.keychainManager.saveLegacyKeychains(player);
            game.currentLevel++;
            game.save.setLegacyLevel(game.currentLevel);
            
            const currentType = player.getType();
            game.player = CharacterFactory.createCharacter(currentType);
            
            // Load legacy keychains into new player
            game.keychainManager.loadLegacyKeychains(game.player);
        }

        if (config.seed) {
            config.seed = Math.floor(Math.random() * 999999999) + 1;
        }
        
        // Recreate controllers
        game.boardCtrl = new BoardController(game.player);
        game.charCtrl = new CharacterController(game.player, game.boardCtrl, game);
        
        // Use level configurator
        const levelConfigurator = game.levelConfigurator;
        levelConfigurator.configure(game);
        
        if (game.spikeController) game.spikeController.destroy();
        game.spikeController = new SpikeController(game);
        game.spikeController.registerSpikes(game.board);
        
        game.turnManager.reset();
        game.setPlayerFlagsFromBoard();
        game.gameInputLocked = false;
        
        console.log(`Level ${game.currentLevel} started (Hardcore: ${isHardcore})`);
    }

    handleLegacyLose(game) {
        console.log(`Game over: Record ${game.currentLevel}`);
        
        const isHardcore = game.isHardcoreEnabled();
        const player = game.player;
        
        // Stuffed: Save keychains before clearing (separated by mode)
        if (player.hasKeychain('stuffed')) {
            const keychainsToSave = player.inventory.filter(id => id !== 'stuffed');
            if (keychainsToSave.length > 0) {
                if (isHardcore) {
                    game.save.setHardcoreStuffedKeychains(keychainsToSave);
                    console.log('[Stuffed Hardcore] Saved keychains on death:', keychainsToSave);
                } else {
                    game.save.setLegacyStuffedKeychains(keychainsToSave);
                    console.log('[Stuffed Legacy] Saved keychains on death:', keychainsToSave);
                }
            }
        }
        
        if (isHardcore) {
            game.keychainManager.clearHardcoreKeychains();
            game.save.clearHardcoreAll();
            game.save.clearHardcoreProgress();
            game.currentLevel = 1;
        } else {
            game.keychainManager.clearLegacyKeychains();
            game.save.clearLegacyProgress();
            game.currentLevel = 1;
        }
    }

    // ======================= GENERIC =======================
    
    handleGameOver(game) {
        const scores = game.scoreboard.calculateScores();
        if (game.config.mode === "legacy") {
            this.handleLegacyLose(game);
        }
    }

    // ======================= RANDOMIZE =======================
    
    randomizeNewGame(game) {
        if (game.config.mode !== "custom") return;
        
        const newSeed = Math.floor(Math.random() * 999999999) + 1;
        const random = game.createSeededRandom(newSeed);
        
        const chars = ["chef", "mosquito", "mommy", "scout"];
        const character = chars[Math.floor(random() * chars.length)];
        
        const sizes = [8, 12, 16, 20, 24];
        const size = sizes[Math.floor(random() * sizes.length)];
        
        const hazardsList = [1, 5, 8, 12, 20, 30];
        const hazards = hazardsList[Math.floor(random() * hazardsList.length)];
        
        const obstaclesList = [1, 3, 5, 10, 15, 30];
        const obstacles = obstaclesList[Math.floor(random() * obstaclesList.length)];
        
        const goals = Math.floor(random() * 5) + 1;

        game.config.seed = newSeed;
        game.config.character = character;
        game.config.size = size;
        game.config.hazards = hazards;
        game.config.obstacles = obstacles;
        game.config.goals = goals;
        
        if (game.spikeController) game.spikeController.destroy();
        game.spikeController = new SpikeController(game);
        game.spikeController.registerSpikes(game.board);
        game.turnManager.reset();
        
        document.getElementById("scoreboard-overlay").classList.remove("active");
        game.startGame();
    }
}