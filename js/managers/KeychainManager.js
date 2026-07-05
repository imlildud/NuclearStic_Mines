// ==============================================================
// ==================== KEYCHAIN MANAGER =========================
// ==============================================================
// Manages keychain loading and initialization

import { KeychainConfig } from "../utils/KeychainConfig.js";

export class KeychainManager {
    
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    // ===== LEGACY MODE =====
    saveLegacyKeychains(player) {
        const keychains = player.inventory || [];
        this.gameManager.save.setLegacyKeychains(keychains);
        
        const uses = player.keychainUses || {};
        this.gameManager.save.setLegacyKeychainUses(uses);
        
        console.log('[Legacy] Saved keychains:', keychains);
        console.log('[Legacy] Saved uses:', uses);
    }

    loadLegacyKeychains(player) {
        // ===== CHECK FOR STUFFED FIRST =====
        const stuffedKeychains = this.gameManager.save.getStuffedKeychains();
        
        if (stuffedKeychains && stuffedKeychains.length > 0) {
            // Stuffed found: use it as legacy inventory
            console.log('[Stuffed] Found saved keychains:', stuffedKeychains);
            
            const maxSize = player.maxInventorySize || 5;
            player.inventory = [];
            
            for (const keychainId of stuffedKeychains) {
                if (player.inventory.length >= maxSize) break;
                if (keychainId && !player.inventory.includes(keychainId)) {
                    player.inventory.push(keychainId);
                }
            }
            
            // Clear stuffed after using it (one-time use)
            this.gameManager.save.clearStuffedKeychains();
            
            // Initialize uses for loaded keychains
            KeychainConfig.initKeychainUsesForPlayer(player);
            this.gameManager.getFlagModeManager().updateSwampButtonUI();
            this.gameManager.reversionManager.updateButtonUI();
            
            console.log('[Stuffed] Loaded into inventory:', player.inventory);
            return;
        }
        
        // ===== Normal legacy loading (no stuffed) =====
        const savedKeychains = this.gameManager.save.getLegacyKeychains();
        const savedUses = this.gameManager.save.getLegacyKeychainUses();
        
        if (!savedKeychains || savedKeychains.length === 0) {
            console.log('[Legacy] No saved keychains found, using empty inventory');
            player.inventory = [];
            player.keychainUses = {};
            return;
        }
        
        const maxSize = player.maxInventorySize || 5;
        player.inventory = [];
        
        let loadedCount = 0;
        for (const keychainId of savedKeychains) {
            if (player.inventory.length >= maxSize) break;
            if (keychainId && !player.inventory.includes(keychainId)) {
                player.inventory.push(keychainId);
                loadedCount++;
            }
        }

        player.keychainUses = { ...savedUses };
        
        for (const [id] of Object.entries(player.keychainUses)) {
            if (!player.inventory.includes(id)) {
                delete player.keychainUses[id];
            }
        }
        
        console.log(`[Legacy] Loaded ${loadedCount} keychains: ${player.inventory.join(', ')}`);
        console.log('[Legacy] Loaded uses:', player.keychainUses);
    }

    clearLegacyKeychains() {
        this.gameManager.save.clearLegacyKeychains();
        this.gameManager.save.clearLegacyKeychainUses();
        console.log('[Legacy] Keychains and uses cleared');
    }

    // ===== DAILY MODE =====
    giveDailyKeychains(bundleManager, player, seed) {
        if (!bundleManager) {
            console.warn('[Daily] BundleManager not available');
            return;
        }
        
        const keychains = bundleManager.getDailyKeychains(seed);
        const maxSize = player.maxInventorySize || 5;
        
        let addedCount = 0;
        for (const keychain of keychains) {
            if (player.inventory.length >= maxSize) break;
            if (!player.inventory.includes(keychain.id)) {
                player.inventory.push(keychain.id);
                addedCount++;
            }
        }

        KeychainConfig.initKeychainUsesForPlayer(player);
        this.gameManager.getFlagModeManager().updateSwampButtonUI();
        this.gameManager.reversionManager.updateButtonUI();
        
        console.log(`[Daily] Gave ${addedCount} keychains from seed ${seed}`);
        console.log(`[Daily] Keychains: ${player.inventory.join(', ')}`);
    }

    // ===== CUSTOM MODE =====
    loadCustomKeychains(saveManager, player) {
        const savedKeychains = saveManager.getCustomKeychains();
        
        if (!savedKeychains || savedKeychains.length === 0) {
            console.log('[Custom] No saved keychains found, using default empty inventory');
            return;
        }
        
        const maxSize = player.maxInventorySize || 5;
        player.inventory = [];
        
        let addedCount = 0;
        for (const keychainId of savedKeychains) {
            if (player.inventory.length >= maxSize) break;
            if (keychainId && !player.inventory.includes(keychainId)) {
                player.inventory.push(keychainId);
                addedCount++;
            }
        }

        KeychainConfig.initKeychainUsesForPlayer(player);
        this.gameManager.getFlagModeManager().updateSwampButtonUI();
        this.gameManager.reversionManager.updateButtonUI();
        
        console.log(`[Custom] Loaded ${addedCount} saved keychains: ${player.inventory.join(', ')}`);
    }

    // ===== RESISTANCE =====
    applyResistance(player) {
        if (!player.hasKeychain('resistance')) return;
        
        if (player.getAbilityId() === 3) {
            player.incrementAp(1);
            console.log('[Resistance] Mommy +1 AP (total: ' + player.getAp() + ')');
        } else {
            player.setAp(1);
            console.log('[Resistance] AP set to 1');
        }
    }

    // ===== DESTINY =====
    getDestinyTarget(board, currentTarget) {
        if (currentTarget) {
            const tile = board[currentTarget.x]?.[currentTarget.y];
            if (tile && tile.getGoaltype() !== 'none' && tile.getGoaltype() !== 'joni') {
                return currentTarget;
            }
        }

        const goals = [];
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                const goalType = board[i][j].getGoaltype();
                if (goalType !== 'none' && goalType !== 'joni') {
                    goals.push({ x: i, y: j });
                }
            }
        }
        
        if (goals.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * goals.length);
        const target = goals[randomIndex];
        console.log('[Destiny] Target set to:', target);
        return target;
    }
}