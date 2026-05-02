import { CharacterModel } from "./CharacterModel.js";

export class CharacterFactory {
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
                throw new Error(`Unknow character: ${characterType}`);
        }
    }

    static createChef(character) {
        character.setHp(5);
        character.setFlags(5);
        character.setInventorySize(4);
        character.setAbilityId(1);
        character.setVision(2);
        character.setForce(3);
        return character;
    }

    static createMosquito(character) {
        character.setHp(3);
        character.setFlags(8);
        character.setInventorySize(5);
        character.setAbilityId(2);
        character.setVision(5);
        character.setForce(2);
        return character;
    }

    static createMommy(character) {
        character.setHp(10);
        character.setAp(3);
        character.setFlags(1);
        character.setInventorySize(1);
        character.setAbilityId(3);
        character.setVision(1);
        character.setForce(1);
        return character;
    }

    static createScout(character) {
        character.setHp(1);
        character.setAp(0);
        character.setFlags(2);
        character.setInventorySize(2);
        character.setAbilityId(4);
        character.setVision(2);
        character.setForce(5);
        return character;
    }
}