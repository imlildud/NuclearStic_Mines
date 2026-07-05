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
        this.totalPals = 0;                     // Total pals to rescue
        this.remainingPals = 0;                 // Pals still needing rescue
    }
    
    // Helper to check if fall damage is enabled
    isFallDamageEnabled() {
        return this.gameManager && this.gameManager.isFallDamageEnabled();
    }
    
    // ======================= GOAL SETTER =======================
    
    // Set the number of goals for the current mission
    setCharacterPals(v) {
        this.remainingPals = v;
        this.totalPals = v;
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

        const hasContinuity = this.character.hasKeychain('continuity');
        if (hasContinuity) {
            // Wrap around edges
            if (newX < 0) newX = boardsize - 1;
            else if (newX >= boardsize) newX = 0;
            if (newY < 0) newY = boardsize - 1;
            else if (newY >= boardsize) newY = 0;
        } else {
            // Boundary check
            if (newX < 0 || newX >= boardsize || newY < 0 || newY >= boardsize) return;
        }
    
        const currentTile = board[this.character.getPosX()][this.character.getPosY()];
        const targetTile = board[newX][newY];

        // ===== HEIGHT DIFFERENCE CHECK =====
        const heightDiff = targetTile.getTileheight() - currentTile.getTileheight();
    
        // Ability 4 (Scout) ignores all height restrictions
        if (this.character.getAbilityId() !== 4) {
            const hasAscent = this.character.hasKeychain('ascent');
            const maxClimb = hasAscent ? 2 : 1;

            // Can't climb up more than maxClimb levels
            if (heightDiff > maxClimb) return;

            // Can fall down 2 or more levels
            if (heightDiff < - 1) { // Only trigger if falling 2 or more levels
                const fallDistance = Math.abs(heightDiff);
                const hasDescent = this.character.hasKeychain('descent');
                const hasStealth = this.character.hasKeychain('stealth');

                if (hasAscent && fallDistance < 3){
                }
                else if (hasDescent) {
                    if (this.character.useKeychain('descent')) {
                    } else {
                        return;
                    }
                } else {
                    const fallDamageEnabled = this.isFallDamageEnabled();
                    
                    if (fallDamageEnabled) {
                        let fallDamage = fallDistance - 1;
                        if (hasStealth) {
                            fallDamage = Math.max(0, fallDamage - 1);
                        }
                        if (fallDamage > 0) {
                            this.character.decrementHp(fallDamage);
                            this.character.incrementDamageTaken(fallDamage);

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
                            this.character.incrementDamageTaken(1);
                        
                            if (this.character.getHp() <= 0) {
                                this.killCharacter();
                                return;
                            }
                        }
                    } else {
                        return;
                    }
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
                // STEALTH: Spikes are frozen (never activate)
                const hasStealth = this.character.hasKeychain('stealth');
                if (spikeState === "on" && !hasStealth) {
                    this.character.setPosX(newX);
                    this.character.setPosY(newY);
                    this.hurtCharacter();
                    return;
                }
            }
            // OFF, PREPARED, or STEALTH → movement normal
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
                    // Check for Salvation keychain
                    if (this.character.hasKeychain('salvation') && this.character.isKeychainActive('salvation')) {
                        this.character.useKeychain('salvation');
                        
                        if (this.gameManager && this.gameManager.audio) {
                            this.gameManager.audio.playRescueSFX();
                        }
                        
                        const remaining = this.character.getKeychainUses('salvation');
                    } else {
                        this.character.setHp(0);
                        this.killCharacter();
                    }
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
        const palType = tile.getPalType();
        const isStartTile = tile.isStart();
        
        // ===================== HAZARD HANDLING =====================
        
        // ----- LETHAL HAZARDS (Mine) -----
        if (hazardType === "mine") {
            
            // Ability 1 (Chef) survives if mine is marked
            if (ability === 1 && (isMarked)) {
                return;
            }
            
            // Check if character has armor points
            if (this.character.getAp() > 0) {
                this.character.decrementAp(1);
                
                // Play armor hurt sound
                if (this.gameManager && this.gameManager.audio) {
                    this.gameManager.audio.playHurtMetalSFX();
                }
                
                // Trigger screen blackout effect for dramatic mine explosion
                if (this.gameManager && this.gameManager.renderer) {
                    this.gameManager.renderer.triggerMineFlash();
                }
                return;
            }
            
            // No armor - die
            this.character.setHp(0);
            this.killCharacter();
            return;
        }
        
        // ----- DAMAGE HAZARDS (Cactus, Deadbush, Radioactive radius) -----
        if (hazardType === "cactus" || hazardType === "deadbush" || hasDamageRatio) {
            // Chef survives if marked
            if (ability === 1 && (isMarked)) {
                return;
            }
            
            const hasProtection = this.character.hasKeychain("protection");
            const hasJudgment = this.character.hasKeychain("judgment");
            if (hasProtection && isMarked) {
                return;
            }
            
            // Check if character has armor points
            if (this.character.getAp() > 0) {
                this.character.decrementAp(1);
                
                // Play armor hurt sound
                if (this.gameManager && this.gameManager.audio) {
                    this.gameManager.audio.playHurtMetalSFX();
                }
                return;
            }

            // Criticker damage
            if (this.character.isCriticized() && !hasJudgment) {
                this.character.setCriticized(false);
                this.hurtCharacter();
                
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
            // STEALTH: Nest doesn't break
            const hasStealth = this.character.hasKeychain('stealth');
            
            if (!this.character.isCriticized() && this.character.getAbilityId() != 4 && !hasStealth) {
                this.character.setCriticized(true);
                
                const goal = Math.floor(Math.random() * 5) + 1;
                this.character.setCritickerGoal(goal);
                this.character.setCritickerProgress(0);
                
                tile.setHazardtype("nest_open");
                
                if (this.gameManager && this.gameManager.criticker) {
                    this.gameManager.criticker.activate(goal);
                }
                return;
            } else {
                tile.setHazardtype("nest_open");
                if (!hasStealth) {
                    this.hurtCharacter();
                }
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
        
        // ===================== PAL HANDLING =====================
        
        // Rescue pals if conditions are met
        if (palType !== "none" && tile.isPalAlive()) {
            if (this.character.getForce() > this.character.getRescued()) {
                this.character.incrementRescue();
                tile.setPalType("none");
                tile.setPalAlive(false);
                this.character.setRegen(true);
                
                // Reset destiny target when a pal is rescued
                if (this.gameManager) {
                    this.gameManager.resetDestinyTarget();
                }
                
                if (this.gameManager && this.gameManager.audio) {
                    this.gameManager.audio.playRescueSFX();
                }
            }
        }
        
        // ===================== DELIVERY HANDLING =====================
        
        // Deliver rescued children at start tile
        if (isStartTile) {
            this.deliverPal(board);
        }
    }
    
    // ======================= PAL DELIVERY =======================
    
    // Deliver rescued pals at the start tile and apply rewards
    deliverPal(board) {
        const tile = board[this.character.getPosX()][this.character.getPosY()];
        
        if (tile.isStart() && this.character.getRescued() > 0) {
            const rescued = this.character.getRescued();

            // Play deliver sound
            if (this.gameManager && this.gameManager.audio) {
                this.gameManager.audio.playDeliverSFX();
            }
            
            // ===== MOMMY ABILITY (Ability 3) =====
            // Each rescued pal grants armor, health and force.
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
            this.remainingPals -= rescued;
            this.character.decrementRescue(rescued);
            this.character.incrementTotalRescued(rescued);
        }
    }
    
    // ======================= WIN CONDITION =======================
    
    // Check if player has won (all goals rescued and returned to start)
    winCondition(board) {
        const hasJudgment = this.character.hasKeychain('judgment');
        const allRescued = board[this.character.getPosX()][this.character.getPosY()].isStart() &&
                        this.character.getRescued() === this.remainingPals;
        
        if (hasJudgment) {
            // Must have 0 flags remaining
            return allRescued && this.character.getFlags() === 0;
        }
        
        return allRescued;
    }
    
    // ======================= DAMAGE HANDLING =======================
    
    // Apply damage to character
    hurtCharacter() {
        const hasJudgment = this.character.hasKeychain('judgment');
        const hasOblivion = this.character.hasKeychain('oblivion');
        
        this.character.decrementHp(1);
        this.character.incrementDamageTaken(1);

        if (this.gameManager && this.gameManager.audio) {
            this.gameManager.audio.playHurtSFX();
        }

        this.character.setDamageFlash(true);
        setTimeout(() => {
            if (this.character) {
                this.character.setDamageFlash(false);
            }
        }, 150);
        
        // If Judgment, stay criticized
        if (hasJudgment) {
            this.character.setCriticized(true);
        }

        if (hasOblivion && this.gameManager) {
            const board = this.gameManager.getBoard();
            const flagManager = this.gameManager.flagManager;
            if (board && flagManager && typeof flagManager.removeMarkedHazard === 'function') {
                flagManager.removeMarkedHazard(board);
            }
        }

        // ===== LINK: Kill linked pal on damage =====
        if (this.gameManager) {
            this.gameManager.onPlayerDamage();
        }
        
        if (this.character.getHp() <= 0) this.killCharacter();
    }
    
    // Kill character and trigger game over
    killCharacter() {
        // ===== CHECK FOR REVERSION AUTO-ACTIVATE =====
        if (this.gameManager) {
            const reversionManager = this.gameManager.reversionManager;
            if (reversionManager && reversionManager.autoActivateOnDeath()) {
                // Reversion activated, prevent game over
                return;
            }
        }
        
        if (this.boardController && this.boardController.gameManager) {
            this.character.setAlive(false);
            this.character.incrementDamageTaken(10);
            this.boardController.gameManager.handleGameOver();
        }
    }
        
    // ======================= GETTERS =======================
    
    getTotalPals() { return this.totalPals; }
    getRemainingPals() { return this.remainingPals; }
    getRescuedPals() { return this.character.getRescued(); }
}
