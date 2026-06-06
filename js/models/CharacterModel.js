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
        this.force = 0;             // Force/power stat
        this.abilityId = 0;         // Active ability identifier
        this.vision = 0;            // Vision range (tiles visible)

        // ========== STATUS TRACKING ==========
        this.points = 0;            // Total score points
        this.alive = true;          // Alive status flag
        this.damageTaken = 0;       // Damage tracker
        this.regen = false;         // Health regeneration flag
        this.rescued = 0;           // Currently rescued count (current mission)
        this.totalRescued = 0;      // Total rescued across all missions
        this.failedFlags = 0;       // Failed flag attempts
        this.failedJumpFlags = 0;   // Failed jump flag attempts

        // ========== CHARACTER IDENTITY ==========
        this.type = "none";         // Character type identifier
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
    
    getInventorySize() { return this.inventory.length; }
    
    setInventorySize(size) {
        if (size < this.inventory.length) {
            this.inventory = this.inventory.slice(0, size);  // Truncate if smaller
        } else {
            while (this.inventory.length < size) this.inventory.push(0);  // Pad with zeros
        }
    }
    
    getItem(slot) { return this.inventory[slot] ?? 0; }
    setItem(slot, id) { if (slot >= 0 && slot < this.inventory.length) this.inventory[slot] = id; }
    addItem(id) { this.inventory.push(id); }
    removeItem(slot) { if (slot >= 0 && slot < this.inventory.length) this.inventory.splice(slot, 1); }
    
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
    
    // ======================= POINTS GETTERS & SETTERS =======================
    
    getPoints() { return this.points; }
    setPoints(v) { this.points = v; }
    incrementPoints(v) { this.points += v; }
    decrementPoints(v) { this.points -= v; }
    
    // ======================= ALIVE STATUS GETTERS & SETTERS =======================
    
    isAlive() { return this.alive; }
    setAlive(v) { this.alive = v; }

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
}