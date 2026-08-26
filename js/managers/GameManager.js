// ==============================================================
// ====================== GAME MANAGER ==========================
// ==============================================================
// Core game logic controller - orchestrates all subsystems

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
import { KeychainManager } from "./KeychainManager.js";
import { ReversionManager } from "./ReversionManager.js";
import { LinkManager } from "./LinkManager.js";
import { FlagManager } from "./FlagManager.js";
import { FlagModeManager } from "./FlagModeManager.js"; 
import { UIManager } from "./UIManager.js";
import { LevelConfigurator } from "./LevelConfigurator.js";
import { GameModeManager } from "./GameModeManager.js";
import { HazardManager } from "./HazardManager.js";
import { KeychainConfig } from "../utils/KeychainConfig.js";
import { PathResolver } from "../utils/PathResolver.js";
import { updateDiscordPresence, buildDiscordPresence } from "../utils/DiscordRPC.js";

export class GameManager {
    
    constructor(config) {
        this.config = config;
        this.currentLevel = 1;
        this.gameInputLocked = false;
        this.player = null;
        this.boardCtrl = null;
        this.charCtrl = null;
        this.board = null;
        this.lastMoveTime = 0;
        this.MOVE_DELAY = 200;
        this.renderer = null;
        this.lastResult = null;
        this.tutorialManager = null;
        this.criticker = null;
        this.spikeController = null;
        this.destinyTarget = null;
        
        // Managers
        this.bundleManager = null;
        this.bundleUIManager = null;
        this.keychainUIManager = null;
        this.audio = new AudioManager();
        this.save = new SaveManager();
        this.turnManager = new TurnManager();
        this.scoreboard = null;
        
        // Sub-managers
        this.keychainManager = new KeychainManager(this);
        this.reversionManager = new ReversionManager(this);
        this.linkManager = new LinkManager(this);
        this.flagManager = new FlagManager(this);
        this.uiManager = new UIManager(this);
        this.levelConfigurator = new LevelConfigurator(this);
        this.gameModeManager = new GameModeManager(this);
        this.hazardManager = new HazardManager(this);
        this.flagModeManager = new FlagModeManager(this);
    }
    
    // ======================= GAME INITIALIZATION =======================
    
    async startGame() {
        this.gameInputLocked = false;
        const isHardcore = this.isHardcoreEnabled() && this.config.mode === "legacy";
        
        if (isHardcore) {
            this.currentLevel = this.save.getHardcoreLevel();
        } else {
            this.currentLevel = this.save.getLegacyLevel();
        }
        
        this.player = CharacterFactory.createCharacter(this.config.character);
        this.player.resetDeadPals();
        this.turnManager.reset();
        
        // Board controller
        if (this.config.mode === "tutorial") {
            this.boardCtrl = new TutorialController(this.player);
        } else if (this.config.mode === "test") {
            const { TestController } = await import("../controllers/TestController.js");
            this.boardCtrl = new TestController(this.player);
            console.log("[GameManager] Test mode activated");
        } else {
            this.boardCtrl = new BoardController(this.player);
        }

        this.charCtrl = new CharacterController(this.player, this.boardCtrl, this);
        this.scoreboard = new ScoreboardManager(this);
        
        // Configure level
        this.levelConfigurator.configure(this);
        
        // Initialize bundle system
        this.bundleManager = new BundleManager(this, this.localeManager);
        this.bundleUIManager = new BundleUIManager(this, this.bundleManager, this.audio);
        this.bundleUIManager.setLocaleManager(this.localeManager);
        this.keychainUIManager = new KeychainUIManager(this, this.audio);
        this.keychainUIManager.setLocaleManager(this.localeManager);
        
        // Load keychains
        if (this.config.mode === "legacy") {
            if (this.isHardcoreEnabled()) {
                this.keychainManager.loadHardcoreKeychains(this.player);
                
                // Restore character and health
                const savedChar = this.save.getHardcoreCharacter();
                const savedHealth = this.save.getHardcoreHealth();
                
                if (savedChar && savedChar === this.config.character && savedHealth !== null) {
                    this.player.setHp(savedHealth);
                    console.log('[Hardcore] Restored health:', savedHealth);
                }
            } else {
                this.keychainManager.loadLegacyKeychains(this.player);
            }
        }
        if (this.config.mode === "daily") {
            this.keychainManager.giveDailyKeychains(this.bundleManager, this.player, this.config.seed || Date.now());
            KeychainConfig.initKeychainUsesForPlayer(this.player);
        }
        if (this.config.mode === "custom") {
            this.keychainManager.loadCustomKeychains(this.save, this.player);
            KeychainConfig.initKeychainUsesForPlayer(this.player);
        }
        
        // Apply keychains functions
        this.keychainManager.applyResistance(this.player);
        if (this.player.hasKeychain('judgment')) {
            this.player.setCriticized(true);
            this.player.setCritickerGoal(9999); // Permanent effect
        }
        this.getFlagModeManager().updateSwampButtonUI();
        this.reversionManager.updateButtonUI();
        this.setLinkedPal(this.board);
        // Memory markers
        this.memoryMarkers = 3;
        
        // Spike controller
        if (this.spikeController) this.spikeController.destroy();
        this.spikeController = new SpikeController(this);
        this.spikeController.registerSpikes(this.board);
        
        this.setPlayerFlagsFromBoard();

        if (this.localeManager && !this.criticker) {
            this.criticker = new CritickerController(this, this.localeManager, this.audio);
            await this.criticker.init();
        }
            
        this.boardCtrl.updateVision(this.board, this.player);
        this.boardCtrl.setGameManager(this);

        if (this.config.mode !== "tutorial") {
            await this.uiManager.showLevelStartModal(this.charCtrl, this.config, this.board);
        }

        // DISCORD
        const presence = buildDiscordPresence(this.config);
        updateDiscordPresence(presence.details, presence.state, {
            largeImageKey: presence.largeImageKey
        });

        this.gameInputLocked = false;
    }

    setPlayerFlagsFromBoard() {
        const totalHazards = this.getTotalHazardsOnBoard();
        this.player.setFlags(totalHazards);
        console.log(`[GameManager] Set flags to ${totalHazards}`);
    }

    // ======================= INPUT =======================
    
    handleInput(direction) {
        if (this.gameInputLocked) return;
        if (Date.now() - this.lastMoveTime < this.MOVE_DELAY) return;
        this.lastMoveTime = Date.now();

        this.turnManager.incrementTurn();
        this.charCtrl.moveCharacter(direction, this.board);
        this.charCtrl.verifyTile(this.board);
        this.boardCtrl.updateVisionAroundPlayer(this.board, this.player);
        
        if (this.player.isRegen()) {
            this.hazardManager.regenerate(this);
        }

        this.checkTreasureTile();
        this.checkTutorialProgress();
        this.checkVictory();
        this.checkDefeat();
    }

    checkTreasureTile() {
        const px = this.player.getPosX();
        const py = this.player.getPosY();
        const tile = this.board[px][py];
        
        if (tile.haveTreasure && tile.haveTreasure()) {
            tile.setTreasure(false);
            if (this.bundleUIManager) {
                this.bundleUIManager.showBundlePopup(px, py);
            }
        }
    }

    checkTutorialProgress() {
        if (this.config.mode !== "tutorial" || !this.tutorialManager) return;
        const tile = this.board[this.player.getPosX()][this.player.getPosY()];
        if (tile && tile.isFlaggoal()) {
            if (this.boardCtrl.currentPhase < 2 || this.boardCtrl.currentPhase > 4) {
                this.tutorialManager.nextPhase();
            }
        }
    }

    checkVictory() {
        if (this.config.mode === "tutorial") {
            if (this.boardCtrl.currentPhase === 5 && this.charCtrl.winCondition(this.board)) return;
        } else {
            if (this.charCtrl.winCondition(this.board)) {
                this.handleVictory();
                return;
            }
        }
    }

    checkDefeat() {
        if (!this.player.isAlive()) {
            this.gameInputLocked = true;
            this.handleGameOver();
        }
    }

    activateReversion() {
        return this.reversionManager.activate();
    }

    setLinkedPal(board) {
        this.linkManager.setLinkedPal(board);
    }

    getLinkedPal() {
        return this.linkManager.getLinkedPal();
    }

    onPlayerDamage() {
        this.linkManager.onPlayerDamage();
    }

    // ======================= FLAG SYSTEM =======================
    
    handleFlagDirection(direction) {
        if (!this.board) return;
        const result = this.flagManager.handleFlagDirection(
            direction, this.board, this.player, this.criticker
        );
        
        if (result && result.jumped) {
            this.charCtrl.verifyTile(this.board);
            this.boardCtrl.updateVisionAroundPlayer(this.board, this.player);
        }
    }

    // ======================= FLAG MODE SYSTEM =======================

    getFlagModeManager() { return this.flagModeManager; }
    getFlagMode() { return this.flagModeManager.getFlagMode(); }
    setFlagMode(mode) { this.flagModeManager.setFlagMode(mode); }
    cycleFlagMode() { this.flagModeManager.cycleMode(); }
    getAvailableFlagModes() { return this.flagModeManager.getAvailableModes(); }
    hasFlagModeKeychain() { return this.flagModeManager.hasAnyMode(); }
    updateFlagUI() { this.flagModeManager.updateUI(); }
    resetMemoryMarkers() { this.flagModeManager.resetMemoryMarkers(); }

    // ======================= GETTERS =======================
    
    getBoard() { return this.board; }
    getPlayer() { return this.player; }
    getZone() { return this.config.zone; }
    getDestinyTarget(board) {
        this.destinyTarget = this.keychainManager.getDestinyTarget(board, this.destinyTarget);
        return this.destinyTarget;
    }
    resetDestinyTarget() { this.destinyTarget = null; }

    // ======================= SETTERS =======================

    setRenderer(renderer) { this.renderer = renderer; }
    setTutorialManager(tm) { this.tutorialManager = tm; }
    setGameInputLocked(locked) { this.gameInputLocked = locked; }
    setLocaleManager(lm) { this.localeManager = lm; }
    isFallDamageEnabled() { return this.save.isFallDamageEnabled(); }
    isHardcoreEnabled() { return this.save.isHardcoreEnabled(); }
    getText(key) { return this.localeManager ? this.localeManager.get(key) : key; }
    
    // ======================= DELEGATED METHODS =======================

    // Scoreboard
    handleVictory() {
        this.gameInputLocked = true;
        if (this.config.mode === "daily") {
            this.save.markDailyCompleted();
        }
        this.scoreboard.show(true);
        this.lastResult = "victory";
    }

    handleGameOver() {
        this.gameInputLocked = true;
        if (this.config.mode === "daily") {
            this.save.markDailyFailed();
        }
        this.audio.playDeathSFX();
        this.gameModeManager.handleGameOver(this);
        this.scoreboard.show(false);
        this.lastResult = "gameover";
    }

    // Level progression
    async nextLevel() {
        console.log('[NextLevel] START - Current state:', {
            mode: this.mode,
            level: this.currentLevel,
            inputLocked: this.gameInputLocked,
            playerAlive: this.player?.isAlive(),
            playerHp: this.player?.getHp()
        });

        if (this.config.mode === "legacy") {
            this.gameModeManager.handleLegacyVictory(this);
            
            console.log('[NextLevel] After handleLegacyVictory:', {
                level: this.currentLevel,
                inputLocked: this.gameInputLocked,
                playerAlive: this.player?.isAlive(),
                playerHp: this.player?.getHp()
            });

            document.getElementById("scoreboard-overlay").classList.remove("active");
            if (this.config.mode !== "tutorial") {
                await this.uiManager.showLevelStartModal(this.charCtrl, this.config, this.board);
            }
            this.gameInputLocked = false;

            console.log('[NextLevel] END - Final state:', {
                inputLocked: this.gameInputLocked,
                playerAlive: this.player?.isAlive(),
                playerHp: this.player?.getHp()
            });

            // ===== UPDATE DISCORD PRESENCE =====
            const presence = buildDiscordPresence({
                ...this.config,
                level: this.currentLevel || 1
            });
            updateDiscordPresence(presence.details, presence.state, {
                largeImageKey: presence.largeImageKey
            });
        }
    }

    async retryLevel() {
        if (this.config.mode === "custom") {
            this.startGame();
        } else {
            this.levelConfigurator.configure(this);
            this.setPlayerFlagsFromBoard();
            this.keychainManager.applyResistance(this.player);
            if (this.spikeController) this.spikeController.destroy();
            this.spikeController = new SpikeController(this);
            this.spikeController.registerSpikes(this.board);
            this.turnManager.reset();
        }
        document.getElementById("scoreboard-overlay").classList.remove("active");
        if (this.config.mode !== "tutorial") {
            await this.uiManager.showLevelStartModal(this.charCtrl, this.config, this.board);
        }
        this.gameInputLocked = false;
    }

    randomizeNewGame() {
        this.gameModeManager.randomizeNewGame(this);
        
        // ===== UPDATE DISCORD PRESENCE =====
        const presence = buildDiscordPresence({
            ...this.config,
            level: this.currentLevel || 1
        });
        updateDiscordPresence(presence.details, presence.state, {
            largeImageKey: presence.largeImageKey
        });
    }

    returnToMenu() {
        if (this.config.mode === "legacy" && this.lastResult === "victory") {
            this.currentLevel++;
            if (this.isHardcoreEnabled()) {
                this.save.setHardcoreLevel(this.currentLevel);
            } else {
                this.save.setLegacyLevel(this.currentLevel);
            }
        }
        PathResolver.goToIndex();
    }

    // Modal
    showMessage(message, onClose = null) {
        window.dispatchEvent(new CustomEvent('game:showMessage', { detail: { message, onClose } }));
    }

    async pauseGame() {
        if (this.gameInputLocked) return;
        
        this.gameInputLocked = true;
        await this.uiManager.showPauseModal(this.charCtrl, this.config, this.board, this);
    }

    onTutorialPitFall() {
        if (this.tutorialManager) this.tutorialManager.onPitFall();
    }

    getTotalHazardsOnBoard() {
        if (!this.board) return 0;
        let total = 0;
        for (let i = 0; i < this.board.length; i++) {
            for (let j = 0; j < this.board.length; j++) {
                if (this.board[i][j].getHazardtype() !== "none") total++;
            }
        }
        return total;
    }

    // ======================= UTILITY METHODS =======================

    createSeededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
}
