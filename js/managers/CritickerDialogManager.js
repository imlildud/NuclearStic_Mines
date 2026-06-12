// ==============================================================
// =================== CRITICKER DIALOG MANAGER =================
// ==============================================================
// Handles Criticker dialog display, typewriter animation, and input waiting.
// Reusable for any entity that needs to speak (no radio icon).

import { PathResolver } from "../utils/PathResolver.js";

export class CritickerDialogManager {
    
    constructor(audioManager, options = {}) {
        this.audioManager = audioManager;
        
        // DOM elements
        this.bubble = null;
        this.textElement = null;
        this.avatarIcon = null;
        
        // Customization options
        this.speakerIcon = options.speakerIcon || 'criticized';
        
        // State
        this.isTyping = false;
        this.isVisible = false;
        this.typewriterInterval = null;
        this.avatarAnimationInterval = null;
        
        // Wait handlers
        this.anyInputHandler = null;
    }
    
    // Initialize DOM references
    init() {
        // Create dialog container if it doesn't exist
        let container = document.getElementById("criticker-dialog-container");
        if (!container) {
            container = document.createElement('div');
            container.id = 'criticker-dialog-container';
            container.style.cssText = `
                position: fixed;
                bottom: 20vmin;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10006;
                display: flex;
                flex-direction: row;
                align-items: flex-start;
                gap: 2vmin;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        
        // Create avatar icon (this one animates)
        this.avatarIcon = document.createElement('img');
        this.avatarIcon.id = 'criticker-avatar';
        this.avatarIcon.style.cssText = `
            width: 16vmin;
            height: auto;
            cursor: pointer;
            transition: transform 0.05s ease-out;
            pointer-events: auto;
            image-rendering: pixelated;
        `;
        this.avatarIcon.src = PathResolver.resolveAsset('gameStats', `${this.speakerIcon}.png`);
        container.appendChild(this.avatarIcon);
        
        // Create bubble (no animation)
        this.bubble = document.createElement('div');
        this.bubble.id = 'criticker-bubble';
        this.bubble.style.cssText = `
            position: relative;
            background: url('${PathResolver.resolveAsset('gameRadio', 'bubble.png')}') no-repeat center center;
            background-size: contain;
            width: 60vmin;
            min-height: 20vmin;
            padding: 6vmin 5vmin 5vmin 8vmin;
            font-family: 'Shampoos';
            font-size: 2.5vmin;
            color: #1a1a1a;
            text-shadow: none;
            pointer-events: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
        `;
        
        this.textElement = document.createElement('div');
        this.textElement.id = 'criticker-text';
        this.textElement.style.cssText = `
            width: 100%;
            word-wrap: break-word;
            line-height: 1.4;
        `;
        this.bubble.appendChild(this.textElement);
        container.appendChild(this.bubble);
        
        // Hide by default
        this.hide();
    }
    
    // Animate only the avatar icon (bobble head effect)
    startAvatarAnimation() {
        if (this.avatarAnimationInterval) clearInterval(this.avatarAnimationInterval);
        
        let scale = 1;
        let direction = 1;
        
        this.avatarAnimationInterval = setInterval(() => {
            scale += direction * 0.03;
            if (scale >= 1.1) direction = -1;
            if (scale <= 0.9) direction = 1;
            if (this.avatarIcon) {
                this.avatarIcon.style.transform = `scale(${scale})`;
            }
        }, 80);
    }
    
    stopAvatarAnimation() {
        if (this.avatarAnimationInterval) {
            clearInterval(this.avatarAnimationInterval);
            this.avatarAnimationInterval = null;
        }
        if (this.avatarIcon) {
            this.avatarIcon.style.transform = "scale(1)";
        }
    }
    
    // Show dialog
    show() {
        if (this.bubble) this.bubble.style.display = "flex";
        if (this.avatarIcon) this.avatarIcon.style.display = "block";
        this.isVisible = true;
        this.startAvatarAnimation();
        if (this.audioManager) {
            this.audioManager.playSFX("criticker.mp3", false, 0.15);
        }
    }
    
    // Hide dialog
    hide() {
        if (this.bubble) this.bubble.style.display = "none";
        if (this.avatarIcon) this.avatarIcon.style.display = "none";
        this.isVisible = false;
        this.stopAvatarAnimation();
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
                if (onComplete) onComplete();
            }
        }, 30);
    }
    
    // Wait for any user input (tap, click, key press)
    waitForAnyInput(callback) {
        let completed = false;
        
        const onInput = () => {
            if (completed) return;
            completed = true;
            cleanup();
            this.hide();
            callback();
        };
        
        const cleanup = () => {
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
    }
    
    // Clear any input waiters
    clearWaiters() {
        if (this.anyInputHandler) {
            document.removeEventListener("click", this.anyInputHandler);
            document.removeEventListener("touchstart", this.anyInputHandler);
            window.removeEventListener("keydown", this.anyInputHandler);
            window.removeEventListener("keyup", this.anyInputHandler);
            this.anyInputHandler = null;
        }
        this.stopTypewriter();
        this.stopAvatarAnimation();
    }
    
    // Sequence: type, wait for any input, then next
    sequence(dialogues, onComplete) {
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
                this.waitForAnyInput(() => {
                    next();
                });
            });
            index++;
        }; 
        next();
    }
    
    // Destroy the dialog manager (remove DOM elements)
    destroy() {
        this.clearWaiters();
        const container = document.getElementById("criticker-dialog-container");
        if (container) {
            container.remove();
        }
    }

    // Sequence with afterCallback support (for damage between dialogues)
    sequenceWithCallbacks(dialogues, onComplete) {
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
                // Ejecutar afterCallback si existe
                if (d.afterCallback) {
                    d.afterCallback();
                }
                this.waitForAnyInput(() => {
                    next();
                });
            });
            index++;
        }; 
        next();
    }
}