// ==============================================================
// ==================== CRITICKER DIALOGS =======================
// ==============================================================
// Handles Criticker dialog texts and sequences.
// Uses localeManager for multi-language support.

export class CritickerDialogs {
    
    constructor(localeManager, audioManager) {
        this.localeManager = localeManager;
        this.audioManager = audioManager;
        this.dialogManager = null;
    }
    
    // Get localized text for a specific dialog key
    getText(key) {
        return this.localeManager ? this.localeManager.get(key) : key;
    }
    
    // Initialize dialog manager
    async init() {
        const { CritickerDialogManager } = await import("./CritickerDialogManager.js");
        this.dialogManager = new CritickerDialogManager(this.audioManager, {
            speakerIcon: "criticized"
        });
        this.dialogManager.init();
        console.log("[CritickerDialogs] Initialized");
    }
    
    // Destroy dialog manager
    destroy() {
        if (this.dialogManager) {
            this.dialogManager.destroy();
            this.dialogManager = null;
        }
    }
    
    // Show infection dialogues
    showInfection(goal, onComplete) {
        if (!this.dialogManager) {
            console.log("[CritickerDialogs] No dialogManager, creating new one");
            this.init();
            if (!this.dialogManager) {
                if (onComplete) onComplete();
                return;
            }
        }
        
        const dialogues = [
            { text: this.getText('criticker.infection.step1') },
            { text: this.getText('criticker.infection.step2') },
            { text: this.getText('criticker.infection.step3').replace('{goal}', goal) }
        ];
        
        this.dialogManager.sequence(dialogues, () => {
            // Just hide, don't destroy
            if (this.dialogManager) {
                this.dialogManager.hide();
            }
            if (onComplete) onComplete();
        });
    }

    // Show success dialogue
    showSuccess(onComplete) {
        if (!this.dialogManager) {
            console.log("[CritickerDialogs] No dialogManager for success, skipping");
            if (onComplete) onComplete();
            return;
        }
        
        const dialogues = [
            { text: this.getText('criticker.success.main') },
            { text: this.getText('criticker.success.farewell') }
        ];
        
        this.dialogManager.sequence(dialogues, () => {
            if (this.dialogManager) {
                this.dialogManager.hide();
            }
            if (onComplete) onComplete();
        });
    }

    // Show failure dialogue
    showFailure(gameManager, onComplete) {
        if (!this.dialogManager) {
            console.log("[CritickerDialogs] No dialogManager for failure, skipping");
            if (onComplete) onComplete();
            return;
        }
        
        const self = this;
        let damageApplied = false;
        
        const dialogues = [
            { 
                text: this.getText('criticker.failure.main'),
                afterCallback: () => {
                    if (!damageApplied) {
                        damageApplied = true;
                        console.log("[CritickerDialogs] Applying damage after first dialogue");
                        
                        const charCtrl = gameManager.charCtrl;
                        if (charCtrl && typeof charCtrl.hurtCharacter === 'function') {
                            charCtrl.hurtCharacter();
                        } else {
                            console.warn("[CritickerDialogs] charCtrl.hurtCharacter not available");
                        }
                    }
                }
            },
            { text: this.getText('criticker.failure.damage') }
        ];
        
        this.dialogManager.sequenceWithCallbacks(dialogues, () => {
            if (this.dialogManager) {
                this.dialogManager.hide();
            }
            if (onComplete) onComplete();
        });
    }

    // Show damage abandonment dialogue
    showDamageAbandon(onComplete) {
        if (!this.dialogManager) {
            console.log("[CritickerDialogs] No dialogManager for damage abandon, skipping");
            if (onComplete) onComplete();
            return;
        }
        
        const dialogues = [
            { text: this.getText('criticker.damage.main') },
            { text: this.getText('criticker.damage.farewell') }
        ];
        
        this.dialogManager.sequence(dialogues, () => {
            if (this.dialogManager) {
                this.dialogManager.hide();
            }
            if (onComplete) onComplete();
        });
    }
}