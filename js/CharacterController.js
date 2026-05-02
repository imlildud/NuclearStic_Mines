export class CharacterController {
    constructor(character, boardController) {
        this.character = character; // CharacterModel
        this.boardController = boardController; // BoardController
        this.totalGoals = 0;
        this.remainingGoals = 0;
    }

    // Set number of goals
    setCharacterGoals(v) {
        this.remainingGoals = v;
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
            case "Up": newY--; break;
            case "Down": newY++; break;
            case "Left": newX--; break;
            case "Right": newX++; break;
        }

        if (newX < 0 || newX >= boardsize || newY < 0 || newY >= boardsize) return;

        const currentTile = board[this.character.getPosX()][this.character.getPosY()];
        const targetTile = board[newX][newY];

        // Height difference check
        const heightDiff = Math.abs(targetTile.getTileheight() - currentTile.getTileheight());
        if (this.character.getAbilityId() != 4 && heightDiff >= 2) return;

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
        const ability = this.character.getAbilityId();
        const rand = Math.random;

        const hazardType = tile.getHazardtype();
        const isMarked = tile.isMarked();
        const hasDamageRatio = tile.getDamageratio();
        const hasDetectionRatio = tile.getDetectionratio();
        const goalType = tile.getGoaltype();
        const isStartTile = tile.isStart();

        // ===== HAZARDS =====
    
        // Lethal hazards
        if (hazardType === "mine") {
            if (ability === 1 && (isMarked)) {
                return;
            }
            if (ability === 2 && Math.floor(rand() * 5) === 0) {
                this.character.decrementPoints(1000);
                this.character.setHp(0);
                this.killCharacter();
                return;
            }
            if (ability === 3) {
                if (this.character.getAp() <= 0) {
                    this.character.decrementPoints(1000);
                    this.character.setHp(0);
                    this.killCharacter();
                } else {
                    this.character.decrementAp(1);
                }
            return;
            }
            this.character.decrementPoints(1000);
            this.character.setHp(0);
            this.killCharacter();
            return;
        }

        // Damage hazards
        if (hazardType === "cactus" || hazardType === "deadbush" || hasDamageRatio) {
            if (ability === 2 && Math.floor(rand() * 2) === 0) {
                this.character.decrementPoints(200);
                this.hurtCharacter();
                return;
            }
            if (ability === 3) {
                if (this.character.getAp() <= 0) {
                    this.character.decrementPoints(200);
                    this.hurtCharacter();
                } else {
                    this.character.decrementAp(1);
                }
                return;
            }
            this.character.decrementPoints(200);
            this.hurtCharacter();
            return;
        }

        // Detection hazards
        if (hasDetectionRatio) {
            if (ability === 2 && Math.floor(rand() * 4) === 0) {
                this.character.decrementPoints(50);
            } else if (ability !== 2) {
                this.character.decrementPoints(500);
            }
        }

        // Goal
        if (goalType !== "none") {
            if (this.character.getForce() > this.character.getRescued()) {
                this.character.incrementRescue();
                this.character.incrementPoints(500);
                tile.setGoaltype("none");
                tile.setGoallive(false);
                this.character.setRegen(true);
            }
        }

        // ===== Deliever =====
        if (isStartTile) {
            this.deliverGoal(board);
        }
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