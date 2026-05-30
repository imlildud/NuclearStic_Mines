// ==============================================================
// ==================== CHARACTER CONTROLLER ====================
// ==============================================================
// Handles character movement, tile interaction, combat,
// goal delivery, and game status management

export class CharacterController {
    
    // ======================= CONSTRUCTOR =======================
    
    constructor(character, boardController) {
        this.character = character;              // Reference to CharacterModel
        this.boardController = boardController;  // Reference to BoardController
        this.totalGoals = 0;                     // Total goals to rescue
        this.remainingGoals = 0;                 // Goals still needing rescue
    }
    
    // ======================= GOAL SETTER =======================
    
    // Set the number of goals for the current mission
    setCharacterGoals(v) {
        this.remainingGoals = v;
        this.totalGoals = v;
    }
    
    // ======================= START POSITION =======================
    
    // Find and set the start tile coordinates on the board
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
    
    // ======================= MOVEMENT SYSTEM =======================
    
    // Move character in a direction, handling obstacles and terrain
    moveCharacter(direction, board, riverDepth = 0) {
        const boardsize = board.length;
        let newX = this.character.getPosX();
        let newY = this.character.getPosY();
        
        // Calculate new position based on direction
        switch (direction) {
            case "Up": newY--; break;
            case "Down": newY++; break;
            case "Left": newX--; break;
            case "Right": newX++; break;
        }
        
        // Boundary check
        if (newX < 0 || newX >= boardsize || newY < 0 || newY >= boardsize) return;
        
        const currentTile = board[this.character.getPosX()][this.character.getPosY()];
        const targetTile = board[newX][newY];
        
        // ===== HEIGHT DIFFERENCE CHECK =====
        const heightDiff = Math.abs(targetTile.getTileheight() - currentTile.getTileheight());
        // Ability 4 (climber) ignores height restrictions
        if (this.character.getAbilityId() != 4 && heightDiff >= 2) return;
        
        // ===== OBSTACLE HANDLING =====
        const obst = targetTile.getObstacletype();
        const pipe = targetTile.getHazardtype() === "pipe";
        
        switch (obst) {
            case "natural":
                // Natural obstacle - only climbers can enter
                if (this.character.getAbilityId() === 4) {
                    this.character.setPosX(newX);
                    this.character.setPosY(newY);
                }
                return;
                
            case "pit":
                // Pit - always enter, but kills non-climbers
                this.character.setPosX(newX);
                this.character.setPosY(newY);
                if (this.character.getAbilityId() !== 4) {
                    this.character.setHp(0);
                    this.killCharacter();
                }
                return;
                
            case "river":
                // River - can be traversed multiple times, drowning after 5 steps
                this.character.setPosX(newX);
                this.character.setPosY(newY);
                if (this.character.getAbilityId() !== 4) {
                    if (riverDepth < 5) {
                        this.moveCharacter(direction, board, riverDepth + 1);
                    } else {
                        this.character.setHp(0);
                        this.killCharacter();
                    }
                }
                return;
        }

        // ===== OBSTACLE HANDLING =====
        if (pipe){
            if (this.character.getAbilityId() === 4) {
                    this.character.setPosX(newX);
                    this.character.setPosY(newY);
                }
                return;
        }
        
        // Normal movement (no obstacle)
        this.character.setPosX(newX);
        this.character.setPosY(newY);
    }
    
    // ======================= TILE VERIFICATION =======================
    
    // Verify and handle tile effects when stepping on a tile
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
        
        // ===================== HAZARD HANDLING =====================
        
        // ----- LETHAL HAZARDS (Mine) -----
        if (hazardType === "mine") {
            // Ability 1 (scout) survives if mine is marked
            if (ability === 1 && (isMarked)) {
                return;
            }
            // Ability 3 (mommy) uses armor points
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
            // Normal death
            this.character.decrementPoints(1000);
            this.character.setHp(0);
            this.killCharacter();
            return;
        }
        
        // ----- DAMAGE HAZARDS (Cactus, Deadbush, Radioactive radius) -----
        if (hazardType === "cactus" || hazardType === "deadbush" || hasDamageRatio) {
            // Scout survives if marked
            if (ability === 1 && (isMarked)) {
                return;
            }
            // Mommy uses armor
            if (ability === 3) {
                if (this.character.getAp() <= 0) {
                    this.character.decrementPoints(100);
                    this.hurtCharacter();
                } else {
                    this.character.decrementAp(1);
                }
                return;
            }
            // Normal damage
            this.character.decrementPoints(100);
            this.hurtCharacter();
            return;
        }
        
        // ----- DETECTION HAZARDS (SpiderMine, Bandit, Sandsnake) -----
        // Note: Detection logic placeholder for future implementation
        if (hasDetectionRatio) {
            if (ability === 2 && Math.floor(rand() * 4) === 0) {
                // Mosquito ability has chance to avoid detection
            } else if (ability !== 2) {
                // Normal detection behavior
            }
        }
        
        // ===================== GOAL HANDLING =====================
        
        // Rescue children if conditions are met
        if (goalType !== "none") {
            // Player needs enough force to rescue
            if (this.character.getForce() > this.character.getRescued()) {
                this.character.incrementRescue();
                tile.setGoaltype("none");    // Remove goal
                tile.setGoallive(false);     // Mark as rescued
                this.character.setRegen(true); // Trigger regeneration
            }
        }
        
        // ===================== DELIVERY HANDLING =====================
        
        // Deliver rescued children at start tile
        if (isStartTile) {
            this.deliverGoal(board);
        }
    }
    
    // ======================= GOAL DELIVERY =======================
    
    // Deliver rescued children at the start tile and apply rewards
    deliverGoal(board) {
        const tile = board[this.character.getPosX()][this.character.getPosY()];
        
        if (tile.isStart() && this.character.getRescued() > 0) {
            const rescued = this.character.getRescued();
            
            // ===== MOMMY ABILITY (Ability 3) =====
            // Each rescued child grants armor, health, force, and flags
            if (this.character.getAbilityId() === 3) {
                for (let i = 0; i < rescued; i++) {
                    if (this.character.getAp() < 3) {
                        this.character.incrementAp(1);
                    } else {
                        this.character.incrementHp(2);
                    }
                    this.character.incrementForce(1);
                    this.character.incrementFlags();
                }
            }
            
            // Update mission stats
            this.remainingGoals -= rescued;
            this.character.decrementRescue(rescued);
            this.character.incrementTotalRescued(rescued);
            this.character.incrementPoints(500); // Delivery bonus
        }
    }
    
    // ======================= WIN CONDITION =======================
    
    // Check if player has won (all goals rescued and returned to start)
    winCondition(board) {
        return board[this.character.getPosX()][this.character.getPosY()].isStart() &&
               this.character.getRescued() === this.remainingGoals;
    }
    
    // ======================= DAMAGE HANDLING =======================
    
    // Apply damage to character
    hurtCharacter() {
        this.character.decrementHp(1);
        this.character.incrementDamageTaken(1); 
        if (this.character.getHp() <= 0) this.killCharacter();
    }
    
    // Kill character and trigger game over
    killCharacter() {
        this.character.setAlive(false);
        this.character.incrementDamageTaken(10); 
        if (this.boardController && this.boardController.gameManager) {
            this.boardController.gameManager.handleGameOver();
        }
    }
    
    // ======================= GETTERS =======================
    
    getTotalGoals() { return this.totalGoals; }
    getRemainingGoals() { return this.remainingGoals; }
    getRescuedGoals() { return this.character.getRescued(); }
}