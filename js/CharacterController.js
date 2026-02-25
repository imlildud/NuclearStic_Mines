import { TileModel } from "./TileModel.js";
import { CharacterModel } from "./CharacterModel.js";
import { BoardController } from "./BoardController.js";

export class CharacterController {
    constructor(character, boardController) {
        this.character = character; // CharacterModel
        this.boardController = boardController; // BoardController
        this.totalGoals = 0;
        this.remainingGoals = 0;
    }

    // Set number of goals
    setCharacterGoals(level) {
        this.totalGoals = this.boardController.loadNumberOfGoals(level);
        this.remainingGoals = this.totalGoals;
    }

    // Find the start tile coordinates
    getStartCoords(board) {
        const boardsize = board.length;
        for (let i = 0; i < boardsize; i++) {
            for (let j = 0; j < boardsize; j++) {
                if (board[i][j].isStart()) {
                    this.character.setPosX(i);
                    this.character.setPosY(j);
                    return;
                }
            }
        }
    }

    moveCharacter(direction, board, riverDepth = 0) {
        const boardsize = board.length;
        let newX = this.character.getPosX();
        let newY = this.character.getPosY();

        switch (direction) {
            case "Up": newX--; break;
            case "Down": newX++; break;
            case "Left": newY--; break;
            case "Right": newY++; break;
        }

        if (newX < 0 || newX >= boardsize || newY < 0 || newY >= boardsize) return;

        const currentTile = board[this.character.getPosX()][this.character.getPosY()];
        const targetTile = board[newX][newY];

        // Height difference check
        const heightDiff = Math.abs(targetTile.getTileheight() - currentTile.getTileheight());
        if (heightDiff >= 2) return;

        // Obstacles
        const obst = targetTile.getObstacletype();
        switch (obst) {
            case "natural":
                if (this.character.getAbilityId() === 4) {
                    this.character.setPosX(newX);
                    this.character.setPosY(newY);
                }
                return;
            case "pit":
                this.character.setPosX(newX);
                this.character.setPosY(newY);
                if (this.character.getAbilityId() !== 4) this.killCharacter();
                return;
            case "river":
                this.character.setPosX(newX);
                this.character.setPosY(newY);
                if (this.character.getAbilityId() !== 4) {
                    if (riverDepth < 5) {
                        this.moveCharacter(direction, board, riverDepth + 1);
                    } else {
                        this.killCharacter();
                    }
                }
                return;
        }

        this.character.setPosX(newX);
        this.character.setPosY(newY);
    }

    verifyTile(board) {
        const tile = board[this.character.getPosX()][this.character.getPosY()];
        const rand = Math.random;

        // Lethal hazards
        const lethal = ["mine", "spiderMine"];
        if (lethal.includes(tile.getHazardtype())) {
            const ability = this.character.getAbilityId();
            if (ability === 1 && !tile.isFlagged()) {
                this.killCharacter();
                return;
            }
            if (ability === 2 && Math.floor(rand() * 5) === 0) {
                this.character.decrementPoints(1000);
                this.killCharacter();
                return;
            }
            if (ability === 3) {
                if (this.character.getAp() <= 0) {
                    this.character.decrementPoints(1000);
                    this.killCharacter();
                    return;
                } else {
                    this.character.decrementAp(1);
                    return;
                }
            }
            this.character.decrementPoints(1000);
            this.killCharacter();
            return;
        }

        // Damage hazards
        const damage = ["cactus", "deadbush"];
        if (damage.includes(tile.getHazardtype()) || tile.getDamageratio()) {
            const ability = this.character.getAbilityId();
            if (ability === 2 && Math.floor(rand() * 2) === 0) {
                this.character.decrementPoints(200);
                this.hurtCharacter();
                return;
            }
            if (ability === 3) {
                if (this.character.getAp() <= 0) {
                    this.character.decrementPoints(200);
                    this.hurtCharacter();
                    return;
                } else {
                    this.character.decrementAp(1);
                    return;
                }
            }
            this.character.decrementPoints(200);
            this.hurtCharacter();
            return;
        }

        // Detection hazards
        if (tile.getDetectionratio()) {
            if (this.character.getAbilityId() === 2) {
                if (Math.floor(rand() * 4) === 0) {
                    this.character.decrementPoints(50);
                    return;
                }
            } else {
                this.character.decrementPoints(500);
                return;
            }
        }

        // Goal
        if (tile.getGoaltype() !== "none") {
            if (this.character.getForce() > this.character.getRescued()) {
                this.character.incrementRescue();
                this.character.incrementPoints(500);
                tile.setGoaltype("none");
                this.character.setRegen(true);
            }
        }

        // Start tile delivery
        if (tile.isStart()) this.deliverGoal(board);
    }

    deliverGoal(board) {
        const tile = board[this.character.getPosX()][this.character.getPosY()];
        if (tile.isStart() && this.character.getRescued() > 0) {
            const rescued = this.character.getRescued();
            this.remainingGoals -= rescued;
            this.character.decrementRescue(rescued);
        }
    }

    winCondition(board) {
        return board[this.character.getPosX()][this.character.getPosY()].isStart() &&
               this.character.getRescued() === this.remainingGoals;
    }

    hurtCharacter() {
        this.character.decrementHp(1);
        if (this.character.getHp() <= 0) this.killCharacter();
    }

    killCharacter() {
        this.character.setAlive(false);
    }

    getTotalGoals() { return this.totalGoals; }
    getRemainingGoals() { return this.remainingGoals; }
    getRescuedGoals() { return this.character.getRescued(); }
}
