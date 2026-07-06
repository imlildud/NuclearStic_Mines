// ==============================================================
// ===================== BOARD CONTROLLER =======================
// ==============================================================
// Handles procedural board generation for standard game modes.
// Extends BaseBoardController and overrides generation methods.

import { BaseBoardController } from "./base/BaseBoardController.js";

export class BoardController extends BaseBoardController {
    
    // ======================= DIFFICULTY LOADERS =======================
    
    loadDifficulty(level) {
        const startSize = 8;
        const step = 4;
        return startSize + Math.floor(step * (level / 5));
    }
    
    loadNumberOfHazard(level) {
        const startHazards = 7;
        const step = 7;
        return startHazards + Math.floor(step * (level / 5));
    }
    
    loadNumberOfHazardBySize(size) {
        const baseSize = 8;
        const baseHazards = 7;
        const step = 4;
        const hazardStep = 7;
        const increment = Math.floor((size - baseSize) / step) * hazardStep;
        return baseHazards + increment;
    }
    
    loadNumberOfGoals(level) {
        const startGoals = 1;
        const step = 1;
        return startGoals + Math.floor(step * (level / 5));
    }
    
    loadTypeOfZone(level) {
        const lvl = Math.floor(Number(level));
        if (lvl <= 9) return "desert";
        if (lvl <= 19) return "snow";
        return "ash";
    }
    
    // ======================= BOARD GENERATION =======================
    
    generateBoard(boardSize) {
        return this.createEmptyBoard(boardSize);
    }
    
    generateStartAndPal(board, numPals, level) {
        const boardSize = board.length;
        const probability = this.randInt(0, 3);
        const edgemin = 0;
        const edgemax = boardSize - 1;
        const randomPos = this.randInt(0, boardSize - 1);
        
        const palTypes = [
            { type: "charlie", minLevel: 0 },
            { type: "joni", minLevel: 5 },
            { type: "ru", minLevel: 9999 },
            { type: "evy", minLevel: 9999 },
            { type: "zac", minLevel: 9999 }
        ];
        
        const validPals = palTypes.filter(g => level >= g.minLevel);
        
        switch (probability) {
            case 0: board[edgemin][randomPos].setStart(true); break;
            case 1: board[randomPos][edgemin].setStart(true); break;
            case 2: board[edgemax][randomPos].setStart(true); break;
            case 3: board[randomPos][edgemax].setStart(true); break;
        }
        
        if (validPals.length === 0) {
            console.warn("No valid pals");
            return board;
        }
        
        let remainingPals = numPals;
        let attempts = 0;
        const maxattempts = 5000;
    
        while (remainingPals > 0 && attempts < maxattempts) {
            attempts++;
            let palX = this.randInt(0, boardSize - 1);
            let palY = this.randInt(0, boardSize - 1);
            
            switch (probability) {
                case 0: if (palX <= boardSize / 2) palX = Math.floor(boardSize / 2 + this.random() * (boardSize / 2)); break;
                case 1: if (palY <= boardSize / 2) palY = Math.floor(boardSize / 2 + this.random() * (boardSize / 2)); break;
                case 2: if (palX >= boardSize / 2) palX = Math.floor(this.random() * (boardSize / 2)); break;
                case 3: if (palY >= boardSize / 2) palY = Math.floor(this.random() * (boardSize / 2)); break;
            }
            
            const tile = board[palX][palY];
            
            if (tile.getPalType() === "none" && !tile.isStart()) {
                const palIndex = this.randInt(0, validPals.length - 1);
                tile.setPalType(validPals[palIndex].type);
                tile.setPalAlive(true);
                
                if (validPals[palIndex].type === "joni") {
                    tile.setSecurehidden(true);
                } else {
                    tile.setSecure(true);
                }
                
                console.log(`Pal tile generated at [${palX},${palY}]: ${validPals[palIndex].type}`);
                remainingPals--;
            }
            
            if (attempts >= maxattempts) {
                console.warn("Pal generation stopped by safety");
            }
        }
        
        return board;
    }
    
    setSafeTiles(board, size) {
        const boardSize = board.length;
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, 1], [-1, -1], [1, 1], [1, -1]
        ];
        
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                board[i][j].setHide(false);
                
                if (board[i][j].getPalType() === "joni") {
                    for (const [dx, dy] of directions) {
                        const x = i + dx, y = j + dy;
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                            board[x][y].setSecurehidden(true);
                        }
                    }
                } else if (board[i][j].isStart() || board[i][j].getPalType() !== "none") {
                    for (const [dx, dy] of directions) {
                        const x = i + dx, y = j + dy;
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                            board[x][y].setSecure(true);
                        }
                    }
                }
            }
        }
        return board;
    }
    
    generateHeights(board, level, size) {
        const boardSize = size;
        
        if (level >= 3) {
            const totalHeights = this.randInt(5, Math.floor((boardSize - 1) / 2) + level);
            
            const heightTypes = [
                { type: 1, weight: 0.45, minLevel: 3 },
                { type: 2, weight: 0.35, minLevel: 5 },
                { type: 3, weight: 0.3, minLevel: 10 },
                { type: 4, weight: 0.25, minLevel: 15 }
            ];
            
            const validHeights = heightTypes.filter(ht => level >= ht.minLevel);
            const totalWeight = validHeights.reduce((s, ht) => s + ht.weight, 0);
            validHeights.forEach(ht => ht.weight /= totalWeight);
            
            let remaining = totalHeights;
            
            while (remaining > 0) {
                const roll = this.random();
                let acc = 0;
                let chosenType = 1;
                
                for (const ht of validHeights) {
                    acc += ht.weight;
                    if (roll <= acc) {
                        chosenType = ht.type;
                        break;
                    }
                }
                
                const x = this.randInt(0, boardSize - 1);
                const y = this.randInt(0, boardSize - 1);
                const tile = board[x][y];
                
                if (!tile.isStart() && tile.getPalType() === "none" && !tile.isSecure() && !tile.isSecurehidden() &&
                    !tile.isMarked() && tile.getHazardtype() === "none" && tile.getObstacletype() === "none") {
                    tile.setTileheight(chosenType);
                    remaining--;
                }
            }
        }
        
        // Propagate height influence
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];
                
                if (tile.getTileheight() > 1) {
                    const heightFounded = tile.getTileheight();
                    
                    const patternType = this.randInt(0, 5);
                    let directions = [];
                    
                    switch (patternType) {
                        case 0:
                            directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
                            break;
                        case 1:
                            directions = [[-1,0],[1,0],[0,-1],[0,1]];
                            break;
                        case 2:
                            directions = [[-1,-1],[-1,1],[1,-1],[1,1]];
                            break;
                        case 3:
                            directions = [[-2,0],[2,0],[0,-2],[0,2],[-1,0],[1,0],[0,-1],[0,1]];
                            break;
                        case 4:
                            directions = [[-2,-2],[-2,2],[2,-2],[2,2],[-1,-1],[-1,1],[1,-1],[1,1]];
                            break;
                        case 5:
                            const dx = this.randInt(-4, 4);
                            const dy = this.randInt(-4, 4);
                            directions = [[dx, dy]];
                            break;
                    }
                    
                    for (const [dx, dy] of directions) {
                        const x = i + dx;
                        const y = j + dy;
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                            const targetTile = board[x][y];
                            
                            if (!targetTile.isStart() && 
                                targetTile.getPalType() === "none" && 
                                !targetTile.isSecure() &&
                                !targetTile.isSecurehidden() &&
                                !targetTile.isMarked() && 
                                targetTile.getHazardtype() === "none" && 
                                targetTile.getObstacletype() === "none") {
                                
                                const newHeight = Math.max(1, heightFounded - 1);
                                targetTile.setTileheight(newHeight);
                            }
                        }
                    }
                }
            }
        }
        return board;
    }
    
    generateObstacles(board, level, size) {
        const boardSize = size;
        
        if (level >= 3) {
            const totalObstacles = this.randInt(5, Math.floor((boardSize - 1) / 2) + level);
            
            const obstacleTypes = [
                { type: "natural", weight: 0.45, minLevel: 3 },
                { type: "river", weight: 0.35, minLevel: 5 },
                { type: "spikes", weight: 0.25, minLevel: 10},
                { type: "pit", weight: 0.15, minLevel: 15 }
            ];
            
            const validObstacles = obstacleTypes.filter(ot => level >= ot.minLevel);
            const totalWeight = validObstacles.reduce((sum, ot) => sum + ot.weight, 0);
            validObstacles.forEach(ot => ot.weight /= totalWeight);
            
            let remaining = totalObstacles;
            while (remaining > 0) {
                const roll = this.random();
                let acc = 0;
                let chosenType = "natural";
                
                for (const ot of validObstacles) {
                    acc += ot.weight;
                    if (roll <= acc) {
                        chosenType = ot.type;
                        break;
                    }
                }
                
                const x = this.randInt(0, boardSize - 1);
                const y = this.randInt(0, boardSize - 1);
                const tile = board[x][y];
                
                if (!tile.isStart() && tile.getPalType() === "none" && !tile.isSecure() &&
                    !tile.isSecurehidden() && !tile.isMarked() && tile.getHazardtype() === "none" &&
                    tile.getObstacletype() === "none") {
                    tile.setObstacletype(chosenType);
                    remaining--;
                }
            }
        }
        return board;
    }
    
    generateHazards(board, totalHazards, level, size) {
        const boardSize = size;
    
        const hazardTypes = [
            { type: "mine", weight: 0.3, minLevel: 0 },
            { type: "cactus", weight: 0.3, minLevel: 0 },
            { type: "deadbush", weight: 0.3, minLevel: 9999 }, // 3
            { type: "pipe", weight: 0.15, minLevel: 5 },
            { type: "nest", weight: 0.02, minLevel: 8 },
            { type: "radioactive", weight: 0.1, minLevel: 10 },
            { type: "spiderMine", weight: 0.2, minLevel: 9999 }, // 12
            { type: "bandit", weight: 0.1, minLevel: 9999 }, // 15
            { type: "liberal", weight: 0.0, minLevel: 9999 }, // 0
            { type: "sandsnake", weight: 0.1, minLevel: 9999 }, // 18
            { type: "dunecrawler", weight: 0.01, minLevel: 9999 } // 20
        ];
    
        const validHazards = hazardTypes.filter(ht => level >= ht.minLevel);
        const totalWeight = validHazards.reduce((sum, ht) => sum + ht.weight, 0);
        validHazards.forEach(ht => ht.weight /= totalWeight);
    
        let remaining = totalHazards;
        let attempts = 0;
        const maxAttempts = 5000;
    
        while (remaining > 0 && attempts < maxAttempts) {
            const roll = this.random();
            let acc = 0;
            let chosenType = "mine";
        
            for (const ht of validHazards) {
                acc += ht.weight;
                if (roll <= acc) {
                    chosenType = ht.type;
                    break;
                }
            }
        
            const x = this.randInt(0, boardSize - 1);
            const y = this.randInt(0, boardSize - 1);
            const tile = board[x][y];
        
            if (!tile.isStart() && tile.getPalType() === "none" && !tile.isSecure() &&
                !tile.isSecurehidden() && !tile.isMarked() && tile.getHazardtype() === "none" &&
                tile.getObstacletype() === "none") {
            
                tile.setHazardtype(chosenType);
                tile.setHazardlive(false);
            
                if (["deadbush", "bandit", "liberal", "dunecrawler"].includes(chosenType)) {
                    tile.setHazardlive(true);
                }
            
                if (chosenType === "pipe") {
                    this.applyRadiusWithHeightCheck(tile, board, x, y, "setSmoke");
                }
                if (chosenType === "radioactive") {
                    this.applyRadiusWithHeightCheck(tile, board, x, y, "setDamageratio");
                }
                if (["spiderMine", "liberal", "sandsnake"].includes(chosenType)) {
                    this.applyRadiusWithHeightCheck(tile, board, x, y, "setDetectionratio");
                }
                
                tile.setUnhideable(false);
                remaining--;
            }
        }
    
        if (remaining > 0) {
            console.warn(`Only ${totalHazards - remaining} of ${totalHazards} can be placed`);
        }
    
        return board;
    }
    
    trackHazardCount(board) {
        const boardSize = board.length;
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, 1], [-1, -1], [1, 1], [1, -1]
        ];
    
        // First pass: hazardcount (ignores height)
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];
                if (tile.getHazardtype() !== "none") {
                    for (const [dx, dy] of directions) {
                        const x = i + dx;
                        const y = j + dy;
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                            board[x][y].incrementHazardcount();
                        }
                    }
                }
            }
        }
    
        // Second pass: radius effects (respects height)
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];
                const hazardType = tile.getHazardtype();
                const sourceHeight = tile.getTileheight();
            
                if (hazardType === "radioactive") {
                    for (const [dx, dy] of directions) {
                        const x = i + dx;
                        const y = j + dy;
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                            const targetTile = board[x][y];
                            if (targetTile.getTileheight() <= sourceHeight) {
                                targetTile.setDamageratio(true);
                            }
                        }
                    }
                }
            
                if (hazardType === "spidermine") {
                    for (const [dx, dy] of directions) {
                        const x = i + dx;
                        const y = j + dy;
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                            const targetTile = board[x][y];
                            if (targetTile.getTileheight() <= sourceHeight) {
                                targetTile.setDetectionratio(true);
                            }
                        }
                    }
                }
            }
        }
        return board;
    }

    generateTreasures(board, size) {
        let probability = 0;
        let maxTreasures = 0;
        
        // ===== GREED & FORTUNE: Stacking effects =====
        const savedKeychains = JSON.parse(localStorage.getItem("legacyKeychains") || "[]");
        const hasGreed = savedKeychains.includes('greed');
        const hasFortune = savedKeychains.includes('fortune');
        
        // Base values by size
        let baseProbability = 0;
        let baseMaxTreasures = 0;
        
        if (size <= 8) {
            baseProbability = 0.35;
            baseMaxTreasures = 1;
        } else if (size <= 12) {
            baseProbability = 0.45;
            baseMaxTreasures = 1;
        } else if (size <= 16) {
            baseProbability = 0.55;
            baseMaxTreasures = 2;
        } else if (size <= 20) {
            baseProbability = 0.70;
            baseMaxTreasures = 3;
        } else {
            baseProbability = 0.80;
            baseMaxTreasures = 3;
        }
        
        // Apply Greed (+10% probability, +1 max treasure)
        if (hasGreed) {
            probability = baseProbability + 0.10;
            maxTreasures = baseMaxTreasures + 1;
        } else {
            probability = baseProbability;
            maxTreasures = baseMaxTreasures;
        }
        
        // Apply Fortune (+10% probability, +1 max treasure, stacks with Greed)
        if (hasFortune) {
            probability += 0.10;
        }
        
        // Cap probability at 95%
        probability = Math.min(probability, 0.95);
        
        console.log(`[Treasure] Greed: ${hasGreed}, Fortune: ${hasFortune}, Probability: ${Math.round(probability * 100)}%, Max: ${maxTreasures}`);
        
        const random = this.random();
        if (random > probability) {
            console.log(`[Treasure] No treasures generated (${Math.round(probability * 100)}% chance)`);
            return board;
        }
        
        let count = 1;
        if (maxTreasures > 1 && this.random() < 0.5) {
            count = Math.min(maxTreasures, Math.floor(this.random() * maxTreasures) + 1);
        }
        
        console.log(`[Treasure] Generating ${count} treasure(s) on ${size}x${size} board`);
        
        const availableTiles = [];
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                const tile = board[i][j];
                if (!tile.isStart() && 
                    tile.getPalType() === "none" &&
                    tile.getHazardtype() === "none" &&
                    tile.getObstacletype() === "none" &&
                    !tile.haveTreasure()) {
                    availableTiles.push({ x: i, y: j });
                }
            }
        }
        
        const selected = [];
        for (let i = 0; i < count && availableTiles.length > 0; i++) {
            const index = Math.floor(this.random() * availableTiles.length);
            const pos = availableTiles.splice(index, 1)[0];
            selected.push(pos);
        }
        
        for (const pos of selected) {
            board[pos.x][pos.y].setTreasure(true);
            console.log(`[Treasure] Placed at (${pos.x}, ${pos.y})`);
        }
        
        return board;
    }
}
