// ==============================================================
// ==================== TUTORIAL MANAGER ========================
// ==============================================================
// Handles all tutorial-specific logic: dialogues, phase management,
// pit fall messages, and phase transitions.

import { TutorialDialogManager } from "./TutorialDialogManager.js";

export class TutorialManager {
    
    constructor(gameManager, audioManager) {
        this.gameManager = gameManager;
        this.audioManager = audioManager;
        this.dialogManager = null;
        this.currentPhase = 1;
    }
    
    // Initialize tutorial UI and start phase 1
    init() {
        this.dialogManager = new TutorialDialogManager(this.audioManager);
        this.dialogManager.init();
        this.dialogManager.gameManager = this.gameManager;
        
        this.gameManager.setGameInputLocked(true);
        
        // Start phase 1 after a short delay
        setTimeout(() => {
            this.startPhase1();
        }, 500);
    }
    
    // Phase 1: Movement tutorial
    startPhase1() {
        const dialogues = [
            { text: "Hello, rescuer. Welcome to your training course, where you'll get ready to head out into the wasteland and rescue people.", waitForTap: true },
            { text: "We'll start with the basics. Learn how to walk... You were supposed to have learned that years ago... whatever. Use the 'WASD' keys to move around.", waitForMove: true },
            { text: "Good. Reach that marker ahead, and move carefully. Some things out there are a pain to get through, so it's usually best to go around them.", waitForMove: true }
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
            { text: "Great. Now that you know how to walk, you should learn how to use your flags wisely. Below your icon, you'll find a counter showing how many you have available.", waitForTap: true },
            { text: "The wasteland out there is full of Hazards, and you'll want to avoid them. To identify them, you'll use the Hazard Count numbers, which indicate whether there are any Hazards in adjacent Tiles.", waitForTap: true },
            { text: "Use the 🡰🡱🡳🡲 controls to place flags. They only work on hidden Tiles, the ones you can't see yet.", waitForTap: true, afterCallback: () => {
                this.gameManager.boardCtrl.hideAllTiles(this.gameManager.board);
                this.gameManager.boardCtrl.updateVision(this.gameManager.board, this.gameManager.player);
            }},
            { text: "Got it? Go mark that damn Hazard, then head for the goal.", waitForMove: true }
        ];
    
        this.dialogManager.sequenceWithCallbacks(dialogues, this.gameManager, () => {
            this.gameManager.setGameInputLocked(false);
            this.startFlagCheckingWithConfig({
                requiredMarkedCount: 1,
                damageMessage: "Come on, it's not that hard, idiot. Running over to hug a cactus isn't exactly a good solution. Try again.",
                wrongFlagMessage: "Do you have some kind of problem? Try again.",
                goalWithoutMarkingMessage: "You haven't marked anything yet. Go place the flag...",
                successMessage: "Well done. Now head for the goal.",
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
            { text: "Now that you've mastered the art of flagging, you need to understand that Hazards are completely unpredictable.", waitForTap: true },
            { text: "No one ever knows exactly where they are. If several of them are clustered in nearby Tiles, the Hazard Count will increase.", waitForTap: true },
            { text: "You'll need to sharpen your deductive skills if you want to mark them or avoid them.", waitForTap: true, afterCallback: () => {
                this.gameManager.boardCtrl.hideAllTiles(this.gameManager.board);
                this.gameManager.boardCtrl.updateVision(this.gameManager.board, this.gameManager.player);
            }},
            { text: "Use all your flags and mark every one of them.", waitForMove: true }
        ];
    
    this.dialogManager.sequenceWithCallbacks(dialogues, this.gameManager, () => {
        this.gameManager.setGameInputLocked(false);
        this.startFlagCheckingWithConfig({
            requiredMarkedCount: 4,
            damageMessage: "Read the damn numbers. Out in the wasteland, you'd be scattered across a hundred pieces by now.",
            wrongFlagMessage: "Do you think flags grow on trees? Quit wasting them, damn it.",
            goalWithoutMarkingMessage: "You haven't marked all the hazards yet. Keep searching.",
            successMessage: "All hazards marked! Well done. Now head for the goal.",
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
            { text: "Now that I can trust you to understand the numbers, you need to know that the terrain out there isn't flat. You'll face valleys, hills, and terrain challenging enough to make you regret getting out of bed.", waitForTap: true },
            { text: "I've put this course together with different elevations so you can get used to how they look. Don't try to drop more than two levels at once, or you'll break your damn legs.", waitForTap: true },
            { text: "Mark the Hazards I've left up there, then make your way to the goal.", waitForTap: true, afterCallback: () => {
                this.gameManager.boardCtrl.hideAllTiles(this.gameManager.board);
                this.gameManager.boardCtrl.updateVision(this.gameManager.board, this.gameManager.player);
            }},
            { text: "Mark the Hazards I've left up there, then make your way to the goal.", waitForMove: true }
        ];

        this.dialogManager.sequenceWithCallbacks(dialogues, this.gameManager, () => {
            this.gameManager.setGameInputLocked(false);
            this.startFlagCheckingWithConfig({
                requiredMarkedCount: 4,
                damageMessage: "I'm not sure whether I should be worried about your mental state at this point.",
                wrongFlagMessage: "Keep practicing. You're going to need it...",
                goalWithoutMarkingMessage: "You still haven't marked them all. Keep looking.",
                successMessage: "Fantastic. I'm proud of you. Head to the goal for the final challenge. I've got something special prepared.",
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
            { text: "Your job out there is to find stranded children and bring them back to the starting point. Easy enough, right?", waitForTap: true },
            { text: "For this final test, I want you to simulate a rescue. I've set up a dummy for you to retrieve and bring back. Good luck.", waitForTap: true },
            { text: "Go find the dummy and bring it back to the start. And try not to kill yourself on the way.", waitForMove: true }
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
                self.dialogManager.typeWriter("If you bring back a child, I doubt they'll want to be rescued by someone with a strange obsession with hugging cacti. Please stop doing that.", () => {
                    self.dialogManager.waitForTap(() => {
                        self.dialogManager.hide();
                        
                        // Reset the entire board for phase 5
                        self.gameManager.board = self.gameManager.boardCtrl.generateBoard(5);
                        self.gameManager.charCtrl.getStartCoords(self.gameManager.board);
                        self.gameManager.boardCtrl.updateVision(self.gameManager.board, self.gameManager.player);
                        
                        // Reset player stats
                        self.gameManager.player.setHp(2);
                        self.gameManager.player.setRescued(0);
                        self.gameManager.player.setFlags(4);
                        
                        // Reset tracking variables
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
        
            // ===== CHECK FOR EXHAUSTION (tired icon appears) =====
            const rescued = player.getRescued();
            const force = player.getForce();
        
            if (rescued >= force && !exhaustionMessageShown) {
                exhaustionMessageShown = true;
                self.dialogManager.clearWaiters();
                self.dialogManager.typeWriter("Heavy, isn't it? See those sweat drops on your icon? That means you're exhausted and can't carry any more children. If there were others to rescue, you'd have to drop off the ones you're carrying and go back for the rest.", () => {
                    self.dialogManager.waitForTap(() => {
                        self.dialogManager.hide();
                    });
                });
                self.gameManager.setGameInputLocked(true);
                setTimeout(() => {
                    self.gameManager.setGameInputLocked(false);
                }, 3000);
            }
        
            // ===== CHECK FOR DELIVERY (returned dummy to start) =====
            const currentTile = board[player.getPosX()][player.getPosY()];
            if (currentTile && currentTile.isStart() && self.gameManager.charCtrl.remainingGoals === 0) {
                hasDelivered = true;
                clearInterval(self.rescueCheckInterval);
                self.rescueCheckInterval = null;
                self.dialogManager.clearWaiters();
            
                // Deliver the rescued dummy
                self.gameManager.charCtrl.deliverGoal(board);
            
                // Show success message
                self.dialogManager.typeWriter("That's everything I can teach you. Out there, you'll find plenty of things you won't see in this boring little training yard. Good luck...", () => {
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
        this.dialogManager.typeWriter("Oh, and by the way, I've got a manual that might actually keep you alive if you feel like reading it.", () => {
            this.dialogManager.waitForTap(() => {
                this.dialogManager.hide();
                this.showManualButtons();
            });
        });
        this.gameManager.setGameInputLocked(true);
    }

    // Show Yes/No buttons for manual
    showManualButtons() {
        // Create modal overlay for manual prompt
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
            <div style="margin-bottom: 4vmin;">Read the manual?</div>
            <div style="display: flex; gap: 4vmin; justify-content: center;">
                <button id="manual-yes" style="padding: 1vmin 3vmin; font-family: 'Shampoos'; font-size: 3vmin; background: #4a7c59; color: white; border: none; border-radius: 8px; cursor: pointer;">Yes</button>
                <button id="manual-no" style="padding: 1vmin 3vmin; font-family: 'Shampoos'; font-size: 3vmin; background: #7c4a4a; color: white; border: none; border-radius: 8px; cursor: pointer;">No</button>
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
    
        yesBtn.addEventListener('click', () => {
            // Open the manual PDF
            window.open('../../NuclearStic Manual(es).pdf', '_blank');
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
        // Lock input immediately
        this.gameManager.setGameInputLocked(true);
    
        // Reset position
        this.gameManager.charCtrl.getStartCoords(this.gameManager.board);
        this.gameManager.boardCtrl.updateVision(this.gameManager.board, this.gameManager.player);
    
        // Show message (will auto-complete after 5 seconds)
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
        alert("Tutorial completed! Returning to main menu.");
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 500);
    }
}