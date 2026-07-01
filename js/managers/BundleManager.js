// ==============================================================
// ===================== BUNDLE MANAGER =========================
// ==============================================================
// Handles bundle generation, rareza rolls, and keychain rewards.

export class BundleManager {
    
    constructor(gameManager, localeManager) {
        this.gameManager = gameManager;
        this.localeManager = localeManager;
        this.bundleTiers = {
            bundle: {
                name: 'bundle',
                probability: 0.60,
                keychainCount: { min: 1, max: 2 },
                rarezas: {
                    typical: 0.65,
                    abnormal: 0.25,
                    extravagant: 0.08,
                    unheard: 0.02,
                    cursed: 0
                }
            },
            stockedbundle: {
                name: 'stockedbundle',
                probability: 0.25,
                keychainCount: { min: 2, max: 3 },
                rarezas: {
                    typical: 0.35,
                    abnormal: 0.45,
                    extravagant: 0.15,
                    unheard: 0.05,
                    cursed: 0.10
                }
            },
            saturatedbundle: {
                name: 'saturatedbundle',
                probability: 0.10,
                keychainCount: { min: 3, max: 4 },
                rarezas: {
                    typical: 0,
                    abnormal: 0.35,
                    extravagant: 0.30,
                    unheard: 0.15,
                    cursed: 0.20
                }
            },
            cursedbundle: {
                name: 'cursedbundle',
                probability: 0.05,
                keychainCount: { min: 1, max: 4 },
                rarezas: {
                    typical: 0,
                    abnormal: 0,
                    extravagant: 0,
                    unheard: 0,
                    cursed: 1
                }
            }
        };

        // Keychain list
        this.keychainList = [
            { id: 'horizon', rareza: 'typical' },
            { id: 'revelation', rareza: 'typical' },
            { id: 'home', rareza: 'typical'},
            { id: 'memory', rareza: 'typical' },
            { id: 'destiny', rareza: 'abnormal' },
            { id: 'ascent', rareza: 'abnormal' },
            { id: 'protection', rareza: 'abnormal' },
            { id: 'descent', rareza: 'abnormal' },
            { id: 'greed', rareza: 'abnormal' },
            { id: 'resistance', rareza: 'extravagant' },
            { id: 'salvation', rareza: 'extravagant' },
            { id: 'stealth', rareza: 'extravagant' },
            { id: 'purity', rareza: 'extravagant' },
            { id: 'concentration', rareza: 'extravagant'},
            { id: 'fortune', rareza: 'unheard' },
            { id: 'vision', rareza: 'unheard'},
            { id: 'continuity', rareza: 'unheard' },
            { id: 'reversion', rareza: 'unheard' },
            { id: 'stuffed', rareza: 'unheard' },
            { id: 'judgment', rareza: 'cursed' },
            { id: 'link', rareza: 'cursed' },
            { id: 'oblivion', rareza: 'cursed' },
            { id: 'delirium', rareza: 'cursed' }
        ];

        this.dailyExcludedIds = ['fortune', 'greed'];
    }
    
    getTier() {
        const roll = Math.random();
        let cumulative = 0;
        
        for (const [key, tier] of Object.entries(this.bundleTiers)) {
            cumulative += tier.probability;
            if (roll <= cumulative) {
                return key;
            }
        }
        return 'bundle';
    }
    
    getKeychainCount(tierKey) {
        const tier = this.bundleTiers[tierKey];
        const { min, max } = tier.keychainCount;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    rollKeychainType(tierKey) {
        const tier = this.bundleTiers[tierKey];
        const roll = Math.random();
        let cumulative = 0;
        
        const rarezaKeys = ['typical', 'abnormal', 'extravagant', 'unheard', 'cursed'];
        for (const key of rarezaKeys) {
            const prob = tier.rarezas[key] || 0;
            cumulative += prob;
            if (roll <= cumulative) {
                return key;
            }
        }
        return 'typical';
    }
    
    getBundleKeychains(tierKey) {
        const count = this.getKeychainCount(tierKey);
        const keychains = [];
        const usedIds = new Set();
        let hasCursed = false;
        
        // Get player's current inventory to avoid duplicates
        const player = this.gameManager.getPlayer();
        const ownedKeychains = player ? player.inventory || [] : [];
        
        // Cursed bundle: all keychains are cursed
        if (tierKey === 'cursedbundle') {
            const cursedAvailable = this.keychainList.filter(k => 
                k.rareza === 'cursed' && 
                !usedIds.has(k.id) &&
                !ownedKeychains.includes(k.id)  // ← Evitar duplicados
            );
            
            // Shuffle and take up to count
            const shuffled = cursedAvailable.sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, count);
            
            for (const k of selected) {
                usedIds.add(k.id);
                keychains.push(k);
            }
            
            if (keychains.length === 0) {
                const fallback = this.keychainList.find(k => 
                    k.rareza === 'typical' && !ownedKeychains.includes(k.id)
                );
                if (fallback) keychains.push(fallback);
            }
            
            return keychains;
        }
        
        // Saturated bundle: 3 random keychains
        if (tierKey === 'saturatedbundle') {
            const randomCount = count;
            for (let i = 0; i < randomCount; i++) {
                let type = this.rollKeychainType(tierKey);
                
                const available = this.keychainList.filter(k => 
                    k.rareza === type && 
                    !usedIds.has(k.id) &&
                    !ownedKeychains.includes(k.id)  // ← Evitar duplicados
                );
                
                if (available.length > 0) {
                    const selected = available[Math.floor(Math.random() * available.length)];
                    usedIds.add(selected.id);
                    keychains.push(selected);
                }
            }
            
            if (keychains.length === 0) {
                const fallback = this.keychainList.find(k => 
                    k.rareza === 'abnormal' && !ownedKeychains.includes(k.id)
                );
                if (fallback) keychains.push(fallback);
            }
            
            return keychains;
        }
        
        // Normal bundles (bundle, stockedbundle)
        for (let i = 0; i < count; i++) {
            let type = this.rollKeychainType(tierKey);
            
            if (type === 'cursed') {
                if (hasCursed) {
                    type = 'typical';
                } else {
                    hasCursed = true;
                }
            }
            
            const available = this.keychainList.filter(k => 
                k.rareza === type && 
                !usedIds.has(k.id) &&
                !ownedKeychains.includes(k.id)  // ← Evitar duplicados
            );
            
            if (available.length > 0) {
                const selected = available[Math.floor(Math.random() * available.length)];
                usedIds.add(selected.id);
                keychains.push(selected);
            }
        }
        
        if (keychains.length === 0) {
            const fallback = this.keychainList.find(k => 
                k.rareza === 'typical' && !ownedKeychains.includes(k.id)
            );
            if (fallback) keychains.push(fallback);
        }
        
        return keychains;
    }
    
    getRandomKeychainOfType(type) {
        const filtered = this.keychainList.filter(k => k.rareza === type);
        if (filtered.length === 0) return null;
        return filtered[Math.floor(Math.random() * filtered.length)];
    }

    createSeededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    getDailyKeychains(seed) {
        // Create seeded random generator
        const seededRandom = this.createSeededRandom(seed);

        const validKeychains = this.keychainList.filter(k => 
            !this.dailyExcludedIds.includes(k.id)
        );
        
        // Determine how many keychains (1-5)
        const count = Math.floor(seededRandom() * 5) + 1;
        
        const keychains = [];
        const usedIds = new Set();
        const rarezaKeys = ['typical', 'abnormal', 'extravagant', 'unheard', 'cursed'];
        
        const rarezaGroups = {};
        for (const rareza of rarezaKeys) {
            rarezaGroups[rareza] = validKeychains.filter(k => k.rareza === rareza);
        }
        
        const dailyWeights = {
            typical: 0.35,
            abnormal: 0.32,   
            extravagant: 0.20,
            unheard: 0.10,
            cursed: 0.03
        };
        
        // Roll for each keychain
        for (let i = 0; i < count; i++) {
            // Roll rareza
            const roll = seededRandom();
            let cumulative = 0;
            let selectedRareza = 'typical';
            
            for (const rareza of rarezaKeys) {
                cumulative += dailyWeights[rareza];
                if (roll <= cumulative) {
                    selectedRareza = rareza;
                    break;
                }
            }
            
            // Get available keychain of that rareza
            const available = rarezaGroups[selectedRareza]?.filter(k => !usedIds.has(k.id)) || [];
            
            if (available.length > 0) {
                const selected = available[Math.floor(seededRandom() * available.length)];
                usedIds.add(selected.id);
                keychains.push(selected);
            }
        }
        
        // Ensure at least one keychain
        if (keychains.length === 0) {
            const fallback = validKeychains.find(k => k.rareza === 'typical' && !usedIds.has(k.id));
            if (fallback) keychains.push(fallback);
        }
        
        return keychains;
    }
    
    getAllKeychains() {
        return this.keychainList;
    }

    getDailyValidKeychains() {
        return this.keychainList.filter(k => !this.dailyExcludedIds.includes(k.id));
    }
}
