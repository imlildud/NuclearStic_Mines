// ==============================================================
// ==================== CHARACTER FACTORY =======================
// ==============================================================
// Factory pattern implementation for creating character instances
// with predefined stats based on character type

import { CharacterModel } from "../models/CharacterModel.js";

export class CharacterFactory {
    
    // Helper to check Hardcore mode from localStorage
    static isHardcoreEnabled() {
        return localStorage.getItem("hardcoreEnabled") === "true";
    }
    
    // ======================= MAIN FACTORY METHOD =======================
    // Creates a character based on the specified type
    // @param characterType - Type of character to create (scout, mosquito, mommy, chef)
    // @returns CharacterModel with appropriate stats
    
    static createCharacter(characterType) {
        const isHardcore = this.isHardcoreEnabled();
        const character = new CharacterModel();
        character.deadPals = 0;
        character.setType(characterType);
        
        switch (characterType) {
            case "scout":
                return this.createScout(character, isHardcore);
            case "mosquito":
                return this.createMosquito(character, isHardcore);
            case "mommy":
                return this.createMommy(character, isHardcore);
            case "chef":
                return this.createChef(character, isHardcore);
            case "student":
                return this.createStudent(character, isHardcore);
            default:
                throw new Error(`Unknown character: ${characterType}`);
        }
    }
    
    // ======================= CHARACTER STATS =======================
    
    // ----- CHEF CHARACTER -----
    // Balanced character with good health and force
    // Ability 1: Scout-like marking ability
    static createChef(character, isHardcore) {
        if (isHardcore) {
            character.setHp(5);
            character.setAp(0);
            character.setFlags(0);
            character.maxInventorySize = 3;
            character.setAbilityId(1);
            character.setVision(2);
            character.setForce(1);
        } else {
            character.setHp(5);
            character.setAp(0);
            character.setFlags(0);
            character.maxInventorySize = 5;
            character.setAbilityId(1);
            character.setVision(2);
            character.setForce(3);
        }
        return character;
    }
    
    // ----- MOSQUITO CHARACTER -----
    // Recon character with high vision and flags, low health
    // Ability 2: Detection avoidance
    static createMosquito(character, isHardcore) {
        if (isHardcore) {
            character.setHp(3);
            character.setAp(0);
            character.setFlags(0);
            character.maxInventorySize = 3;
            character.setAbilityId(2);
            character.setVision(5);
            character.setForce(1);
        } else {
            character.setHp(3);
            character.setAp(0);
            character.setFlags(0);
            character.maxInventorySize = 5;
            character.setAbilityId(2);
            character.setVision(5);
            character.setForce(2);
        }
        return character;
    }
    
    // ----- MOMMY CHARACTER -----
    // Tank character with high health, armor, but low flags and vision
    // Ability 3: Armor-based defense
    static createMommy(character, isHardcore) {
        if (isHardcore) {
            character.setHp(1);
            character.setAp(1);
            character.setFlags(0);
            character.maxInventorySize = 3;
            character.setAbilityId(3);
            character.setVision(1);
            character.setForce(1);
        } else {
            character.setHp(10);
            character.setAp(3);
            character.setFlags(0);
            character.maxInventorySize = 5;
            character.setAbilityId(3);
            character.setVision(1);
            character.setForce(1);
        }
        return character;
    }
    
    // ----- SCOUT CHARACTER -----
    // Glass cannon with high force, low health
    // Ability 4: Climber - ignores terrain restrictions
    static createScout(character, isHardcore) {
        if (isHardcore) {
            character.setHp(1);
            character.setAp(0);
            character.setFlags(0);
            character.maxInventorySize = 3;
            character.setAbilityId(4);
            character.setVision(2);
            character.setForce(1);
        } else {
            character.setHp(1);
            character.setAp(0);
            character.setFlags(0);
            character.maxInventorySize = 5;
            character.setAbilityId(4);
            character.setVision(2);
            character.setForce(5);
        }
        return character;
    }

    // ----- STUDENT CHARACTER -----
    // Tutorial character
    static createStudent(character, isHardcore) {
        if (isHardcore) {
            character.setHp(2);
            character.setFlags(4);
            character.setInventorySize(0);
            character.setAbilityId(1);
            character.setVision(3);
            character.setForce(1);
        } else {
            character.setHp(2);
            character.setFlags(4);
            character.setInventorySize(0);
            character.setAbilityId(1);
            character.setVision(3);
            character.setForce(1);
        }
        return character;
    }
}