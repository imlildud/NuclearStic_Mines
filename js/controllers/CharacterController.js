// ==============================================================
// ==================== CHARACTER CONTROLLER ====================
// ==============================================================
// Handles character movement, tile interaction, combat,
// goal delivery, and game status management

export class CharacterController {
    
    // ======================= CONSTRUCTOR =======================
    
    constructor(character, boardController, gameManager) {
        this.character = character;              // Reference to CharacterModel
        this.boardController = boardController;  // Reference to BoardController
        this.gameManager = gameManager;          // Reference to GameManager for settings
        this.totalGoals = 0;                     // Total goals to rescue
        this.remainingGoals = 0;                 // Goals still needing rescue
    }
    
    // Helper to check if fall damage is enabled
    isFallDamageEnabled() {
        return this.gameManager && this.gameManager.isFallDamageEnabled();
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
    
        const oldX = this.character.getPosX();
        const oldY = this.character.getPosY();
        const oldTile = board[oldX][oldY];
    
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
        const heightDiff = targetTile.getTileheight() - currentTile.getTileheight();
    
        // Ability 4 (Scout) ignores all height restrictions
        if (this.character.getAbilityId() !== 4) {
            // Can't climb up 2 or more levels
            if (heightDiff >= 2) return;

            // Can fall down 2 or more levels
            if (heightDiff <= -2) {
                const fallDamageEnabled = this.isFallDamageEnabled();
                const fallDistance = Math.abs(heightDiff);
                
                if (fallDamageEnabled) {
                    // FALL DAMAGE ENABLED: Allow fall but take damage
                    const fallDamage = fallDistance - 1;
                    if (fallDamage > 0) {
                        this.character.decrementHp(fallDamage);
                        this.character.incrementDamageTaken(1);
                    
                        if (this.character.getHp() <= 0) {
                            this.killCharacter();
                            return;
                        }
                    }
                    // Continue with movement after fall
                } else {
                    // FALL DAMAGE DISABLED: Block the fall (original behavior)
                    // Cannot fall 2 or more levels
                    return;
                }
            }
        }

        // ===== OBSTACLE HANDLING =====
        const obst = targetTile.getObstacletype();
        const pipe = targetTile.getHazardtype() === "pipe";

        // ===== SPIKE CHECK =====
        if (obst === "spikes") {
            if (this.gameManager && this.gameManager.spikeController) {
                const spikeState = this.gameManager.spikeController.getStateAt(newX, newY);
                if (spikeState === "on") {
                    this.character.setPosX(newX);
                    this.character.setPosY(newY);
                    this.hurtCharacter();
                    return;
                }
            }
            // OFF o PREPARED → movimiento normal
            this.character.setPosX(newX);
            this.character.setPosY(newY);
            return;
        }

        switch (obst) {
            case "natural":
                if (this.character.getAbilityId() === 4) {
                    this.character.setPosX(newX);
                    this.character.setPosY(newY);
                }
            return;
            case "river":
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
            case "pit":
                this.character.setPosX(newX);
                this.character.setPosY(newY);
                if (this.character.getAbilityId() !== 4) {
                    this.character.setHp(0);
                    this.killCharacter();
                }
            return;
            case "safepit":
                this.character.setPosX(newX);
                this.character.setPosY(newY);
                if (this.boardController && this.boardController.gameManager) {
                    this.boardController.gameManager.onTutorialPitFall();
                }
            return;
        }

        if (pipe) {
            if (this.character.getAbilityId() === 4) {
                this.character.setPosX(newX);
                this.character.setPosY(newY);
            }
            return;
        }
    
        // Normal movement (no obstacle)
        this.character.setPosX(newX);
        this.character.setPosY(newY);

        // ===== MOMMY SMOKE CLEARING ABILITY (Ability 3) =====
        if (this.character.getAbilityId() === 3) {
            // Restore smoke on previous tile if it was cleared by Mommy
            if (oldTile.wasSmokeCleared()) {
                oldTile.setSmoke(true);
                oldTile.setSmokeCleared(false);
            }
        
            // Clear smoke on new tile
            const newTile = board[newX][newY];
            if (newTile.isSmoke()) {
                newTile.setSmoke(false);
                newTile.setSmokeCleared(true);
            }
        }
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
            
            // Ability 1 (Chef) survives if mine is marked
            if (ability === 1 && (isMarked)) {
                return;
            }
            // Ability 3 (mommy) uses armor points
            if (ability === 3) {
                if (this.character.getAp() <= 0) {
                    this.character.setHp(0);
                    this.killCharacter();
                } else {
                    this.character.decrementAp(1);
                    
                    // Play death sound for dramatic effect
                    if (this.gameManager && this.gameManager.audio) {
                        this.gameManager.audio.playDeathSFX();
                    }
                    
                    // Trigger screen blackout effect
                    if (this.gameManager && this.gameManager.renderer) {
                        this.gameManager.renderer.triggerMineFlash();
                    }
                }
                return;
            }
            // Normal death
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
                    this.hurtCharacter();
                } else {
                    this.character.decrementAp(1);
                    
                    // Play armor hurt sound
                    if (this.gameManager && this.gameManager.audio) {
                        this.gameManager.audio.playHurtMetalSFX();
                    }
                }
                return;
            }

            // Critiker damage
            if (this.character.isCriticized()) {
                this.character.setCriticized(false);
                this.hurtCharacter();
                
                // Notify criticker of abandonment
                if (this.gameManager && this.gameManager.criticker) {
                    this.gameManager.criticker.abandon();
                }
            }

            // Normal damage
            this.hurtCharacter();
            return;
        }

        // ===== CRITICKER NEST HANDLING =====
        if (hazardType === "nest") {
            if (!this.character.isCriticized() && this.character.getAbilityId() != 4) {
                this.character.setCriticized(true);
                
                const goal = Math.floor(Math.random() * 5) + 1;
                this.character.setCritickerGoal(goal);
                this.character.setCritickerProgress(0);
                
                tile.setHazardtype("nest_open");
                
                // Activate Criticker controller via GameManager (NOT a local method)
                if (this.gameManager && this.gameManager.criticker) {
                    this.gameManager.criticker.activate(goal);
                }
                
                return;
            } else {
                tile.setHazardtype("nest_open");
                this.hurtCharacter();
            }
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

                // Play rescue sound
                if (this.gameManager && this.gameManager.audio) {
                    this.gameManager.audio.playRescueSFX();
                }
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

            // Play deliver sound
            if (this.gameManager && this.gameManager.audio) {
                this.gameManager.audio.playDeliverSFX();
            }
            
            // ===== MOMMY ABILITY (Ability 3) =====
            // Each rescued child grants armor, health and force.
            if (this.character.getAbilityId() === 3) {
                for (let i = 0; i < rescued; i++) {
                    if (this.character.getAp() < 3) {
                        this.character.incrementAp(1);
                    } else {
                        this.character.incrementHp(2);
                    }
                    this.character.incrementForce(1);
                }
            }
            
            // Update mission stats
            this.remainingGoals -= rescued;
            this.character.decrementRescue(rescued);
            this.character.incrementTotalRescued(rescued);
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

        // Play hurt sound
        if (this.gameManager && this.gameManager.audio) {
            this.gameManager.audio.playHurtSFX();
        }

        // Trigger visual damage flash (set flag for renderer)
        this.character.setDamageFlash(true);
        setTimeout(() => {
            if (this.character) {
                this.character.setDamageFlash(false);
            }
        }, 150);
        
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
