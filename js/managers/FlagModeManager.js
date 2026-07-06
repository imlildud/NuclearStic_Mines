// ==============================================================
// ==================== FLAG MODE MANAGER ========================
// ==============================================================
// Manages flag modes (Revelation, Memory, Purity)

import { PathResolver } from "../utils/PathResolver.js";

export class FlagModeManager {
    
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.flagMode = 0; // 0=normal, 1=revelation, 2=memory, 3=purity
        this.memoryMarkers = 3;
    }

    // ======================= GETTERS / SETTERS =======================
    
    getFlagMode() { return this.flagMode; }
    setFlagMode(mode) {
        this.flagMode = mode;
        this.updateUI();
        console.log('[FlagMode] Mode set to:', mode);
    }

    // ======================= AVAILABLE MODES =======================
    
    getAvailableModes() {
        const player = this.gameManager.getPlayer();
        if (!player) return [0];
        
        const modes = [0]; // Normal always available
        
        if (player.hasKeychain('revelation') && player.getKeychainUses('revelation') > 0) {
            modes.push(1);
        }
        if (player.hasKeychain('memory')) {
            modes.push(2);
        }
        if (player.hasKeychain('purity') && player.getKeychainUses('purity') > 0) {
            modes.push(3);
        }
        
        return modes;
    }

    hasAnyMode() {
        return this.getAvailableModes().length > 1;
    }

    cycleMode() {
        const available = this.getAvailableModes();
        const currentIndex = available.indexOf(this.flagMode);
        const nextIndex = (currentIndex + 1) % available.length;
        this.setFlagMode(available[nextIndex]);
    }

    // ======================= UI UPDATE =======================
    
    updateUI() {
        const player = this.gameManager.getPlayer();
        if (!player) return;
        
        const flagsText = document.getElementById("hud-flags-text");
        const flagsIcon = document.getElementById("hud-flags-icon");
        const swampBtn = document.getElementById("swamp-btn");
        
        if (!flagsText || !flagsIcon) return;
        
        let text = '';
        let icon = '';
        let isActive = false;
        
        switch(this.flagMode) {
            case 1: // Revelation
                icon = 'remainingreveals.png';
                text = player.getKeychainUses('revelation') || 0;
                isActive = true;
                break;
            case 2: // Memory
                icon = 'remainingmemories.png';
                const used = this.countMemoryMarkers();
                text = Math.max(0, 3 - used);
                isActive = true;
                break;
            case 3: // Purity
                icon = 'remainingcleans.png';
                text = player.getKeychainUses('purity') || 0;
                isActive = true;
                break;
            default: // Normal
                icon = 'remainingflags.png';
                text = player.getFlags();
                isActive = false;
                break;
        }
        
        flagsIcon.src = PathResolver.resolveAsset('gameStats', icon);
        flagsText.textContent = text;
        
        if (swampBtn) {
            swampBtn.classList.toggle('active', isActive);
        }

        this.updateSwampButtonUI();
    }

    updateSwampButtonUI() {
        const swampBtn = document.getElementById("swamp-btn");
        if (!swampBtn) return;
        
        const hasModes = this.hasAnyMode();
        const isActive = this.flagMode !== 0;
        
        if (hasModes && isActive) {
            swampBtn.className = 'swamp-btn active';
        } else if (hasModes) {
            swampBtn.className = 'swamp-btn';
        } else {
            swampBtn.className = 'swamp-btn disabled';
        }
    }

    // ======================= MEMORY MARKERS =======================
    
    countMemoryMarkers() {
        const board = this.gameManager.getBoard();
        if (!board) return 0;
        let count = 0;
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                if (board[i][j].hasMemoryMarker()) count++;
            }
        }
        return count;
    }

    resetMemoryMarkers() {
        const board = this.gameManager.getBoard();
        if (!board) return;
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                board[i][j].clearMemoryMarker();
            }
        }
        this.updateUI();
    }

    // ======================= MODE HANDLERS =======================
    
    // Called when a mode is used up
    checkDepleted() {
        const player = this.gameManager.getPlayer();
        if (!player) return;
        
        let shouldReset = false;
        
        // Check if current mode is depleted
        if (this.flagMode === 1 && player.getKeychainUses('revelation') === 0) {
            shouldReset = true;
            console.log('[FlagMode] Revelation depleted, switching to normal');
        }
        if (this.flagMode === 3 && player.getKeychainUses('purity') === 0) {
            shouldReset = true;
            console.log('[FlagMode] Purity depleted, switching to normal');
        }
        
        if (shouldReset) {
            this.setFlagMode(0);
            // Update UI to reflect normal mode
            this.updateUI();
            // Update swamp button state
            this.updateSwampButtonUI();
        }
    }
}