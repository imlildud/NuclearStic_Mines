export class CharacterModel {
    constructor() {
        // Initial coordinates
        this.posX = 0;
        this.posY = 0;

        // Stats
        this.hp = 0;
        this.ap = 0;
        this.flags = 0;
        this.inventory = [];
        this.force = 0;
        this.abilityId = 0;
        this.vision = 0;

        // Status
        this.points = 0;
        this.alive = true;
        this.regen = false;
        this.rescued = 0;

        // Who
        this.type = "none";
    }

    // Position
    getPosX() { return this.posX; }
    setPosX(v) { this.posX = v; }
    getPosY() { return this.posY; }
    setPosY(v) { this.posY = v; }

    // Health points
    getHp() { return this.hp; }
    setHp(v) { this.hp = v; }
    incrementHp(v) { this.hp += v; }
    decrementHp(v) { this.hp -= v; }

    // Armor points
    getAp() { return this.ap; }
    setAp(v) { this.ap = v; }
    incrementAp(v) { this.ap += v; }
    decrementAp(v) { this.ap -= v; }

    // Flags
    getFlags() { return this.flags; }
    setFlags(v) { this.flags = v; }
    incrementFlags() { this.flags++; }
    decrementFlags() { this.flags--; }

    // Inventory
    getInventorySize() { return this.inventory.length; }
    setInventorySize(size) {
        if (size < this.inventory.length) {
            this.inventory = this.inventory.slice(0, size);
        } else {
            while (this.inventory.length < size) this.inventory.push(0);
        }
    }
    getItem(slot) { return this.inventory[slot] ?? 0; }
    setItem(slot, id) { if (slot >= 0 && slot < this.inventory.length) this.inventory[slot] = id; }
    addItem(id) { this.inventory.push(id); }
    removeItem(slot) { if (slot >= 0 && slot < this.inventory.length) this.inventory.splice(slot, 1); }

    // Force
    getForce() { return this.force; }
    setForce(v) { this.force = v; }
    incrementForce(v) { this.force += v; }
    decrementForce(v) { this.force -= v; }

    // Ability
    getAbilityId() { return this.abilityId; }
    setAbilityId(v) { this.abilityId = v; }

    // Vision
    getVision() { return this.vision; }
    setVision(v) { this.vision = v; }

    // Points
    getPoints() { return this.points; }
    setPoints(v) { this.points = v; }
    incrementPoints(v) { this.points += v; }
    decrementPoints(v) { this.points -= v; }

    // Alive
    isAlive() { return this.alive; }
    setAlive(v) { this.alive = v; }

    // Regenerate hazards
    isRegen() { return this.regen; }
    setRegen(v) { this.regen = v; }

    // Rescued kids
    getRescued() { return this.rescued; }
    incrementRescue() { this.rescued++; }
    decrementRescue(v) { this.rescued -= v; }

    // Who
    getType() { return this.type; }
    setType(v) { this.type = v; }
}