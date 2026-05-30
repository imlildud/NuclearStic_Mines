// ==============================================================
// ==================== CHARACTER FACTORY =======================
// ==============================================================
// Factory pattern implementation for creating character instances
// with predefined stats based on character type

import { CharacterModel } from "../models/CharacterModel.js";

export class CharacterFactory {
    
    // ======================= MAIN FACTORY METHOD =======================
    // Creates a character based on the specified type
    // @param characterType - Type of character to create (scout, mosquito, mommy, chef)
    // @returns CharacterModel with appropriate stats
    
    static createCharacter(characterType) {
        const character = new CharacterModel();
        character.setType(characterType);
        
        switch (characterType) {
            case "scout":
                return this.createScout(character);
            case "mosquito":
                return this.createMosquito(character);
            case "mommy":
                return this.createMommy(character);
            case "chef":
                return this.createChef(character);
            default:
                throw new Error(`Unknown character: ${characterType}`);
        }
    }
    
    // ======================= CHARACTER STATS =======================
    
    // ----- CHEF CHARACTER -----
    // Balanced character with good health and force
    // Ability 1: Scout-like marking ability
    static createChef(character) {
        character.setHp(5);              // Medium health
        character.setFlags(5);           // 5 flag capacity
        character.setInventorySize(4);   // 4 inventory slots
        character.setAbilityId(1);       // Ability ID 1
        character.setVision(2);          // 2 tile vision range
        character.setForce(3);            // Medium force
        return character;
    }
    
    // ----- MOSQUITO CHARACTER -----
    // Recon character with high vision and flags, low health
    // Ability 2: Detection avoidance
    static createMosquito(character) {
        character.setHp(3);              // Low health
        character.setFlags(7);           // High flag capacity
        character.setInventorySize(5);   // Large inventory
        character.setAbilityId(2);       // Ability ID 2
        character.setVision(5);          // Extended vision range
        character.setForce(2);            // Low force
        return character;
    }
    
    // ----- MOMMY CHARACTER -----
    // Tank character with high health, armor, but low flags and vision
    // Ability 3: Armor-based defense
    static createMommy(character) {
        character.setHp(10);             // High health
        character.setAp(3);              // 3 armor points
        character.setFlags(1);           // Low flag capacity
        character.setInventorySize(1);   // Small inventory
        character.setAbilityId(3);       // Ability ID 3
        character.setVision(1);          // Limited vision
        character.setForce(1);            // Low force
        return character;
    }
    
    // ----- SCOUT CHARACTER -----
    // Glass cannon with high force, low health
    // Ability 4: Climber - ignores terrain restrictions
    static createScout(character) {
        character.setHp(1);              // Very low health
        character.setAp(0);              // No armor
        character.setFlags(3);           // 3 flag capacity
        character.setInventorySize(2);   // Small inventory
        character.setAbilityId(4);       // Ability ID 4
        character.setVision(2);          // 2 tile vision range
        character.setForce(5);            // High force
        return character;
    }
}