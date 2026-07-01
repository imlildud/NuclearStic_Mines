// ==============================================================
// =================== KEYCHAIN CONFIG ===========================
// ==============================================================
// Centralized configuration for all keychain properties

export const KeychainConfig = {
    // Keychains with limited uses (maxUses)
    uses: {
        'revelation': 10,
        'descent': 5,
        'salvation': 3,
        'purity': 9,
        'reversion': 4,
        'stuffed': 20
    },
    
    // Keychains that are passive (no uses)
    passive: [
        'horizon',
        'home',
        'memory',
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
                player.initKeychainUses(id, maxUses);
            }
        }
    }
};