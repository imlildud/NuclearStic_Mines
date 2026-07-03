// ==============================================================
// ====================== FLAG MANAGER ===========================
// ==============================================================
// Handles flag placement and marking logic

export class FlagManager {
    
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    handleFlagDirection(direction, board, player, criticker) {
        if (!board) return;
        
        const px = player.getPosX();
        const py = player.getPosY();
        const abilityId = player.getAbilityId();
        
        let targetX = px, targetY = py;
        let jumpX = px, jumpY = py;
        
        switch(direction) {
            case "Up":    targetY--; jumpY -= 2; break;
            case "Down":  targetY++; jumpY += 2; break;
            case "Left":  targetX--; jumpX -= 2; break;
            case "Right": targetX++; jumpX += 2; break;
        }
        
        const size = board.length;
        if (targetX < 0 || targetX >= size || targetY < 0 || targetY >= size) return;
        
        const tile = board[targetX][targetY];
        
        // ===== SCOUT ABILITY (Ability 4) =====
        if (abilityId === 4) {
            return this.handleScoutFlag(player, board, tile, targetX, targetY, jumpX, jumpY);
        }
        
        // ===== OTHER CHARACTERS =====
        if (abilityId === 1 && tile.isFlagged()) return;
        if (!tile.isHide() || tile.isMarked()) return;
        
        if (tile.isFlagged()) {
            tile.setFlagged(false);
            player.incrementFlags();
            return;
        }
        
        if (player.getFlags() > 0) {
            tile.setFlagged(true);
            player.decrementFlags();
            
            const isChef = (abilityId === 1);
            const isCriticized = player.isCriticized();
            const hasHazard = (tile.getHazardtype() !== "none");
            
            if ((isChef || isCriticized) && hasHazard) {
                tile.setMarked(true);
                tile.setFlagged(false);

                // ===== CONCENTRATION: Reveal 3x3 =====
                const hasConcentration = player.hasKeychain('concentration');
                if (hasConcentration) {
                    const directions = [
                        [-1,-1], [-1,0], [-1,1],
                        [0,-1],  [0,0],  [0,1],
                        [1,-1],  [1,0],  [1,1]
                    ];

                    for (const [dx, dy] of directions) {
                        const nx = targetX + dx;
                        const ny = targetY + dy;

                        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                            const adjacentTile = board[nx][ny];
                            
                            const hazardType = adjacentTile.getHazardtype();
                            if (hazardType !== "none") { 
                                continue;
                            }
                                
                            adjacentTile.setUnhideable(true);
                            adjacentTile.setHide(false);
                        }
                    }
                }
                
                if (isCriticized && criticker) {
                    const currentProgress = player.getCritickerProgress();
                    const goal = player.getCritickerGoal();
                    const newProgress = criticker.markProgress(currentProgress, goal);
                    player.setCritickerProgress(newProgress);
                    
                    if (newProgress >= goal) {
                        player.setCriticized(false);
                    }
                }
            }

            if (isCriticized && !hasHazard) {
                player.setCriticized(false);
                if (criticker) criticker.fail();
            }
        }
    }

    handleScoutFlag(player, board, tile, targetX, targetY, jumpX, jumpY) {
        const size = board.length;
        if (jumpX < 0 || jumpX >= size || jumpY < 0 || jumpY >= size) return;
        
        if (player.getFlags() > 0 && !tile.isJumpflagged()) {
            tile.setJumpflagged(true);
            player.decrementFlags();
            console.log(`[Scout] Jump flag placed at (${targetX},${targetY}), flags left: ${player.getFlags()}`);
        }
        
        if (tile.isJumpflagged()) {
            player.setPosX(jumpX);
            player.setPosY(jumpY);
            return { jumped: true, x: jumpX, y: jumpY };
        }
        return { jumped: false };
    }
}