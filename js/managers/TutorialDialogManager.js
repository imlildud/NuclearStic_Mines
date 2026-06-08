// ==============================================================
// =================== TUTORIAL DIALOG MANAGER ==================
// ==============================================================
// Handles radio dialog display, typewriter animation, and input waiting.

export class TutorialDialogManager {
    
    constructor(audioManager) {
        this.audioManager = audioManager;
        
        // DOM elements
        this.radio = null;
        this.bubble = null;
        this.textElement = null;
        
        // State
        this.isTyping = false;
        this.isVisible = false;
        this.typewriterInterval = null;
        this.radioAnimationInterval = null;
        
        // Wait handlers
        this.tapHandler = null;
        this.moveHandler = null;
        this.flaggoalInterval = null;
        this.anyInputHandler = null;
        this.anyInputInterval = null;
        this.moveInterval = null;
        this.moveTimeout = null;
    }
    
    // Initialize DOM references
    init() {
        this.radio = document.getElementById("tutorial-radio");
        this.bubble = document.getElementById("tutorial-bubble");
        this.textElement = document.getElementById("tutorial-text");
        
        // Hide by default
        this.hide();
    }
    
    // Animate radio (stretch in/out like 30s cartoons)
    startRadioAnimation() {
        if (this.radioAnimationInterval) clearInterval(this.radioAnimationInterval);
        
        let scale = 1;
        let direction = 1;
        
        this.radioAnimationInterval = setInterval(() => {
            scale += direction * 0.05;
            if (scale >= 1.15) direction = -1;
            if (scale <= 0.85) direction = 1;
            if (this.radio) {
                this.radio.style.transform = `scale(${scale})`;
            }
        }, 50);
    }
    
    stopRadioAnimation() {
        if (this.radioAnimationInterval) {
            clearInterval(this.radioAnimationInterval);
            this.radioAnimationInterval = null;
        }
        if (this.radio) {
            this.radio.style.transform = "scale(1)";
        }
    }

    stopRadioAnimationOnly() {
        if (this.radioAnimationInterval) {
            clearInterval(this.radioAnimationInterval);
            this.radioAnimationInterval = null;
        }
        if (this.radio) {
            this.radio.style.transform = "scale(1)";
        }
    }
    
    // Show radio and bubble
    show() {
        if (this.radio) this.radio.style.display = "block";
        if (this.bubble) this.bubble.style.display = "block";
        this.isVisible = true;
        this.startRadioAnimation();
        if (this.audioManager) {
            this.audioManager.playSFX("radio.mp3", false, 0.15);
        }
    }
    
    // Hide radio and bubble
    hide() {
        if (this.radio) this.radio.style.display = "none";
        if (this.bubble) this.bubble.style.display = "none";
        this.isVisible = false;
        this.stopRadioAnimation();
        this.stopTypewriter();
    }
    
    // Stop typewriter animation and sound
    stopTypewriter() {
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
        }
        this.isTyping = false;
        if (this.audioManager) {
            this.audioManager.stopWriteAnimationSFX();
        }
    }
    
    // Start writing sound loop
    startWritingSound() {
        if (this.audioManager && !this.audioManager.isScoreAnimating) {
            this.audioManager.startWriteAnimationSFX();
        }
    }
    
    // Typewriter animation
    typeWriter(text, onComplete) {
        this.show();
        this.stopTypewriter();
    
        let index = 0;
        if (this.textElement) this.textElement.textContent = "";
        this.isTyping = true;
    
        this.startWritingSound();
    
        this.typewriterInterval = setInterval(() => {
            if (index < text.length) {
                if (this.textElement) {
                    this.textElement.textContent += text[index];
                }
                index++;
            } else {
                this.stopTypewriter();
                this.stopRadioAnimationOnly();
                if (onComplete) onComplete();
            }
        }, 30);
    }
    
    // Wait for any user input (tap, click, key press, movement)
    waitForAnyInput(callback) {
        let completed = false;
        let lastX = null;
        let lastY = null;
        let checkInterval = null;
        
        const getPlayerPos = () => {
            const board = this.gameManager?.getBoard();
            const player = this.gameManager?.getPlayer();
            if (board && player) {
                return { x: player.getPosX(), y: player.getPosY() };
            }
            return null;
        };
        
        const initialPos = getPlayerPos();
        if (initialPos) {
            lastX = initialPos.x;
            lastY = initialPos.y;
        }
        
        const onInput = () => {
            if (completed) return;
            completed = true;
            cleanup();
            this.hide();
            callback();
        };
        
        checkInterval = setInterval(() => {
            if (completed) return;
            const currentPos = getPlayerPos();
            if (currentPos && (currentPos.x !== lastX || currentPos.y !== lastY)) {
                onInput();
            }
        }, 100);
        
        const cleanup = () => {
            if (checkInterval) clearInterval(checkInterval);
            document.removeEventListener("click", onInput);
            document.removeEventListener("touchstart", onInput);
            window.removeEventListener("keydown", onInput);
            window.removeEventListener("keyup", onInput);
        };
        
        document.addEventListener("click", onInput);
        document.addEventListener("touchstart", onInput);
        window.addEventListener("keydown", onInput);
        window.addEventListener("keyup", onInput);
        
        this.anyInputHandler = onInput;
        this.anyInputInterval = checkInterval;
    }
    
    // Clear any input waiters
    clearAnyInputWaiters() {
        if (this.anyInputHandler) {
            document.removeEventListener("click", this.anyInputHandler);
            document.removeEventListener("touchstart", this.anyInputHandler);
            window.removeEventListener("keydown", this.anyInputHandler);
            window.removeEventListener("keyup", this.anyInputHandler);
            this.anyInputHandler = null;
        }
        if (this.anyInputInterval) {
            clearInterval(this.anyInputInterval);
            this.anyInputInterval = null;
        }
    }
    
    // Wait for flaggoal (tile with flaggoal = true)
    waitForFlaggoal(gameManager, callback) {
        this.flaggoalInterval = setInterval(() => {
            const board = gameManager.getBoard();
            const player = gameManager.getPlayer();
            if (board && player) {
                const tile = board[player.getPosX()]?.[player.getPosY()];
                if (tile && tile.isFlaggoal()) {
                    clearInterval(this.flaggoalInterval);
                    this.flaggoalInterval = null;
                    this.hide();
                    gameManager.setGameInputLocked(false);
                    callback();
                }
            }
        }, 100);
    }
    
    // Show pit fall message
    showPitFallMessage(gameManager, onComplete) {
        this.clearWaiters();
        this.gameManager = gameManager;
        const pitMessage = gameManager.tutorialManager?.getText('tutorial.pitFall') || "HA! Watch where you're stepping...";
        this.typeWriter(pitMessage, () => {
            this.stopRadioAnimationOnly();
            this.waitForAnyInput(() => {
                console.log("Pit fall - input detected, calling onComplete");
                if (onComplete) onComplete();
            });
        });
    }
    
    // Clear all waiters
    clearWaiters() {
        if (this.tapHandler) {
            document.removeEventListener("click", this.tapHandler);
            document.removeEventListener("touchstart", this.tapHandler);
            this.tapHandler = null;
        }
        if (this.moveHandler) {
            window.removeEventListener("keydown", this.moveHandler);
            this.moveHandler = null;
        }
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
        if (this.moveTimeout) {
            clearTimeout(this.moveTimeout);
            this.moveTimeout = null;
        }
        if (this.flaggoalInterval) {
            clearInterval(this.flaggoalInterval);
            this.flaggoalInterval = null;
        }
        this.clearAnyInputWaiters();
    }
    
    // Sequence: type, wait for any input, then next
    sequence(dialogues, gameManager, onComplete) {
        let index = 0;
    
        const next = () => {
            if (index >= dialogues.length) {
                this.clearWaiters();
                this.hide();
                if (onComplete) onComplete();
                return;
            }
        
            const d = dialogues[index];
            this.typeWriter(d.text, () => {
                if (!d.waitForFlaggoal) {
                    gameManager.setGameInputLocked(false);
                }
                
                if (d.waitForFlaggoal) {
                    this.waitForFlaggoal(gameManager, next);
                } else {
                    this.waitForAnyInput(() => {
                        gameManager.setGameInputLocked(true);
                        next();
                    });
                }
            });
            index++;
        }; 
        next();
    }

    // Sequence with afterCallback support
    sequenceWithCallbacks(dialogues, gameManager, onComplete) {
        let index = 0;

        const next = () => {
            if (index >= dialogues.length) {
                this.clearWaiters();
                this.hide();
                if (onComplete) onComplete();
                return;
            }

            const d = dialogues[index];
            this.typeWriter(d.text, () => {
                if (d.afterCallback) {
                    d.afterCallback();
                }
                
                if (!d.waitForFlaggoal) {
                    gameManager.setGameInputLocked(false);
                }
                
                if (d.waitForFlaggoal) {
                    this.waitForFlaggoal(gameManager, next);
                } else {
                    this.waitForAnyInput(() => {
                        gameManager.setGameInputLocked(true);
                        next();
                    });
                }
            });
            index++;
        };
        next();
    }
}