// ==============================================================
// =================== KEYCHAIN CONFIG ===========================
// ==============================================================
// Centralized configuration for all keychain properties

export const KeychainConfig = {
    // Keychains with limited uses (maxUses)
    uses: {
        'revelation': 10,
        'descent': 9,
        'salvation': 3,
        'purity': 18,
        'reversion': 3,
    },
    
    // Keychains that are passive (no uses)
    passive: [
        'horizon',
        'home',
        'topography',
        'memory',
        'safekeeping',
        'destiny',
        'ascent',
        'protection',
        'greed',
        'resistance',
        'stealth',
        'concentration',
        'fortune',
        'vision',
        'continuity',
        'stuffed',
        'judgment',
        'link',
        'oblivion',
        'delirium'
    ],
    
    // Check if a keychain has limited uses
    hasUses(id) {
        return id in this.uses;
    },
    
    // Get max uses for a keychain
    getMaxUses(id) {
        return this.uses[id] || 0;
    },
    
    // Check if a keychain is passive
    isPassive(id) {
        return this.passive.includes(id);
    },
    
    // Initialize keychain uses for a player
    initKeychainUsesForPlayer(player) {
        if (!player) return;
        
        for (const [id, maxUses] of Object.entries(this.uses)) {
            if (player.inventory.includes(id)) {
                // Only initialize if not already set (preserve saved uses)
                if (player.keychainUses[id] === undefined || player.keychainUses[id] === 0) {
                    player.initKeychainUses(id, maxUses);
                }
            }
        }
    }
};