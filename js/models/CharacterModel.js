// ==============================================================
// ===================== CHARACTER MODEL ========================
// ==============================================================
// Manages the state and properties of the player character

export class CharacterModel {
    
    // ======================= CONSTRUCTOR =======================
    // Initializes all character properties with default values
    
    constructor() {
        // ========== POSITION COORDINATES ==========
        this.posX = 0;              // X coordinate on game grid
        this.posY = 0;              // Y coordinate on game grid

        // ========== BASE STATS ==========
        this.hp = 0;                // Health points
        this.ap = 0;                // Armor points
        this.flags = 0;             // Available flag count
        this.inventory = [];        // Array of inventory items
        this.maxInventorySize = 5;
        this.force = 0;             // Force/power stat
        this.abilityId = 0;         // Active ability identifier
        this.vision = 0;            // Vision range (tiles visible)
        this.damageFlash = false;   // Damage flash property

        // ========== STATUS TRACKING ==========
        this.alive = true;          // Alive status flag
        this.criticized = false;    // Nest effect
        this.critickerGoal = 0;
        this.critickerProgress = 0;
        this.damageTaken = 0;       // Damage tracker
        this.regen = false;         // Health regeneration flag
        this.rescued = 0;           // Currently rescued count (current mission)
        this.totalRescued = 0;      // Total rescued across all missions
        this.failedFlags = 0;       // Failed flag attempts
        this.failedJumpFlags = 0;   // Failed jump flag attempts

        // ========== CHARACTER IDENTITY ==========
        this.type = "none";         // Character type identifier

        // ========== KEYCHAIN USAGE TRACKING ==========
        this.keychainUses = {};
        
    }
    
    // ======================= POSITION GETTERS & SETTERS =======================
    
    getPosX() { return this.posX; }
    setPosX(v) { this.posX = v; }
    
    getPosY() { return this.posY; }
    setPosY(v) { this.posY = v; }
    
    // ======================= HEALTH POINTS (HP) GETTERS & SETTERS =======================
    
    getHp() { return this.hp; }
    setHp(v) { this.hp = v; }
    incrementHp(v) { this.hp += v; }
    decrementHp(v) { this.hp -= v; }
    
    // ======================= ARMOR POINTS (AP) GETTERS & SETTERS =======================
    
    getAp() { return this.ap; }
    setAp(v) { this.ap = v; }
    incrementAp(v) { this.ap += v; }
    decrementAp(v) { this.ap -= v; }
    
    // ======================= FLAGS GETTERS & SETTERS =======================
    
    getFlags() { return this.flags; }
    setFlags(v) { this.flags = v; }
    incrementFlags() { this.flags++; }
    decrementFlags() { this.flags--; }
    
    // ======================= FAILED FLAGS GETTERS & SETTERS =======================
    
    getFailedFlags() { return this.failedFlags; }
    setFailedFlags(v) { this.failedFlags = v; }
    incrementFailedFlags(v) { this.failedFlags += v; }
    resetFailedFlags() { this.failedFlags = 0; }
    
    // ======================= FAILED JUMP FLAGS GETTERS & SETTERS =======================
    
    getFailedJumpFlags() { return this.failedJumpFlags; }
    setFailedJumpFlags(v) { this.failedJumpFlags = v; }
    incrementJumpFailedFlags(v) { this.failedJumpFlags += v; }
    resetJumpFailedFlags() { this.failedJumpFlags = 0; }
    
    // ======================= INVENTORY GETTERS & SETTERS =======================
    
    setInventorySize(size) {
        this.maxInventorySize = size;
    }

    getInventorySize() {
        return this.inventory.length;
    }

    getMaxInventorySize() {
        return this.maxInventorySize || 5;
    }

    hasKeychain(id){
      return this.inventory.includes(id);
    }
    
    // ======================= FORCE GETTERS & SETTERS =======================
    
    getForce() { return this.force; }
    setForce(v) { this.force = v; }
    incrementForce(v) { this.force += v; }
    decrementForce(v) { this.force -= v; }
    
    // ======================= ABILITY GETTERS & SETTERS =======================
    
    getAbilityId() { return this.abilityId; }
    setAbilityId(v) { this.abilityId = v; }
    
    // ======================= VISION GETTERS & SETTERS =======================
    
    getVision() { return this.vision; }
    setVision(v) { this.vision = v; }
    
    // ======================= ALIVE STATUS GETTERS & SETTERS =======================
    
    isAlive() { return this.alive; }
    setAlive(v) { this.alive = v; }

    // ======================= DAMAGE FLASH GETTERS & SETTERS =======================

    isDamageFlash() { return this.damageFlash; }
    setDamageFlash(v) { this.damageFlash = v; }

    // ======================= CRITICIZED STATUS GETTERS & SETTERS =======================

    isCriticized() { return this.criticized; }
    setCriticized(v) { this.criticized = v; }

    getCritickerGoal() { return this.critickerGoal; }
    setCritickerGoal(v) { this.critickerGoal = v; }

    getCritickerProgress() { return this.critickerProgress; }
    setCritickerProgress(v) { this.critickerProgress = v; }
    incrementCritickerProgress() { this.critickerProgress++; }

    // ========================= DAMAGE TRACKER ============================
    
    getDamageTaken() { return this.damageTaken; }
    incrementDamageTaken(v) { this.damageTaken += v; }
    resetDamageTaken() { this.damageTaken = 0; }
    
    // ======================= REGENERATION GETTERS & SETTERS =======================
    
    isRegen() { return this.regen; }
    setRegen(v) { this.regen = v; }
    
    // ======================= RESCUED COUNT GETTERS & SETTERS =======================
    
    getRescued() { return this.rescued; }
    setRescued(v) { this.rescued = v; }
    incrementRescue() { this.rescued++; }
    decrementRescue(v) { this.rescued -= v; }
    
    getTotalRescued() { return this.totalRescued; }
    incrementTotalRescued(v) { this.totalRescued += v; }
    
    // ======================= CHARACTER TYPE GETTERS & SETTERS =======================
    
    getType() { return this.type; }
    setType(v) { this.type = v; }

    // ======================= KEYCHAIN USAGE METHODS =======================

    // Initialize a keychain with max uses
    initKeychainUses(id, maxUses) {
        // Only initialize if the keychain exists in inventory
        if (this.inventory.includes(id)) {
            this.keychainUses[id] = maxUses;
            return true;
        }
        return false;
    }
    
    // Get remaining uses for a keychain
    getKeychainUses(id) {
        return this.keychainUses[id] || 0;
    }

    // Check if keychain has uses left
    hasKeychainUses(id) {
        return this.keychainUses[id] > 0;
    }

    // Check if keychain is active (has uses left)
    isKeychainActive(id) {
        // If it's not in inventory, it's not active
        if (!this.inventory.includes(id)) return false;
        
        // If it has uses tracked, check if > 0
        if (this.keychainUses[id] !== undefined) {
            return this.keychainUses[id] > 0;
        }
        
        // No uses tracked = always active (passive keychain)
        return true;
    }

    // Use one charge of a keychain, returns true if used
    useKeychain(id) {
        if (this.keychainUses[id] > 0) {
            // Safekeeping: Chance to not consume use =====
            const hasSafekeeping = this.hasKeychain('safekeeping');
            const hasFortune = this.hasKeychain('fortune');
            
            let saveChance = 0;
            if (hasSafekeeping) {
                saveChance = hasFortune ? 0.40 : 0.20;
            }
            
            const shouldConsume = Math.random() > saveChance;
            
            if (shouldConsume) {
                this.keychainUses[id]--;
                if (this.keychainUses[id] === 0) {
                    // Remove from inventory when depleted
                    const index = this.inventory.indexOf(id);
                    if (index > -1) {
                        this.inventory.splice(index, 1);
                    }
                    delete this.keychainUses[id];
                }
                
                this.saveKeychainUses();
            } else {
                console.log(`[Safekeeping] Saved a use of ${id}!`);
            }
            
            return true;
        }
        return false;
    }

    // ===== SAVE KEYCHAIN USES (for Legacy mode) =====
    saveKeychainUses() {
        // Only save if in Legacy mode
        const gameManager = this._gameManager;
        if (!gameManager) return;
        
        const config = gameManager.config;
        if (!config || config.mode !== 'legacy') return;
        
        const saveManager = gameManager.save;
        if (!saveManager) return;
        
        // Save current uses
        saveManager.setLegacyKeychainUses(this.keychainUses || {});
        console.log('[SaveManager] Keychain uses saved after use:', this.keychainUses);
    }
}