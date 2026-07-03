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
        
        const flagMode = this.gameManager.getFlagModeManager().getFlagMode();
        
        // ===== REVELATION MODE =====
        if (flagMode === 1) {
            return this.handleRevelation(direction, board, player);
        }
        
        // ===== MEMORY MODE =====
        if (flagMode === 2) {
            return this.handleMemory(direction, board, player);
        }
        
        // ===== PURITY MODE =====
        if (flagMode === 3) {
            return this.handlePurity(direction, board, player);
        }
        
        // ===== NORMAL MODE =====
        return this.handleNormalFlag(direction, board, player, criticker);
    }

    // ===== REVELATION: Reveal tile (10 uses) =====
    handleRevelation(direction, board, player) {
        const px = player.getPosX();
        const py = player.getPosY();
        let targetX = px, targetY = py;
        
        switch(direction) {
            case "Up":    targetY--; break;
            case "Down":  targetY++; break;
            case "Left":  targetX--; break;
            case "Right": targetX++; break;
        }
        
        const size = board.length;
        if (targetX < 0 || targetX >= size || targetY < 0 || targetY >= size) return;
        
        const tile = board[targetX][targetY];
        
        // Only reveal if hidden and has uses left
        if (tile.isHide() && player.getKeychainUses('revelation') > 0) {
            tile.setHide(false);
            player.useKeychain('revelation');
            this.gameManager.updateFlagUI();
            console.log('[Revelation] Revealed tile at', targetX, targetY);
        }
    }

    // ===== MEMORY: Place markers (3 per level) =====
    handleMemory(direction, board, player) {
        const px = player.getPosX();
        const py = player.getPosY();
        let targetX = px, targetY = py;
        
        switch(direction) {
            case "Up":    targetY--; break;
            case "Down":  targetY++; break;
            case "Left":  targetX--; break;
            case "Right": targetX++; break;
        }
        
        const size = board.length;
        if (targetX < 0 || targetX >= size || targetY < 0 || targetY >= size) return;
        
        const tile = board[targetX][targetY];
        
        // Check if tile already has a marker
        if (tile.hasMemoryMarker()) {
            tile.clearMemoryMarker();
            this.gameManager.updateFlagUI();
            console.log('[Memory] Removed marker at', targetX, targetY);
            return;
        }
        
        // Get available markers (a, b, c)
        const markers = ['a', 'b', 'c'];
        const usedMarkers = [];
        
        // Find used markers on board
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const marker = board[i][j].getMemoryMarker();
                if (marker) usedMarkers.push(marker);
            }
        }
        
        // Find available marker
        const available = markers.filter(m => !usedMarkers.includes(m));
        if (available.length === 0) {
            console.log('[Memory] No markers available');
            return;
        }
        
        // Place marker
        tile.setMemoryMarker(available[0]);
        this.gameManager.memoryMarkers = available.length - 1;
        this.gameManager.updateFlagUI();
        console.log('[Memory] Placed marker', available[0], 'at', targetX, targetY);
    }

    // ===== PURITY: Clean damageratio tiles (9 uses) =====
    handlePurity(direction, board, player) {
        const px = player.getPosX();
        const py = player.getPosY();
        let targetX = px, targetY = py;
        
        switch(direction) {
            case "Up":    targetY--; break;
            case "Down":  targetY++; break;
            case "Left":  targetX--; break;
            case "Right": targetX++; break;
        }
        
        const size = board.length;
        if (targetX < 0 || targetX >= size || targetY < 0 || targetY >= size) return;
        
        const tile = board[targetX][targetY];
        
        // Only clean if has damageratio and has uses left
        if (tile.getDamageratio() && player.getKeychainUses('purity') > 0) {
            tile.setDamageratio(false);
            player.useKeychain('purity');
            this.gameManager.updateFlagUI();
            console.log('[Purity] Cleaned damageratio at', targetX, targetY);
        }
    }
    

    // ===== NORMAL FLAG =====
    handleNormalFlag(direction, board, player, criticker) {
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