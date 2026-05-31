// ==============================================================
// ====================== GAME MANAGER ==========================
// ==============================================================
// Core game logic controller. Manages game state, level progression,
// input handling, victory/defeat conditions, and scoreboard display.

import { CharacterFactory } from "../factory/CharacterFactory.js";
import { BoardController } from "../controllers/BoardController.js";
import { CharacterController } from "../controllers/CharacterController.js";
import { AudioManager } from "./AudioManager.js";
import { SaveManager } from "./SaveManager.js";
import { ScoreboardManager } from "./ScoreboardManager.js";
import { DifficultyScaler } from "./DifficultyScaler.js";

export class GameManager {
    
    // ======================= CONSTRUCTOR =======================
    
    constructor(config) {
        this.config = config;                       // Game configuration from menu
        this.currentLevel = 1;                     // Current legacy mode level
        this.gameInputLocked = false;               // Prevents input during animations
        this.player = null;                         // Reference to player character
        this.boardCtrl = null;                      // Board controller instance
        this.charCtrl = null;                       // Character controller instance
        this.board = null;                          // Game board grid
        this.lastMoveTime = 0;                      // Throttle for movement
        this.MOVE_DELAY = 200;                      // Movement cooldown (ms)
        this.renderer = null;                       // Reference to renderer
        this.lastResult = null;                     // Last game result (victory/gameover)
        
        // Managers
        this.audio = new AudioManager();
        this.save = new SaveManager();
        this.scoreboard = null;                     // Initialized after player/board are ready
    }
    
    // ======================= GAME INITIALIZATION =======================
    
    // Start or restart the game
    startGame() {
        this.gameInputLocked = false;
        
        this.currentLevel = this.save.getLegacyLevel();
        this.player = CharacterFactory.createCharacter(this.config.character);
        this.boardCtrl = new BoardController(this.player);
        this.charCtrl = new CharacterController(this.player, this.boardCtrl);
        
        // Initialize ScoreboardManager after player/board are ready
        this.scoreboard = new ScoreboardManager(this);
        
        this.configLevel();
        
        this.boardCtrl.updateVision(this.board, this.player);
        this.boardCtrl.setGameManager(this);
    }
    
    // Configure level based on game mode (legacy or custom/daily)
    configLevel() {
        let size, goals, hazardAmount, hazardIntensity, heightIntensity, obstacleIntensity, zone, childLevel;
        
        // ===== LEGACY MODE =====
        if (this.config.mode === "legacy") {
            size = DifficultyScaler.getBoardSize(this.currentLevel);
            hazardAmount = DifficultyScaler.getHazardCount(this.currentLevel);
            goals = DifficultyScaler.getGoalCount(this.currentLevel);
            heightIntensity = this.currentLevel;
            obstacleIntensity = this.currentLevel;
            zone = DifficultyScaler.getZoneByLevel(this.currentLevel);
            childLevel = this.currentLevel;
        }
        // ===== CUSTOM / DAILY MODE =====
        else {
            size = this.config.size;
            goals = this.config.goals;
            hazardAmount = DifficultyScaler.getHazardCountBySize(size);
            hazardIntensity = this.config.hazards;
            heightIntensity = this.config.obstacles;
            obstacleIntensity = this.config.obstacles;
            zone = this.config.zone;
            childLevel = 10;
        }
        
        // Generate board step by step
        this.board = this.boardCtrl.generateBoard(size);
        
        this.board = this.boardCtrl.generateStartAndGoal(this.board, goals, childLevel);
        this.board = this.boardCtrl.setSafeTiles(this.board, size);
        this.board = this.boardCtrl.generateHeights(this.board, heightIntensity, size);
        this.board = this.boardCtrl.generateObstacles(this.board, obstacleIntensity, size);
        this.board = this.boardCtrl.generateHazards(this.board, hazardAmount, hazardIntensity, size);
        this.board = this.boardCtrl.trackHazardCount(this.board, size);
        
        // Set character goals and starting position
        this.charCtrl.setCharacterGoals(goals);
        this.charCtrl.getStartCoords(this.board);
        this.boardCtrl.updateVision(this.board, this.player);
        
        // ========== DEBUG OUTPUT ==========
        console.log("========== GAME CONFIGURATION ==========");
        console.log(`Mode: ${this.config.mode}`);
        console.log(`Size: ${size}`);
        console.log(`Goals: ${goals}`);
        console.log(`Hazard Amount: ${hazardAmount}`);
        console.log(`Hazard Intensity: ${hazardIntensity}`);
        console.log(`Height Intensity: ${heightIntensity}`);
        console.log(`Obstacle Intensity: ${obstacleIntensity}`);
        console.log(`Zone: ${zone}`);
        console.log(`Child Level: ${childLevel}`);
        console.log(`Character: ${this.config.character}`);
        console.log("========================================");
    }
    
    // ======================= INPUT HANDLING =======================
    
    // Handle movement input (WASD)
    handleInput(direction) {
        if (this.gameInputLocked) return;
        
        const now = Date.now();
        if (now - this.lastMoveTime < this.MOVE_DELAY) return;
        this.lastMoveTime = now;
        
        // Execute movement
        this.charCtrl.moveCharacter(direction, this.board);
        this.charCtrl.verifyTile(this.board);
        
        // Update vision around player
        this.boardCtrl.updateVisionAroundPlayer(this.board, this.player);
        
        // ===== HAZARD REGENERATION =====
        if (this.player.isRegen() === true) {
            console.log("Goals:" + this.player.getRescued());
            let hazardAmount, hazardIntensity, size;
            
            if (this.config.mode === "legacy") {
                size = DifficultyScaler.getBoardSize(this.currentLevel);
                hazardAmount = DifficultyScaler.getHazardCount(this.currentLevel);
                hazardIntensity = this.currentLevel;
            } else {
                size = this.config.size;
                hazardAmount = DifficultyScaler.getHazardCountBySize(size);
                hazardIntensity = this.config.hazards;
            }
            
            this.boardCtrl.regenerateHazards(this.board, hazardAmount, hazardIntensity, size);
            this.boardCtrl.trackHazardCount(this.board);
            this.boardCtrl.updateVision(this.board, this.player);
            this.player.setRegen(false);
        }
        
        // ===== VICTORY CHECK =====
        if (this.charCtrl.winCondition(this.board)) {
            this.handleVictory();
            return;
        }
        
        // ===== DEFEAT CHECK =====
        if (!this.player.isAlive()) {
            this.gameInputLocked = true;
            this.handleGameOver();
            return;
        }
    }
    
    // ======================= GAME OVER HANDLERS =======================
    
    handleVictory() {
        this.gameInputLocked = true;
    
        // Save daily result if in daily mode
        if (this.config.mode === "daily") {
            const scores = this.scoreboard.calculateScores();
            this.handleDailyVictory(scores.total);
        }
    
        this.scoreboard.show(true);
        this.lastResult = "victory";
    }

    handleGameOver() {
        this.gameInputLocked = true;
        this.audio.playDeathSFX();
    
        // Save daily result if in daily mode
        if (this.config.mode === "daily") {
            const scores = this.scoreboard.calculateScores();
            this.handleDailyLose(scores.total);
        }
    
        this.scoreboard.show(false);
        this.lastResult = "gameover";
    }

    // ======================= LEGACY MODE HANDLERS =======================
    
    handleLegacyVictory() {
        console.log(`Legacy: Next level ${this.currentLevel + 1}`);
        this.currentLevel++;
        this.save.setLegacyLevel(this.currentLevel);
        
        const currentPoints = this.player.getPoints();
        const currentType = this.player.getType();
        
        this.player = CharacterFactory.createCharacter(currentType);
        this.player.setPoints(currentPoints);
        
        this.boardCtrl = new BoardController(this.player);
        this.charCtrl = new CharacterController(this.player, this.boardCtrl);
        
        this.configLevel();
        this.gameInputLocked = false;
        
        console.log(`Level ${this.currentLevel} started`);
    }
    
    handleLegacyLose() {
        console.log(`Game over: Record ${this.currentLevel}`);
        this.save.clearLegacyProgress();
        this.currentLevel = 1;
    }

    // ======================= DAILY MODE HANDLERS =======================

    handleDailyVictory(score) {
        console.log(`Daily complete! Score: ${score}`);
        this.save.saveDailyScore(score, true);
    }

    handleDailyLose(score) {
        console.log(`Daily failed! Score: ${score}`);
        this.save.saveDailyScore(score, false);
    }
    
    // ======================= FLAG SYSTEM =======================
    
    handleFlagDirection(direction) {
        if (!this.board) return;
        
        const px = this.player.getPosX();
        const py = this.player.getPosY();
        const abilityId = this.player.getAbilityId();
        
        let targetX = px, targetY = py;
        let jumpX = px, jumpY = py;
        
        switch(direction) {
            case "Up":    targetY--; jumpY -= 2; break;
            case "Down":  targetY++; jumpY += 2; break;
            case "Left":  targetX--; jumpX -= 2; break;
            case "Right": targetX++; jumpX += 2; break;
        }
        
        const size = this.board.length;
        if (targetX < 0 || targetX >= size || targetY < 0 || targetY >= size) return;
        
        const tile = this.board[targetX][targetY];
        
        // Scout ability (jump)
        if (abilityId === 4) {
            if (jumpX < 0 || jumpX >= size || jumpY < 0 || jumpY >= size) return;
            if (this.player.getFlags() > 0 && !tile.isJumpflagged()) {
                tile.setJumpflagged(true);
                this.player.decrementFlags();
            }
            if (tile.isJumpflagged()) {
                this.player.setPosX(jumpX);
                this.player.setPosY(jumpY);
                this.charCtrl.verifyTile(this.board);
                this.boardCtrl.updateVisionAroundPlayer(this.board, this.player);
            }
            return;
        }
        
        // Chef ability
        if (abilityId === 1 && tile.isFlagged()) return;
        if (!tile.isHide() || tile.isMarked()) return;
        
        if (tile.isFlagged()) {
            tile.setFlagged(false);
            this.player.incrementFlags();
            return;
        }
        
        if (this.player.getFlags() > 0) {
            tile.setFlagged(true);
            this.player.decrementFlags();
            
            if (abilityId === 1 && tile.getHazardtype() !== "none") {
                tile.setMarked(true);
                tile.setFlagged(false);
                this.player.incrementPoints(200);
            }
        }
    }
    
    // ======================= GETTERS =======================
    
    getBoard() { return this.board; }
    getPlayer() { return this.player; }
    getZone() { return this.config.zone; }
    
    // ======================= UI CALLBACKS =======================
    
    nextLevel() {
        if (this.config.mode === "legacy") {
            this.handleLegacyVictory();
            document.getElementById("scoreboard-overlay").classList.remove("active");
        }
    }
    
    retryLevel() {
        if (this.config.mode === "custom") {
            this.startGame();
        }
        document.getElementById("scoreboard-overlay").classList.remove("active");
    }
    
    returnToMenu() {
        if (this.config.mode === "legacy" && this.lastResult === "victory") {
            this.currentLevel++;
            this.save.setLegacyLevel(this.currentLevel);
            console.log(`Saving level on Home: ${this.currentLevel}`);
        }
        window.location.href = '../../index.html';
    }
    
    setRenderer(renderer) {
        this.renderer = renderer;
    }
}