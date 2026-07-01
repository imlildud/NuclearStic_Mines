// ==============================================================
// ====================== GAME MANAGER ==========================
// ==============================================================
// Core game logic controller. Manages game state, level progression,
// input handling, victory/defeat conditions, and scoreboard display.

import { CharacterFactory } from "../factory/CharacterFactory.js";
import { BoardController } from "../controllers/BoardController.js";
import { TutorialController } from "../controllers/TutorialController.js";
import { CharacterController } from "../controllers/CharacterController.js";
import { CritickerController } from "../controllers/foes/CritickerController.js";
import { SpikeController } from "../controllers/obstacles/SpikeController.js";
import { AudioManager } from "./AudioManager.js";
import { SaveManager } from "./SaveManager.js";
import { ScoreboardManager } from "./ScoreboardManager.js";
import { TurnManager } from "./TurnManager.js";
import { BundleManager } from "./BundleManager.js";
import { BundleUIManager } from "./BundleUIManager.js";
import { KeychainUIManager } from "./KeychainUIManager.js";
import { DifficultyScaler } from "./DifficultyScaler.js";
import { PathResolver } from "../utils/PathResolver.js";

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

        // Foes and obstacles
        this.criticker = null;
        this.spikeController = null;
        
        // Managers
        this.bundleManager = null;
        this.bundleUIManager = null;
        this.keychainUIManager = null; 
        this.audio = new AudioManager();
        this.save = new SaveManager();
        this.turnManager = new TurnManager();
        this.scoreboard = null;                     // Initialized after player/board are ready
    }
    
    // ======================= GAME INITIALIZATION =======================
    
    // Start or restart the game
    async startGame() {
        this.gameInputLocked = false;

        const isHardcore = this.isHardcoreEnabled() && this.config.mode === "legacy";
    
        if (isHardcore) {
            this.currentLevel = this.save.getHardcoreLevel();
        } else {
            this.currentLevel = this.save.getLegacyLevel();
        }
        
        this.player = CharacterFactory.createCharacter(this.config.character);
        this.turnManager.reset();
        
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

        this.bundleManager = new BundleManager(this, this.localeManager);
        this.bundleUIManager = new BundleUIManager(this, this.bundleManager, this.audio);
        this.bundleUIManager.setLocaleManager(this.localeManager);
        console.log("[GameManager] Bundle system initialized");

        this.keychainUIManager = new KeychainUIManager(this, this.audio);
        this.keychainUIManager.setLocaleManager(this.localeManager);
        console.log("[GameManager] KeychainUI system initialized");

        // ===== DAILY MODE: Give starting keychains =====
        if (this.config.mode === "daily") {
            this.giveDailyKeychains();
        }

        // ===== CUSTOM MODE: Load saved keychains =====
        if (this.config.mode === "custom") {
            this.loadCustomKeychains();
        }

        // ===== Resistance Keychain: Set AP to 1 =====
        if (this.player.hasKeychain('resistance')) {
            if (this.player.getAbilityId() === 3) {
                this.player.incrementAp(1);
                console.log('[Resistance] Mommy +1 AP (total: ' + this.player.getAp() + ')');
            } else {
                this.player.setAp(1);
                console.log('[Resistance] AP set to 1');
            }
        }

        // Spike obstacle reset count
        if (this.spikeController) {
            this.spikeController.destroy();
        }
        
        this.spikeController = new SpikeController(this);
        this.spikeController.registerSpikes(this.board);
        
        // Set flags based on board hazards (Scout has fixed flags)
        this.setPlayerFlagsFromBoard();

        if (this.localeManager && !this.criticker) {
            this.criticker = new CritickerController(this, this.localeManager, this.audio);
            await this.criticker.init();
            console.log("[GameManager] Criticker controller initialized");
        }
            
        this.boardCtrl.updateVision(this.board, this.player);
        this.boardCtrl.setGameManager(this);

        // Show level start modal (only for non-tutorial modes)
        if (this.config.mode !== "tutorial") {
            await this.showLevelStartModal();
        }

        this.gameInputLocked = false;
    }

    // Set player flags based on total hazards on board
    // Scout is excluded - he has fixed flags for jumping only
    setPlayerFlagsFromBoard() {
        const isScout = this.player.getType() === "scout";
        
        if (isScout) {
            // Scout keeps fixed flags from CharacterFactory (for jumping)
            console.log(`[Scout] Keeping fixed flags: ${this.player.getFlags()}`);
            return;
        }
        
        const totalHazards = this.getTotalHazardsOnBoard();
        this.player.setFlags(totalHazards);
        console.log(`[GameManager] Set flags to ${totalHazards} (total hazards on board)`);
    }

    // ======================= FALL DAMAGE SETTING =======================

    // Check if fall damage is enabled in settings
    isFallDamageEnabled() {
        return this.save.isFallDamageEnabled();
    }
    
    // ======================= BOARD CONFIGURATION =======================
    
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
            const isHardcore = this.save.isHardcoreEnabled();
            
            if (isHardcore) {
                // HARDCORE: Extreme difficulty values
                size = 12 + this.currentLevel;
                goals = DifficultyScaler.getGoalCount(this.currentLevel) + 4;
                hazardAmount = DifficultyScaler.getHazardCountBySize(size);
                hazardIntensity = this.config.hazards;
                heightIntensity = this.config.obstacles;
                obstacleIntensity = this.config.obstacles;
                zone = this.config.zone;
                childLevel = this.currentLevel;
            } else {
                // Normal Legacy: Progressive difficulty
                size = DifficultyScaler.getBoardSize(this.currentLevel);
                hazardAmount = DifficultyScaler.getHazardCount(this.currentLevel);
                goals = DifficultyScaler.getGoalCount(this.currentLevel);
                heightIntensity = this.currentLevel;
                obstacleIntensity = this.currentLevel;
                zone = DifficultyScaler.getZoneByLevel(this.currentLevel);
                childLevel = this.currentLevel;
            }
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
        
        // Generate treasures only in legacy mode
        if (this.config.mode === "legacy") {
            this.board = this.boardCtrl.generateTreasures(this.board, size);
        }
        
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

    // ======================= HAZARD REGENERATION =======================
    
    // Regenerate hazards after player rescues a child
    regenerateHazards() {
        console.log("Regenerating hazards - Rescued:" + this.player.getRescued());
        let hazardAmount, hazardIntensity, size;
        
        if (this.config.mode === "legacy") {
            const isHardcore = this.save.isHardcoreEnabled();
            
            if (isHardcore) {
                size = this.config.size;
                hazardIntensity = this.config.hazards;
                hazardAmount = DifficultyScaler.getHazardCountBySize(size);
                console.log(`[Hardcore Regen] Size: ${size}, Amount: ${hazardAmount}, Intensity: ${hazardIntensity}`);
            } else {
                size = DifficultyScaler.getBoardSize(this.currentLevel);
                hazardAmount = DifficultyScaler.getHazardCount(this.currentLevel);
                hazardIntensity = this.currentLevel;
            }
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

    // ======================= INPUT HANDLING =======================
    
    // Handle movement input (WASD)
    handleInput(direction) {
        if (this.gameInputLocked) return;
        
        const now = Date.now();
        if (now - this.lastMoveTime < this.MOVE_DELAY) return;
        this.lastMoveTime = now;

        // Turn system increment
        this.turnManager.incrementTurn();
        
        // Execute movement
        this.charCtrl.moveCharacter(direction, this.board);
        this.charCtrl.verifyTile(this.board);
        
        // Update vision around player
        this.boardCtrl.updateVisionAroundPlayer(this.board, this.player);
        
        // Regenerate hazards if needed
        if (this.player.isRegen() === true) {
            this.regenerateHazards();
        }

        // Check treasure tile =====
        const px = this.player.getPosX();
        const py = this.player.getPosY();
        const currentTile = this.board[px][py];
        
        if (currentTile.haveTreasure && currentTile.haveTreasure()) {
            // Mark as used so it doesn't trigger again
            currentTile.setTreasure(false);
            
            // Show bundle popup
            if (this.bundleUIManager) {
                this.bundleUIManager.showBundlePopup(px, py);
            }
        }

        // ===== TUTORIAL PHASE COMPLETION (flaggoal) =====
        if (this.config.mode === "tutorial" && this.tutorialManager) {
            const currentTile = this.board[this.player.getPosX()][this.player.getPosY()];
            
            if (currentTile && currentTile.isFlaggoal()) {
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
        
        if (this.isHardcoreEnabled()) {
            this.save.setHardcoreLevel(this.currentLevel);

            // Update config for new level
            this.config.level = this.currentLevel;
            this.config.goals = 5;
            this.config.size = 12 + this.currentLevel;
            this.config.hazards = 5 + this.currentLevel;
            this.config.obstacles = 10 + this.currentLevel;
            this.config.zone = "ash";
            
            // Keep player stats (no health regen in hardcore)
            const currentHp = this.player.getHp();
            const currentType = this.player.getType();
            
            this.player = CharacterFactory.createCharacter(currentType);
            this.player.setHp(currentHp);

            // ===== Resistance Keychain: Set AP to 1 =====
            if (this.player.hasKeychain('resistance')) {
                if (this.player.getAbilityId() === 3) {
                    this.player.incrementAp(1);
                    console.log('[Resistance] Mommy +1 AP (total: ' + this.player.getAp() + ')');
                } else {
                    this.player.setAp(1);
                    console.log('[Resistance] AP set to 1');
                }
            }
        } else {
            // Normal Legacy - full regen
            this.save.setLegacyLevel(this.currentLevel);
            
            const currentType = this.player.getType();
            
            this.player = CharacterFactory.createCharacter(currentType);
            
            // ===== Resistance Keychain: Set AP to 1 =====
            if (this.player.hasKeychain('resistance')) {
                this.player.setAp(1);
            }
        }

        // New random seed for next level
        if (this.config.seed) {
            this.config.seed = Math.floor(Math.random() * 999999999) + 1;
            console.log(`[GameManager] New seed for level ${this.currentLevel}: ${this.config.seed}`);
        }
        
        // Recreate controllers and board
        this.boardCtrl = new BoardController(this.player);
        this.charCtrl = new CharacterController(this.player, this.boardCtrl, this);
        this.configLevel();
        
        // Restart the spike state and controllers
        if (this.spikeController){
            this.spikeController.destroy();
        }

        this.spikeController = new SpikeController(this);
        this.spikeController.registerSpikes(this.board);
        
        this.turnManager.reset();
        
        // Set flags based on new board
        this.setPlayerFlagsFromBoard();
        this.gameInputLocked = false;
        
        console.log(`Level ${this.currentLevel} started (Hardcore: ${this.isHardcoreEnabled()})`);
    }
    
    handleLegacyLose() {
        console.log(`Game over: Record ${this.currentLevel}`);
        
        if (this.isHardcoreEnabled()) {
            this.save.clearHardcoreProgress();
            this.currentLevel = 1;
        } else {
            this.save.clearLegacyProgress();
            this.currentLevel = 1;
        }
    }

    // ======================= HELPER METHODS =======================

    // Get total hazards on board (for max flags limit)
    getTotalHazardsOnBoard() {
        if (!this.board) return 0;
        let total = 0;
        for (let i = 0; i < this.board.length; i++) {
            for (let j = 0; j < this.board.length; j++) {
                if (this.board[i][j].getHazardtype() !== "none") {
                    total++;
                }
            }
        }
        return total;
    }

    // Check if Hardcore mode is enabled
    isHardcoreEnabled() {
        return this.save.isHardcoreEnabled();
    }

    giveDailyKeychains() {
        if (!this.bundleManager) {
            console.warn('[Daily] BundleManager not available');
            return;
        }
        
        const seed = this.config.seed || Date.now();
        const keychains = this.bundleManager.getDailyKeychains(seed);
        
        const player = this.player;
        const maxSize = player.maxInventorySize || 5;
        
        let addedCount = 0;
        for (const keychain of keychains) {
            if (player.inventory.length >= maxSize) break;
            if (!player.inventory.includes(keychain.id)) {
                player.inventory.push(keychain.id);
                addedCount++;
            }
        }

        // Initialize keychain uses for limited-use keychains
        if (player.inventory.includes('descent')) {
            player.initKeychainUses('descent', 5);
        }
        
        console.log(`[Daily] Gave ${addedCount} keychains from seed ${seed}`);
        console.log(`[Daily] Keychains: ${player.inventory.join(', ')}`);
        console.log('[Daily] Keychain uses:', player.keychainUses);
    }

    loadCustomKeychains() {
        const savedKeychains = this.save.getCustomKeychains();
        
        if (!savedKeychains || savedKeychains.length === 0) {
            console.log('[Custom] No saved keychains found, using default empty inventory');
            return;
        }
        
        const player = this.player;
        const maxSize = player.maxInventorySize || 5;
        
        // Clear existing inventory (custom mode starts fresh)
        player.inventory = [];
        
        // Add saved keychains up to max size
        let addedCount = 0;
        for (const keychainId of savedKeychains) {
            if (player.inventory.length >= maxSize) break;
            if (keychainId && !player.inventory.includes(keychainId)) {
                player.inventory.push(keychainId);
                addedCount++;
            }
        }

        // Initialize keychain uses for limited-use keychains
        if (player.inventory.includes('descent')) {
            player.initKeychainUses('descent', 5);
        }
        
        console.log(`[Custom] Loaded ${addedCount} saved keychains: ${player.inventory.join(', ')}`);
        console.log('[Custom] Keychain uses:', player.keychainUses);
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
        
        // ===== SCOUT ABILITY (Ability 4) =====
        // Scout uses flags ONLY for jumping, not for marking hazards
        if (abilityId === 4) {
            // Check if jump target is within bounds
            if (jumpX < 0 || jumpX >= size || jumpY < 0 || jumpY >= size) return;
            
            // Place jump flag if available and not already placed
            if (this.player.getFlags() > 0 && !tile.isJumpflagged()) {
                tile.setJumpflagged(true);
                this.player.decrementFlags();
                console.log(`[Scout] Jump flag placed at (${targetX},${targetY}), flags left: ${this.player.getFlags()}`);
            }
            
            // Execute jump if flag is present
            if (tile.isJumpflagged()) {
                this.player.setPosX(jumpX);
                this.player.setPosY(jumpY);
                this.charCtrl.verifyTile(this.board);
                this.boardCtrl.updateVisionAroundPlayer(this.board, this.player);
                console.log(`[Scout] Jumped to (${jumpX},${jumpY})`);
            }
            return;
        }
        
        // ===== OTHER CHARACTERS =====
        // Chef ability: can't flag if tile is already flagged
        if (abilityId === 1 && tile.isFlagged()) return;
        
        // Can't flag if tile is not hidden or already marked
        if (!tile.isHide() || tile.isMarked()) return;
        
        // Remove flag if already placed
        if (tile.isFlagged()) {
            tile.setFlagged(false);
            this.player.incrementFlags();
            return;
        }
        
        // Place new flag
        if (this.player.getFlags() > 0) {
            tile.setFlagged(true);
            this.player.decrementFlags();
            
            // Chef ability OR Criticized ability: automatically mark hazard when flagged
            const isChef = (abilityId === 1);
            const isCriticized = this.player.isCriticized();
            const hasHazard = (tile.getHazardtype() !== "none");
            
            // When marking a hazard correctly (Chef or Criticized)
            if ((isChef || isCriticized) && hasHazard) {
                tile.setMarked(true);
                tile.setFlagged(false);
                
                // Update Criticker progress
                if (isCriticized && this.criticker) {
                    const currentProgress = this.player.getCritickerProgress();
                    const goal = this.player.getCritickerGoal();
                    const newProgress = this.criticker.markProgress(currentProgress, goal);
                    this.player.setCritickerProgress(newProgress);
                    
                    if (newProgress >= goal) {
                        this.player.setCriticized(false);
                    }
                }
            }

            // When wrong flag placed (no hazard)
            if (isCriticized && !hasHazard) {
                // Don't apply damage here - let Criticker handle it
                this.player.setCriticized(false);
                
                // Notify criticker of failure (it will handle damage)
                if (this.criticker) {
                    this.criticker.fail();
                }
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

            if (this.config.mode !== "tutorial") {
                await this.showLevelStartModal();
            }
            this.gameInputLocked = false;
        }
    }
    
    async retryLevel() {
        if (this.config.mode === "custom") {
            this.startGame();
        } else {
            // For legacy/daily, just regenerate the same level
            this.configLevel();
            this.setPlayerFlagsFromBoard();

            // ===== Resistance Keychain: Set AP to 1 =====
            if (this.player.hasKeychain('resistance')) {
                if (this.player.getAbilityId() === 3) {
                    this.player.incrementAp(1);
                    console.log('[Resistance] Mommy +1 AP (total: ' + this.player.getAp() + ')');
                } else {
                    this.player.setAp(1);
                    console.log('[Resistance] AP set to 1');
                }
            }

            // Restart the spike state and controllers
            if (this.spikeController){
              this.spikeController.destroy();
            }

            this.spikeController = new SpikeController(this);
            this.spikeController.registerSpikes(this.board);
        
            this.turnManager.reset();
        }
        document.getElementById("scoreboard-overlay").classList.remove("active");

        if (this.config.mode !== "tutorial") {
            await this.showLevelStartModal();
        }
        this.gameInputLocked = false;
    }

    randomizeNewGame() {
        if (this.config.mode !== "custom") return;
        
        const newSeed = Math.floor(Math.random() * 999999999) + 1;
        const random = this.createSeededRandom(newSeed);
        
        const chars = ["chef", "mosquito", "mommy", "scout"];
        const character = chars[Math.floor(random() * chars.length)];

        // ===== Resistance Keychain: Set AP to 1 =====
        if (this.player.hasKeychain('resistance')) {
            if (this.player.getAbilityId() === 3) {
                this.player.incrementAp(1);
                console.log('[Resistance] Mommy +1 AP (total: ' + this.player.getAp() + ')');
            } else {
                this.player.setAp(1);
                console.log('[Resistance] AP set to 1');
            }
        }
        
        const sizes = [8, 12, 16, 20, 24];
        const size = sizes[Math.floor(random() * sizes.length)];
        
        const hazardsList = [1, 5, 8, 12, 20, 30];
        const hazards = hazardsList[Math.floor(random() * hazardsList.length)];
        
        const obstaclesList = [1, 3, 5, 10, 15, 30];
        const obstacles = obstaclesList[Math.floor(random() * obstaclesList.length)];
        
        const goals = Math.floor(random() * 5) + 1;

        this.config.seed = newSeed;
        this.config.character = character;
        this.config.size = size;
        this.config.hazards = hazards;
        this.config.obstacles = obstacles;
        this.config.goals = goals;
        
        // Restart the spike state and controllers
        if (this.spikeController){
            this.spikeController.destroy();
        }

        this.spikeController = new SpikeController(this);
        this.spikeController.registerSpikes(this.board);
        
        this.turnManager.reset();
        
        document.getElementById("scoreboard-overlay").classList.remove("active");
        this.startGame();
    }

    createSeededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
    
    returnToMenu() {
        if (this.config.mode === "legacy" && this.lastResult === "victory") {
            this.currentLevel++;
            if (this.isHardcoreEnabled()) {
                this.save.setHardcoreLevel(this.currentLevel);
                console.log(`Saving Hardcore level on Home: ${this.currentLevel}`);
            } else {
                this.save.setLegacyLevel(this.currentLevel);
                console.log(`Saving Legacy level on Home: ${this.currentLevel}`);
            }
        }
        PathResolver.goToIndex();
    }

    // ======================= MODAL MESSAGE =======================

    showMessage(message, onClose = null) {
        const event = new CustomEvent('game:showMessage', { 
            detail: { message, onClose } 
        });
        window.dispatchEvent(event);
    }

    // ======================= PAUSE MODAL =======================

    async showPauseModal() {
        return new Promise((resolve) => {
            const modal = document.getElementById("pause-modal");
            const titleEl = document.getElementById("pause-title");
            const statsEl = document.getElementById("pause-stats");
            const childrenContainer = document.getElementById("pause-children");
            const continueBtn = document.getElementById("pause-continue");
            const exitBtn = document.getElementById("pause-exit");
            
            if (!modal) {
                resolve();
                return;
            }
            
            childrenContainer.innerHTML = "";
            titleEl.textContent = this.getText('game.paused');
            
            const totalGoals = this.charCtrl.getTotalGoals();
            const remainingGoals = this.charCtrl.getRemainingGoals();
            const statsText = `${this.getText('game.wanted')}: ${totalGoals} | ${this.getText('game.remaining')}: ${remainingGoals}`;
            statsEl.textContent = statsText;
            
            const childTypes = this.getChildTypesFromBoard();
            childTypes.forEach(childType => {
                const childDiv = document.createElement("div");
                childDiv.className = "pause-child";
                
                const img = document.createElement("img");
                img.className = "pause-child-img";
                img.src = PathResolver.resolveAsset('characters', `${childType}.png`);
                img.alt = childType;
                
                const name = document.createElement("span");
                name.className = "pause-child-name";
                name.textContent = this.getText(`game.children.${childType}`) || childType;
                
                childDiv.appendChild(img);
                childDiv.appendChild(name);
                childrenContainer.appendChild(childDiv);
            });
            
            modal.style.display = "flex";
            
            const newContinueBtn = continueBtn.cloneNode(true);
            continueBtn.parentNode.replaceChild(newContinueBtn, continueBtn);
            newContinueBtn.addEventListener("click", () => {
                modal.style.display = "none";
                this.gameInputLocked = false;
                resolve();
            });
            
            const newExitBtn = exitBtn.cloneNode(true);
            exitBtn.parentNode.replaceChild(newExitBtn, exitBtn);
            newExitBtn.addEventListener("click", () => {
                modal.style.display = "none";
                PathResolver.goToIndex();
            });
        });
    }

    async pauseGame() {
        if (this.gameInputLocked) return;
        
        this.gameInputLocked = true;
        await this.showPauseModal();
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
            
            childrenContainer.innerHTML = "";
            
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
            
            const childTypes = this.getChildTypesFromBoard();
            childTypes.forEach(childType => {
                const childDiv = document.createElement("div");
                childDiv.className = "level-start-child";
                
                const img = document.createElement("img");
                img.className = "level-start-child-img";
                img.src = PathResolver.resolveAsset('characters', `${childType}.png`);
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
        if (this.localeManager) {
            return this.localeManager.get(key);
        }
        return key;
    }

    setLocaleManager(lm) {
        this.localeManager = lm;
    }
}