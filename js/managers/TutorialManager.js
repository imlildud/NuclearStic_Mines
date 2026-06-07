// ==============================================================
// ==================== TUTORIAL MANAGER ========================
// ==============================================================
// Handles all tutorial-specific logic: dialogues, phase management,
// pit fall messages, and phase transitions.

import { TutorialDialogManager } from "./TutorialDialogManager.js";

export class TutorialManager {
    
    constructor(gameManager, audioManager, localeManager) {
        this.gameManager = gameManager;
        this.audioManager = audioManager;
        this.localeManager = localeManager;
        this.dialogManager = null;
        this.currentPhase = 1;

        console.log("TutorialManager received localeManager:", localeManager);
    }
    
    // Helper method to get localized text
    getText(key) {
        return this.localeManager ? this.localeManager.get(key) : key;
    }
    
    // Initialize tutorial UI and start phase 1
    init() {
        this.dialogManager = new TutorialDialogManager(this.audioManager);
        this.dialogManager.init();
        this.dialogManager.gameManager = this.gameManager;
        
        this.gameManager.setGameInputLocked(true);
        
        setTimeout(() => {
            this.startPhase1();
        }, 500);
    }
    
    // Phase 1: Movement tutorial
    startPhase1() {
        const dialogues = [
            { text: this.getText('tutorial.phase1.dialog1'), waitForTap: true },
            { text: this.getText('tutorial.phase1.dialog2'), waitForMove: true },
            { text: this.getText('tutorial.phase1.dialog3'), waitForMove: true }
        ];
        
        this.dialogManager.sequence(dialogues, this.gameManager, () => {
            this.gameManager.setGameInputLocked(false);
            console.log("Phase 1 completed");
        });
    }
    
    // Phase 2: Flag tutorial (cactus marking)
    startPhase2() {
        this.gameManager.setGameInputLocked(true);
        this.gameManager.boardCtrl.revealAllTiles(this.gameManager.board);
    
        const dialogues = [
            { text: this.getText('tutorial.phase2.dialog1'), waitForTap: true },
            { text: this.getText('tutorial.phase2.dialog2'), waitForTap: true },
            { text: this.getText('tutorial.phase2.dialog3'), waitForTap: true, afterCallback: () => {
                this.gameManager.boardCtrl.hideAllTiles(this.gameManager.board);
                this.gameManager.boardCtrl.updateVision(this.gameManager.board, this.gameManager.player);
            }},
            { text: this.getText('tutorial.phase2.dialog4'), waitForMove: true }
        ];
    
        this.dialogManager.sequenceWithCallbacks(dialogues, this.gameManager, () => {
            this.gameManager.setGameInputLocked(false);
            this.startFlagCheckingWithConfig({
                requiredMarkedCount: 1,
                damageMessage: this.getText('tutorial.phase2.damageMessage'),
                wrongFlagMessage: this.getText('tutorial.phase2.wrongFlagMessage'),
                goalWithoutMarkingMessage: this.getText('tutorial.phase2.goalWithoutMarkingMessage'),
                successMessage: this.getText('tutorial.phase2.successMessage'),
                resetBoardOnError: false
            });
        });
    }

    // Phase 3: Flag tutorial 2 (multiple cactus marking)
    startPhase3() {
        this.gameManager.setGameInputLocked(true);
        this.gameManager.player.setFlags(4);
        this.gameManager.boardCtrl.revealAllTiles(this.gameManager.board);
        this.gameManager.boardCtrl.currentPhase = 3;
    
        const dialogues = [
            { text: this.getText('tutorial.phase3.dialog1'), waitForTap: true },
            { text: this.getText('tutorial.phase3.dialog2'), waitForTap: true },
            { text: this.getText('tutorial.phase3.dialog3'), waitForTap: true, afterCallback: () => {
                this.gameManager.boardCtrl.hideAllTiles(this.gameManager.board);
                this.gameManager.boardCtrl.updateVision(this.gameManager.board, this.gameManager.player);
            }},
            { text: this.getText('tutorial.phase3.dialog4'), waitForMove: true }
        ];
    
        this.dialogManager.sequenceWithCallbacks(dialogues, this.gameManager, () => {
            this.gameManager.setGameInputLocked(false);
            this.startFlagCheckingWithConfig({
                requiredMarkedCount: 4,
                damageMessage: this.getText('tutorial.phase3.damageMessage'),
                wrongFlagMessage: this.getText('tutorial.phase3.wrongFlagMessage'),
                goalWithoutMarkingMessage: this.getText('tutorial.phase3.goalWithoutMarkingMessage'),
                successMessage: this.getText('tutorial.phase3.successMessage'),
                resetBoardOnError: true,
                resetFlags: 4
            });
        });
    }
    
    // Phase 4: Heights tutorial
    startPhase4() {
        this.gameManager.setGameInputLocked(true);
        this.gameManager.player.setFlags(4);
        this.gameManager.boardCtrl.revealAllTiles(this.gameManager.board);
        this.gameManager.boardCtrl.currentPhase = 4;

        const dialogues = [
            { text: this.getText('tutorial.phase4.dialog1'), waitForTap: true },
            { text: this.getText('tutorial.phase4.dialog2'), waitForTap: true },
            { text: this.getText('tutorial.phase4.dialog3'), waitForTap: true, afterCallback: () => {
                this.gameManager.boardCtrl.hideAllTiles(this.gameManager.board);
                this.gameManager.boardCtrl.updateVision(this.gameManager.board, this.gameManager.player);
            }},
            { text: this.getText('tutorial.phase4.dialog4'), waitForMove: true }
        ];

        this.dialogManager.sequenceWithCallbacks(dialogues, this.gameManager, () => {
            this.gameManager.setGameInputLocked(false);
            this.startFlagCheckingWithConfig({
                requiredMarkedCount: 4,
                damageMessage: this.getText('tutorial.phase4.damageMessage'),
                wrongFlagMessage: this.getText('tutorial.phase4.wrongFlagMessage'),
                goalWithoutMarkingMessage: this.getText('tutorial.phase4.goalWithoutMarkingMessage'),
                successMessage: this.getText('tutorial.phase4.successMessage'),
                resetFlags: 4,
                resetHp: 2
            });
        });
    }
    
    // Phase 5: Rescue tutorial (dummie rescue)
    startPhase5() {
        this.gameManager.setGameInputLocked(true);
        this.gameManager.player.setFlags(4);
        this.gameManager.boardCtrl.currentPhase = 5;
        this.gameManager.charCtrl.remainingGoals = 1;
        this.gameManager.boardCtrl.hideAllTiles(this.gameManager.board);
        this.gameManager.boardCtrl.updateVision(this.gameManager.board, this.gameManager.player);

        const dialogues = [
            { text: this.getText('tutorial.phase5.dialog1'), waitForTap: true },
            { text: this.getText('tutorial.phase5.dialog2'), waitForTap: true },
            { text: this.getText('tutorial.phase5.dialog3'), waitForMove: true }
        ];

        this.dialogManager.sequenceWithCallbacks(dialogues, this.gameManager, () => {
            this.gameManager.setGameInputLocked(false);
            this.startRescueChecking();
        });
    }

    // Start checking for rescue completion
    startRescueChecking() {
        let lastHp = this.gameManager.player.getHp();
        let hasRescued = false;
        let hasDelivered = false;
        let exhaustionMessageShown = false;
        let isResetting = false;
    
        const self = this;
    
        this.rescueCheckInterval = setInterval(() => {
            const board = self.gameManager.board;
            const player = self.gameManager.player;
        
            if (!board || !player || isResetting) return;
        
            // ===== CHECK FOR DAMAGE =====
            const currentHp = player.getHp();
            if (currentHp < lastHp) {
                lastHp = currentHp;
                
                if (self.rescueCheckInterval) {
                    clearInterval(self.rescueCheckInterval);
                    self.rescueCheckInterval = null;
                }
                
                self.dialogManager.clearWaiters();
                self.dialogManager.typeWriter(self.getText('tutorial.phase5.damageMessage'), () => {
                    self.dialogManager.waitForTap(() => {
                        self.dialogManager.hide();
                        
                        self.gameManager.board = self.gameManager.boardCtrl.generateBoard(5);
                        self.gameManager.charCtrl.getStartCoords(self.gameManager.board);
                        self.gameManager.boardCtrl.updateVision(self.gameManager.board, self.gameManager.player);
                        
                        self.gameManager.player.setHp(2);
                        self.gameManager.player.setRescued(0);
                        self.gameManager.player.setFlags(4);
                        
                        hasRescued = false;
                        hasDelivered = false;
                        exhaustionMessageShown = false;
                        lastHp = 2;
                        
                        self.gameManager.charCtrl.remainingGoals = 1;
                        
                        self.gameManager.setGameInputLocked(false);
                        
                        setTimeout(() => {
                            self.startRescueChecking();
                        }, 100);
                    });
                });
                self.gameManager.setGameInputLocked(true);
                return;
            }
            lastHp = currentHp;
        
            // ===== CHECK FOR EXHAUSTION =====
            const rescued = player.getRescued();
            const force = player.getForce();
        
            if (rescued >= force && !exhaustionMessageShown) {
                exhaustionMessageShown = true;
                self.dialogManager.clearWaiters();
                self.dialogManager.typeWriter(self.getText('tutorial.exhaustion'), () => {
                    self.dialogManager.waitForTap(() => {
                        self.dialogManager.hide();
                    });
                });
                self.gameManager.setGameInputLocked(true);
                setTimeout(() => {
                    self.gameManager.setGameInputLocked(false);
                }, 3000);
            }
        
            // ===== CHECK FOR DELIVERY =====
            const currentTile = board[player.getPosX()][player.getPosY()];
            if (currentTile && currentTile.isStart() && self.gameManager.charCtrl.remainingGoals === 0) {
                hasDelivered = true;
                clearInterval(self.rescueCheckInterval);
                self.rescueCheckInterval = null;
                self.dialogManager.clearWaiters();
            
                self.gameManager.charCtrl.deliverGoal(board);
            
                self.dialogManager.typeWriter(self.getText('tutorial.phase5.successMessage'), () => {
                    self.dialogManager.waitForTap(() => {
                        self.dialogManager.hide();
                        self.showManualPrompt();
                    });
                });
                self.gameManager.setGameInputLocked(true);
                return;
            }
        }, 100);
    }

    // Show manual prompt after rescue
    showManualPrompt() {
        this.dialogManager.typeWriter(this.getText('tutorial.phase5.manualPrompt'), () => {
            this.dialogManager.waitForTap(() => {
                this.dialogManager.hide();
                this.showManualButtons();
            });
        });
        this.gameManager.setGameInputLocked(true);
    }

    // Show Yes/No buttons for manual
    showManualButtons() {
        const overlay = document.createElement('div');
        overlay.id = 'manual-prompt-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 50000;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: 'Shampoos';
        `;
    
        const promptBox = document.createElement('div');
        promptBox.style.cssText = `
            background: #2a2a2a;
            border: 3px solid #6a4a2a;
            border-radius: 20px;
            padding: 4vmin 6vmin;
            text-align: center;
            color: white;
            font-size: 4vmin;
        `;
    
        promptBox.innerHTML = `
            <div style="margin-bottom: 4vmin;">${this.getText('tutorial.phase5.manualQuestion')}</div>
            <div style="display: flex; gap: 4vmin; justify-content: center;">
                <button id="manual-yes" style="padding: 1vmin 3vmin; font-family: 'Shampoos'; font-size: 3vmin; background: #4a7c59; color: white; border: none; border-radius: 8px; cursor: pointer;">${this.getText('tutorial.phase5.yes')}</button>
                <button id="manual-no" style="padding: 1vmin 3vmin; font-family: 'Shampoos'; font-size: 3vmin; background: #7c4a4a; color: white; border: none; border-radius: 8px; cursor: pointer;">${this.getText('tutorial.phase5.no')}</button>
            </div>
        `;
    
        overlay.appendChild(promptBox);
        document.body.appendChild(overlay);
    
        const yesBtn = document.getElementById('manual-yes');
        const noBtn = document.getElementById('manual-no');
    
        const closeOverlay = () => {
            overlay.remove();
            this.gameManager.setGameInputLocked(false);
            this.completeTutorial();
        };
    
        const lang = this.localeManager?.currentLocale || 'en';
        const manualFile = lang === 'es' 
            ? '../../NuclearStic Manual(es).pdf' 
            : '../../NuclearStic Manual(en).pdf';
    
        yesBtn.addEventListener('click', () => {
            window.open(manualFile, '_blank');
            closeOverlay();
        });
    
        noBtn.addEventListener('click', closeOverlay);
    }

    // Generic flag checking for phases 2, 3, 4
    startFlagCheckingWithConfig(config) {
        const {
            requiredMarkedCount = 1,
            damageMessage = "Come on, it's not that hard, idiot. Running over to hug a cactus isn't exactly a good solution. Try again.",
            wrongFlagMessage = "Do you have some kind of problem? Try again.",
            goalWithoutMarkingMessage = "You haven't marked anything yet. Go place the flag...",
            successMessage = "Well done. Now head for the goal.",
            resetFlags = 4,
            resetHp = 2
        } = config;
    
        // Clear any existing interval
        if (this.flagCheckInterval) {
            clearInterval(this.flagCheckInterval);
            this.flagCheckInterval = null;
        }
    
        let lastHp = this.gameManager.player.getHp();
        let hasFlaggedCorrectly = false;
        let wrongFlagAttempts = 0;
        let isResetting = false;
    
        const self = this;
    
        this.flagCheckInterval = setInterval(() => {
            const board = self.gameManager.board;
            const player = self.gameManager.player;
        
            if (!board || !player || isResetting) return;
        
            // ===== RESET FUNCTION =====
            const resetPhase = (shouldResetBoard) => {
                if (isResetting) return;
                isResetting = true;
            
                clearInterval(self.flagCheckInterval);
                self.flagCheckInterval = null;
            
                if (shouldResetBoard) {
                    // Reset entire board (new instance)
                    self.gameManager.board = self.gameManager.boardCtrl.generateBoard(5);
                    self.gameManager.charCtrl.getStartCoords(self.gameManager.board);
                    self.gameManager.boardCtrl.updateVision(self.gameManager.board, self.gameManager.player);
                } else {
                    // Reset position only (keep flags that were correctly placed)
                    self.gameManager.charCtrl.getStartCoords(board);
                    self.gameManager.boardCtrl.updateVisionAroundPlayer(board, self.gameManager.player);
                }
            
                // Reset health and flags
                self.gameManager.player.setHp(resetHp);
                self.gameManager.player.setFlags(resetFlags);
            
                // Reset tracking variables
                hasFlaggedCorrectly = false;
                wrongFlagAttempts = 0;
                lastHp = resetHp;
            
                setTimeout(() => {
                    isResetting = false;
                    self.gameManager.setGameInputLocked(false);
                    self.startFlagCheckingWithConfig(config);
                }, 100);
            };
        
            // ===== CHECK FOR DAMAGE =====
            const currentHp = player.getHp();
            if (currentHp < lastHp) {
                lastHp = currentHp;
                clearInterval(self.flagCheckInterval);
                self.flagCheckInterval = null;
                self.dialogManager.clearWaiters();
                self.dialogManager.typeWriter(damageMessage, () => {
                    self.dialogManager.waitForTap(() => {
                        self.dialogManager.hide();
                        resetPhase(true);
                    });
                });
                self.gameManager.setGameInputLocked(true);
                return;
            }
            lastHp = currentHp;
        
            // ===== CHECK IF PLAYER REACHED GOAL WITHOUT MARKING =====
            const currentTile = board[player.getPosX()][player.getPosY()];
            if (currentTile && currentTile.isFlaggoal() && !hasFlaggedCorrectly) {
                clearInterval(self.flagCheckInterval);
                self.flagCheckInterval = null;
                self.dialogManager.clearWaiters();
                self.dialogManager.typeWriter(goalWithoutMarkingMessage, () => {
                    self.dialogManager.waitForTap(() => {
                        self.dialogManager.hide();
                        resetPhase(false);
                    });
                });
                self.gameManager.setGameInputLocked(true);
                return;
            }
        
            // ===== CHECK FOR CORRECTLY MARKED HAZARDS =====
            let markedCount = 0;
            for (let i = 0; i < board.length; i++) {
                for (let j = 0; j < board.length; j++) {
                    if (board[i][j].isMarked()) markedCount++;
                }
            }
        
            if (markedCount >= requiredMarkedCount && !hasFlaggedCorrectly) {
                hasFlaggedCorrectly = true;
                clearInterval(self.flagCheckInterval);
                self.flagCheckInterval = null;
                self.dialogManager.typeWriter(successMessage, () => {
                    self.gameManager.setGameInputLocked(false);
                    self.dialogManager.waitForMove(() => {
                        self.dialogManager.hide();
                        self.dialogManager.waitForFlaggoal(self.gameManager, () => {
                            self.nextPhase();
                        });
                    });
                });
                self.gameManager.setGameInputLocked(true);
                return;
            }
        
            // ===== CHECK FOR WRONG FLAGS =====
            let wrongFlagCount = 0;
            for (let i = 0; i < board.length; i++) {
                for (let j = 0; j < board.length; j++) {
                    const tile = board[i][j];
                    if (tile.isFlagged() && tile.getHazardtype() === "none" && !tile.isMarked()) {
                        wrongFlagCount++;
                    }
                }
            }
        
            if (wrongFlagCount > wrongFlagAttempts) {
                wrongFlagAttempts = wrongFlagCount;
                clearInterval(self.flagCheckInterval);
                self.flagCheckInterval = null;
                self.dialogManager.clearWaiters();
                self.dialogManager.typeWriter(wrongFlagMessage, () => {
                    self.dialogManager.waitForTap(() => {
                        self.dialogManager.hide();
                        resetPhase(true);
                    });
                });
                self.gameManager.setGameInputLocked(true);
                return;
            }
        }, 100);
    }
    
    // Called when player falls into pit
    onPitFall() {
        this.gameManager.setGameInputLocked(true);
    
        this.gameManager.charCtrl.getStartCoords(this.gameManager.board);
        this.gameManager.boardCtrl.updateVision(this.gameManager.board, this.gameManager.player);
    
        this.dialogManager.showPitFallMessage(this.gameManager, () => {
            console.log("Pit fall message completed, unlocking input");
            this.gameManager.setGameInputLocked(false);
        });
    }
    
    // Advance to next phase
    nextPhase() {
        this.currentPhase++;
    
        if (this.currentPhase > 5) {
            this.completeTutorial();
            return;
        }
    
        this.gameManager.boardCtrl.currentPhase = this.currentPhase;
    
        // Load next phase board
        this.gameManager.board = this.gameManager.boardCtrl.generateBoard(5);
        this.gameManager.charCtrl.getStartCoords(this.gameManager.board);
        this.gameManager.boardCtrl.updateVision(this.gameManager.board, this.gameManager.player);
    
        // Reset player stats
        this.gameManager.player.setHp(2);
        while (this.gameManager.player.getRescued() > 0) {
            this.gameManager.player.decrementRescue(1);
        }
    
        this.gameManager.setGameInputLocked(false);
    
        // Start appropriate phase
        switch(this.currentPhase) {
            case 2: this.startPhase2(); break;
            case 3: this.startPhase3(); break;
            case 4: this.startPhase4(); break;
            case 5: this.startPhase5(); break;
        }
    }
    
    completeTutorial() {
        this.gameManager.save.setTutorialCompleted(true);
        alert(this.getText('menu.tutorialCompleted'));
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 500);
    }
}