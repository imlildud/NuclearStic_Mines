// ==============================================================
// ==================== CRITICKER CONTROLLER ====================
// ==============================================================
// Handles all Criticker-related logic: state, dialogues, and callbacks.

export class CritickerController {
    
    constructor(gameManager, localeManager, audioManager) {
        this.gameManager = gameManager;
        this.localeManager = localeManager;
        this.audioManager = audioManager;
        this.dialogs = null;
        this.isActive = false;
    }
    
    // Initialize dialog handler
    async init() {
        const { CritickerDialogs } = await import("../../managers/CritickerDialogs.js");
        this.dialogs = new CritickerDialogs(this.localeManager, this.audioManager);
        await this.dialogs.init();
        console.log("[CritickerController] Initialized");
    }
    
    // Activate Criticker when stepping on nest
    activate(goal) {
        this.isActive = true;
        
        // Play crunch sound
        if (this.audioManager) {
            this.audioManager.playCrunchSFX();
        }
        
        // Show infection dialogues
        if (this.dialogs) {
            this.gameManager.setGameInputLocked(true);
            this.dialogs.showInfection(goal, () => {
                this.gameManager.setGameInputLocked(false);
            });
        }
    }
    
    // Deactivate Criticker
    deactivate() {
        this.isActive = false;
    }
    
    // En markProgress
    markProgress(currentProgress, goal) {
        console.log("[CritickerController] markProgress - isActive:", this.isActive, "current:", currentProgress, "goal:", goal);
        const newProgress = currentProgress + 1;
        
        if (newProgress >= goal) {
            console.log("[CritickerController] Goal reached! Calling complete()");
            this.complete();
        }
        
        return newProgress;
    }

    // En complete
    complete() {
        console.log("[CritickerController] complete() - isActive:", this.isActive);
        if (!this.isActive) return;
        
        this.isActive = false;
        
        if (this.dialogs) {
            console.log("[CritickerController] Showing success dialog");
            this.gameManager.setGameInputLocked(true);
            this.dialogs.showSuccess(() => {
                this.gameManager.setGameInputLocked(false);
            });
        } else {
            console.log("[CritickerController] No dialogs instance!");
        }
    }

    // Handle failure (wrong flag)
    fail() {
        console.log("[CritickerController] fail() - isActive:", this.isActive);
        if (!this.isActive) return;
        
        this.isActive = false;
        
        if (this.dialogs) {
            this.gameManager.setGameInputLocked(true);
            this.dialogs.showFailure(this.gameManager, () => {
                this.gameManager.setGameInputLocked(false);
            });
        } else {
            this.gameManager.setGameInputLocked(false);
        }
    }

    // En abandon
    abandon() {
        console.log("[CritickerController] abandon() - isActive:", this.isActive);
        if (!this.isActive) return;
        
        this.isActive = false;
        
        if (this.dialogs) {
            console.log("[CritickerController] Showing damage abandon dialog");
            this.gameManager.setGameInputLocked(true);
            this.dialogs.showDamageAbandon(() => {
                this.gameManager.setGameInputLocked(false);
            });
        } else {
            console.log("[CritickerController] No dialogs instance!");
        }
    }
    
    // Clean up
    destroy() {
        if (this.dialogs) {
            this.dialogs.destroy();
        }
    }
}