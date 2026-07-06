// ==============================================================
// ==================== REVERSION MANAGER ========================
// ==============================================================
// Handles save state, rewind effect, and reversion logic

export class ReversionManager {
    
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.isRewinding = false;
        this.savedState = null;
    }

    // ======================= USES =======================
    
    getMaxUses() {
        return 3;
    }

    getUses(player) {
        return player.getKeychainUses('reversion') || 0;
    }

    hasUses(player) {
        return this.getUses(player) > 0;
    }

    // ======================= SAVE STATE =======================
    
    saveState() {
        const board = this.gameManager.getBoard();
        const player = this.gameManager.getPlayer();
        
        const markedHazards = [];
        let totalHazards = 0;
        let markedCount = 0;
        
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                const tile = board[i][j];
                if (tile.getHazardtype() !== "none") {
                    totalHazards++;
                    if (tile.isMarked()) {
                        markedHazards.push({ x: i, y: j });
                        markedCount++;
                    }
                }
            }
        }
        const reversionUses = player.getKeychainUses('reversion') || 0;
        
        this.savedState = {
            markedHazards: markedHazards,
            markedCount: markedCount,
            totalHazards: totalHazards,
            flags: player.getFlags(),
            reversionUses: reversionUses - 1,
        };
        
        console.log('[Reversion] State saved - marked:', markedCount, 'total:', totalHazards);
    }

    // ======================= RESTORE STATE =======================
    
    restoreState() {
        if (!this.savedState) {
            console.warn('[Reversion] No state to restore');
            return false;
        }
        
        const player = this.gameManager.getPlayer();
        const board = this.gameManager.getBoard();
        
        // Clear all marked hazards
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                const tile = board[i][j];
                if (tile.isMarked()) {
                    tile.setMarked(false);
                }
            }
        }
        
        // Restore marked hazards at their exact positions
        for (const pos of this.savedState.markedHazards) {
            const tile = board[pos.x][pos.y];
            if (tile.getHazardtype() !== "none") {
                tile.setMarked(true);
            }
        }
        
        // ===== SCOUT: Keep fixed flags (ability 4) =====
        const isScout = player.getAbilityId() === 4;
        if (isScout) {
            // Scout keeps 3 flags
            player.setFlags(3);
            console.log('[Reversion] Scout flags kept at 3');
        } else {
            // Calculate remaining flags (total hazards - marked count)
            const remainingFlags = this.savedState.totalHazards - this.savedState.markedCount;
            player.setFlags(remainingFlags);
            console.log('[Reversion] Flags restored to:', remainingFlags);
        }
        
        const reversionUses = this.savedState.reversionUses || 0;
        if (player.hasKeychain('reversion')) {
            player.keychainUses['reversion'] = reversionUses;
            console.log('[Reversion] Restored uses:', reversionUses);
        }
        
        console.log('[Reversion] State restored');
        return true;
    }

    // ======================= ACTIVATE REVERSION =======================
    
    activate() {
        const game = this.gameManager;
        const player = game.getPlayer();
        
        if (!this.hasUses(player)) {
            console.log('[Reversion] No uses left');
            return false;
        }
        
        if (this.isRewinding) {
            console.log('[Reversion] Already rewinding');
            return false;
        }
        
        this.isRewinding = true;
        
        // ===== TRIGGER REWIND VISUAL EFFECT =====
        if (game.renderer) {
            game.renderer.triggerRewind();
        }
        
        // ===== PLAY REWIND SOUND =====
        if (game.audio) {
            game.audio.playRewindSFX();
        }
        
        // ===== 1. SAVE STATE =====
        this.saveState();
        
        // ===== 2. SPENT USE =====
        player.useKeychain('reversion');
        
        // ===== 3. RESTART BOARD =====
        game.retryLevel();
        
        // ===== 4. LOAD STATE =====
        setTimeout(() => {
            this.restoreState();
            
            // Update vision
            game.boardCtrl.updateVision(game.board, player);
            game.boardCtrl.updateVisionAroundPlayer(game.board, player);
            
            // Update UI
            game.updateFlagUI();
            
            // Update swamp button
            game.getFlagModeManager().updateSwampButtonUI();
            
            // Update reversion button
            this.updateButtonUI();
            
            this.isRewinding = false;
            
            console.log('[Reversion] Rewind complete');
        }, 200);
        
        return true;
    }

    // ======================= AUTO ACTIVATE ON DEATH =======================
    
    autoActivateOnDeath() {
        const game = this.gameManager;
        const player = game.getPlayer();
        
        if (!player.hasKeychain('reversion') || !this.hasUses(player)) {
            return false;
        }
        
        console.log('[Reversion] Auto-activating on death');
        return this.activate();
    }

    // ======================= UI BUTTON =======================
    
    updateButtonUI() {
        const btn = document.getElementById("restart-btn");
        if (!btn) return;
        
        const player = this.gameManager.getPlayer();
        if (!player) {
            btn.className = 'restart-btn disabled';
            return;
        }
        
        const hasReversion = player.hasKeychain('reversion');
        const uses = this.getUses(player);
        const hasUses = uses > 0;
        
        if (hasReversion && hasUses) {
            btn.className = 'restart-btn active';
            btn.title = `Reversion (${uses} uses left)`;
        } else if (hasReversion && !hasUses) {
            btn.className = 'restart-btn disabled';
            btn.title = 'Reversion (no uses left)';
        } else {
            btn.className = 'restart-btn disabled';
            btn.title = 'Reversion (not available)';
        }
    }

    // ======================= KEYBOARD SHORTCUT =======================
    
    handleKeyPress(e) {
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            this.activate();
        }
    }
}