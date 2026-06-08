// ==============================================================
// ====================== GAME MANAGER ==========================
// ==============================================================
// Core game logic controller. Manages game state, level progression,
// input handling, victory/defeat conditions, and scoreboard display.

import { CharacterFactory } from "../factory/CharacterFactory.js";
import { BoardController } from "../controllers/BoardController.js";
import { TutorialController } from "../controllers/TutorialController.js";
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
        
        // Optional tutorial manager (only used in tutorial mode)
        this.tutorialManager = null;
        
        // Managers
        this.audio = new AudioManager();
        this.save = new SaveManager();
        this.scoreboard = null;                     // Initialized after player/board are ready
    }
    
    // ======================= GAME INITIALIZATION =======================
    
    // Start or restart the game
    async startGame() {
        this.gameInputLocked = false;
        
        this.currentLevel = this.save.getLegacyLevel();
        this.player = CharacterFactory.createCharacter(this.config.character);
        
        // Select board controller based on mode
        if (this.config.mode === "tutorial") {
            this.boardCtrl = new TutorialController(this.player);
        } else if (this.config.mode === "test") {
            const { TestController } = await import("../controllers/TestController.js");
            this.boardCtrl = new TestController(this.player);
            console.log("[GameManager] Test mode activated with TestController");
        } else {
            this.boardCtrl = new BoardController(this.player);
        }

        this.charCtrl = new CharacterController(this.player, this.boardCtrl, this);
        
        // Initialize ScoreboardManager after player/board are ready
        this.scoreboard = new ScoreboardManager(this);
        
        this.configLevel();
        
        this.boardCtrl.updateVision(this.board, this.player);
        this.boardCtrl.setGameManager(this);

        // Show level start modal (only for non-tutorial modes)
        if (this.config.mode !== "tutorial") {
            await this.showLevelStartModal();
        }

        this.gameInputLocked = false;
    }

    // ======================= FALL DAMAGE SETTING =======================

    // Check if fall damage is enabled in settings
    isFallDamageEnabled() {
        return this.save.isFallDamageEnabled();
    }
    
    // Configure level based on game mode
    configLevel() {
        let size, goals, hazardAmount, hazardIntensity, heightIntensity, obstacleIntensity, zone, childLevel;
        
        // ===== TUTORIAL MODE =====
        if (this.config.mode === "tutorial") {
            this.board = this.boardCtrl.generateBoard(5);
            this.charCtrl.getStartCoords(this.board);
            this.boardCtrl.updateVision(this.board, this.player);
            return;
        }

        // ===== TEST MODE =====
        if (this.config.mode === "test") {
            this.board = this.boardCtrl.generateBoard(24);
            this.charCtrl.getStartCoords(this.board);
            this.boardCtrl.updateVision(this.board, this.player);
            return;
        }
        
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
            if (this.config.seed) {
            this.boardCtrl.setSeed(this.config.seed);
            console.log(`[GameManager] Setting board seed: ${this.config.seed}`);
        }
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
        
        // Debug output
        console.log("========== GAME CONFIGURATION ==========");
        console.log(`Mode: ${this.config.mode}`);
        console.log(`Seed: ${this.config.seed}`);
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

        // ===== TUTORIAL PHASE COMPLETION (flaggoal) =====
        if (this.config.mode === "tutorial" && this.tutorialManager) {
            const currentTile = this.board[this.player.getPosX()][this.player.getPosY()];
            
            if (currentTile && currentTile.isFlaggoal()) {
                // Only advance if the player has flagged correctly in phase 2
                if (this.boardCtrl.currentPhase >= 2 && this.boardCtrl.currentPhase <= 4) {
                    return;
                } else {
                    this.tutorialManager.nextPhase();
                    return;
                }
            }
        }
        
        // ===== VICTORY CHECK =====
        if (this.config.mode === "tutorial") {
            if (this.boardCtrl.currentPhase === 5 && this.charCtrl.winCondition(this.board)) {
                // No hacer nada aquí - TutorialManager manejará la entrega
                return;
            }
        } else {
            if (this.charCtrl.winCondition(this.board)) {
                this.handleVictory();
                return;
            }
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
    
        if (this.config.mode === "legacy") {
            this.handleLegacyLose();
        } else if (this.config.mode === "daily") {
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

        if (this.config.seed) {
            this.config.seed = Math.floor(Math.random() * 999999999) + 1;
            console.log(`[GameManager] New seed for level ${this.currentLevel}: ${this.config.seed}`);
        }
        
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
        this.currentLevel = 1;
        this.save.clearLegacyProgress();
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

    // ======================= SETTERS =======================

    setRenderer(renderer) { this.renderer = renderer; }
    setTutorialManager(tutorialManager) { this.tutorialManager = tutorialManager; }
    setGameInputLocked(locked) { this.gameInputLocked = locked; }

    // ======================= TUTORIAL DELEGATION =======================

    onTutorialPitFall() {
        if (this.tutorialManager) {
            this.tutorialManager.onPitFall();
        }
    }
    
    // ======================= UI CALLBACKS =======================
    
    async nextLevel() {
        if (this.config.mode === "legacy") {
            this.handleLegacyVictory();
            document.getElementById("scoreboard-overlay").classList.remove("active");

            // Show level start modal again
            if (this.config.mode !== "tutorial") {
                await this.showLevelStartModal();
            }
            this.gameInputLocked = false;
        }
    }
    
    async retryLevel() {
        if (this.config.mode === "custom") {
            this.startGame();
        }
        document.getElementById("scoreboard-overlay").classList.remove("active");

        // Show level start modal again
        if (this.config.mode !== "tutorial") {
            await this.showLevelStartModal();
        }
        this.gameInputLocked = false;
    }

    randomizeNewGame() {
        if (this.config.mode !== "custom") return;
        
        // Generate new random seed
        const newSeed = Math.floor(Math.random() * 999999999) + 1;
        
        // Generate random configuration
        const random = this.createSeededRandom(newSeed);
        
        const chars = ["chef", "mosquito", "mommy", "scout"];
        const character = chars[Math.floor(random() * chars.length)];
        
        const sizes = [8, 12, 16, 20, 24];
        const size = sizes[Math.floor(random() * sizes.length)];
        
        const hazardsList = [1, 5, 8, 12, 20, 30];
        const hazards = hazardsList[Math.floor(random() * hazardsList.length)];
        
        const obstaclesList = [1, 3, 5, 10, 15, 30];
        const obstacles = obstaclesList[Math.floor(random() * obstaclesList.length)];
        
        const goals = Math.floor(random() * 5) + 1;

        // Update config
        this.config.seed = newSeed;
        this.config.character = character;
        this.config.size = size;
        this.config.hazards = hazards;
        this.config.obstacles = obstacles;
        this.config.goals = goals;
        
        // Hide scoreboard and restart game
        document.getElementById("scoreboard-overlay").classList.remove("active");
        this.startGame();
    }

    // Helper to create seeded random (copy from Menu.js or import)
    createSeededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
    
    returnToMenu() {
        if (this.config.mode === "legacy" && this.lastResult === "victory") {
            this.currentLevel++;
            this.save.setLegacyLevel(this.currentLevel);
            console.log(`Saving level on Home: ${this.currentLevel}`);
        }
        window.location.href = '../../index.html';
    }

    // ======================= MODAL MESSAGE =======================

    showMessage(message, onClose = null) {
        // Dispatch a custom event that the UI can listen to
        const event = new CustomEvent('game:showMessage', { 
            detail: { message, onClose } 
        });
        window.dispatchEvent(event);
    }

    // ======================= LEVEL START MODAL =======================

    async showLevelStartModal() {
        return new Promise((resolve) => {
            const modal = document.getElementById("level-start-modal");
            const titleEl = document.getElementById("level-start-title");
            const seedEl = document.getElementById("level-start-seed");
            const infoEl = document.getElementById("level-start-info");
            const childrenContainer = document.getElementById("level-start-children");
            
            if (!modal) {
                resolve();
                return;
            }
            
            // Clear previous children
            childrenContainer.innerHTML = "";
            
            // Set title based on mode
            let title = "";
            let seedText = "";
            let info = "";
            
            if (this.config.mode === "legacy") {
                title = `${this.getText('game.level')} ${this.currentLevel}`;
                seedText = `${this.getText('menu.punchcard.seed')}${this.config.seed || '---'}`;
                info = `${this.getText('game.wanted')}: ${this.charCtrl.getTotalGoals()}`;
            } else if (this.config.mode === "daily") {
                const today = new Date();
                title = today.toLocaleDateString();
                seedText = `${this.getText('menu.punchcard.seed')}${this.config.seed || '---'}`;
                info = `${this.getText('game.wanted')}: ${this.charCtrl.getTotalGoals()}`;
            } else {
                title = this.getText('game.customMission');
                seedText = `${this.getText('menu.punchcard.seed')}${this.config.seed || '---'}`;
                info = `${this.getText('game.wanted')}: ${this.charCtrl.getTotalGoals()}`;
            }
            
            titleEl.textContent = title;
            if (seedEl) seedEl.textContent = seedText;
            infoEl.textContent = info;
            
            // Get unique child types from board
            const childTypes = this.getChildTypesFromBoard();
            
            // Display each child type
            childTypes.forEach(childType => {
                const childDiv = document.createElement("div");
                childDiv.className = "level-start-child";
                
                const img = document.createElement("img");
                img.className = "level-start-child-img";
                img.src = `../../assets/sprites/characters/${childType}.png`;
                img.alt = childType;
                
                const name = document.createElement("span");
                name.className = "level-start-child-name";
                name.textContent = this.getText(`game.children.${childType}`) || childType;
                
                childDiv.appendChild(img);
                childDiv.appendChild(name);
                childrenContainer.appendChild(childDiv);
            });
            
            const cleanModal = () => {
                modal.classList.remove("show");
                document.removeEventListener("click", onUserInput);
                document.removeEventListener("keydown", onUserInput);
                document.removeEventListener("touchstart", onUserInput);
            };
            
            // Show modal with fade in
            modal.style.display = "flex";
            setTimeout(() => {
                modal.classList.add("show");
            }, 10);
            
            const closeModal = () => {
                cleanModal();
                setTimeout(() => {
                    modal.style.display = "none";
                    resolve();
                }, 500);
            };
            
            const onUserInput = () => {
                closeModal();
            };
            
            setTimeout(() => {
                document.addEventListener("click", onUserInput, { once: true });
                document.addEventListener("keydown", onUserInput, { once: true });
                document.addEventListener("touchstart", onUserInput, { once: true });
            }, 100);
        });
    }

    getChildTypesFromBoard() {
        const childTypes = new Set();
        
        for (let i = 0; i < this.board.length; i++) {
            for (let j = 0; j < this.board.length; j++) {
                const goalType = this.board[i][j].getGoaltype();
                if (goalType !== "none") {
                    childTypes.add(goalType);
                }
            }
        }
        
        return Array.from(childTypes);
    }

    getText(key) {
        // This will be set by Game.js
        if (this.localeManager) {
            return this.localeManager.get(key);
        }
        return key;
    }

    setLocaleManager(lm) {
        this.localeManager = lm;
    }
}