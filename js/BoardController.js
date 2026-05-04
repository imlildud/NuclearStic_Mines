import { TileModel } from "./TileModel.js";

export class BoardController {
    constructor(player) {
        this.player = player;
        this.gameManager = null;
    }

    // Set the size of the board
    loadDifficulty(level) {
        const startSize = 8;
        const step = 4;
        const boardSize = startSize + Math.floor(step * (level / 5));
        return boardSize;
    }

    // Set the total number of hazards to be placed
    loadNumberOfHazard(level) {
        const startHazards = 7;
        const step = 7;
        const hazard = startHazards + Math.floor(step * (level / 5));
        return hazard;
    }

    // Set the total number of hazards based on board size (for Custom/Daily modes)
    loadNumberOfHazardBySize(size) {
        const baseSize = 8;
        const baseHazards = 7;
        const step = 4;
        const hazardStep = 7;
    
        const increment = Math.floor((size - baseSize) / step) * hazardStep;
        return baseHazards + increment;
    }

    // Set the number of goals to rescue
    loadNumberOfGoals(level) {
        const startGoals = 1;
        const step = 1;
        const goals = startGoals + Math.floor(step * (level / 5));
        return goals;
    }

    // Set the zone randomly
    loadTypeOfZone(level) {
        const zoneMap = {
        1: "desert",
        2: "snow",
        3: "ash"
    };
    
        const randomZone = Math.floor(Math.random() * 3) + 1;
    
        return zoneMap[randomZone];
    }

    // Generates the board and the size
    generateBoard(boardSize) {
        const board = Array.from({ length: boardSize }, () =>
            Array.from({ length: boardSize }, () => new TileModel())
        );
        return board;
    }

    // Generate the start and goal tiles
    generateStartAndGoal(board, numGoals, level) {
        const boardSize = board.length;
        const probability = Math.floor(Math.random() * 4);
        const edgemin = 0;
        const edgemax = boardSize - 1;
        const randomPos = Math.floor(Math.random() * boardSize);

        // Goal types
        const goalTypes = [
            { type: "charlie", minLevel: 0 },
            { type: "joni", minLevel: 5 },
            { type: "ru", minLevel: 9999 },
            { type: "evy", minLevel: 9999 },
            { type: "zac", minLevel: 9999 }
        ];

        const validGoals = goalTypes.filter(g => level >= g.minLevel);

        // Set start tile
        switch (probability) {
            case 0: board[edgemin][randomPos].setStart(true); break;
            case 1: board[randomPos][edgemin].setStart(true); break;
            case 2: board[edgemax][randomPos].setStart(true); break;
            case 3: board[randomPos][edgemax].setStart(true); break;
        }

        if(validGoals.length === 0){
            console.warn("No valid goals");
            return board;
        }

        // Place goals
        let remainingGoals = numGoals;
        let attempts = 0;
        let maxattempts = 5000;
    
        while (remainingGoals > 0 && attempts < maxattempts) {
            attempts ++
            let goalX = Math.floor(Math.random() * boardSize);
            let goalY = Math.floor(Math.random() * boardSize);

            // Adjust based on start quadrant
            switch (probability) {
                case 0: if (goalX <= boardSize / 2) goalX = Math.floor(boardSize / 2 + Math.random() * (boardSize / 2)); break;
                case 1: if (goalY <= boardSize / 2) goalY = Math.floor(boardSize / 2 + Math.random() * (boardSize / 2)); break;
                case 2: if (goalX >= boardSize / 2) goalX = Math.floor(Math.random() * (boardSize / 2)); break;
                case 3: if (goalY >= boardSize / 2) goalY = Math.floor(Math.random() * (boardSize / 2)); break;
            }

            const tile = board[goalX][goalY];
            
            if (tile.getGoaltype() === "none" && !tile.isStart()) {
                const goalIndex = Math.floor(Math.random() * validGoals.length);
                tile.setGoaltype(validGoals[goalIndex].type);
                
                if ((validGoals[goalIndex].type) === "joni"){
                    tile.setSecurehidden(true);
                }else{
                    tile.setSecure(true);
                }
                
                console.log(`Children tile generated at [${goalX},${goalY}]: ${validGoals[goalIndex].type}`);
                remainingGoals--;
            }

            if(attempts >= maxattempts){
                console.warn("Goal generation stopped by safety");
            }
        }

        return board;
    }

    // Creates safe zones around Start and Goal
    setSafeTiles(board) {
        const boardSize = board.length;
        const directions = [
            [-1, 0],[1, 0],[0, -1],[0, 1],
            [-1, 1],[-1, -1],[1, 1],[1, -1]
        ];

        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                board[i][j].setHide(false);
                
                if (board[i][j].getGoaltype() === "joni") {
                    for (const [dx, dy] of directions) {
                        const x = i + dx, y = j + dy;
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                            board[x][y].setSecurehidden(true);
                        }
                    }
                } else if (board[i][j].isStart() || board[i][j].getGoaltype() !== "none") {
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
    
    // Helper random int
    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generateHeights(board, level, size) {
        const boardSize = size;

        if (level >= 3) {
            const totalHeights = this.randInt(5,Math.floor((boardSize - 1) / 2) + level);

            const heightTypes = [
                { type: 1, weight: 0.45, minLevel: 3 },
                { type: 2, weight: 0.35, minLevel: 5 },
                { type: 3, weight: 0.15, minLevel: 10 },
                { type: 4, weight: 0.05, minLevel: 15 }
            ];

            const validHeights = heightTypes.filter(ht => level >= ht.minLevel);

            const totalWeight = validHeights.reduce((s, ht) => s + ht.weight, 0);
            validHeights.forEach(ht => ht.weight /= totalWeight);

            let remaining = totalHeights;

            while (remaining > 0) {
                const roll = Math.random();
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

                if (
                    !tile.isStart() &&
                    tile.getGoaltype() === "none" &&
                    !tile.isSecure() &&
                    !tile.isMarked() &&
                    tile.getHazardtype() === "none" &&
                    tile.getObstacletype() === "none"
                ) {
                    tile.setTileheight(chosenType);
                    remaining--;
                }
            }
        }

        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];

                if (tile.getTileheight() > 1) {
                    const heightFounded = tile.getTileheight();
                    const caseNum = this.randInt(0, 3);
                    let directions = [];

                    switch (caseNum) {
                        case 0:
                            directions = [
                                [-1, 0],[1, 0],[0, -1],[0, 1],
                                [-1, 1],[-1, -1],[1, 1],[1, -1]
                            ];
                            break;
                        case 1:
                            directions = [
                                [-1, 0],[0, -1],[0, 1],
                                [-1, 1],[-1, -1]
                            ];
                            break;
                        case 2:
                            directions = [
                                [1, 0],[0, -1],[0, 1],
                                [1, 1],[1, -1]
                            ];  
                            break;
                        case 3:
                            directions = [
                                [-1, 0],[1, 0],
                                [-1, 1],[-1, -1]
                            ];
                            break;
                    }

                    for (const [dx, dy] of directions) {
                        const x = i + dx;
                        const y = j + dy;

                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                            board[x][y].setTileheight(heightFounded - 1);
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

            // Obstacle types with weight and minimum level
            const obstacleTypes = [
                { type: "natural", weight: 0.45, minLevel: 3 },
                { type: "pit", weight: 0.35, minLevel: 5 },
                { type: "river", weight: 0.15, minLevel: 10 }
            ];

            // Filter by level
            const validObstacles = obstacleTypes.filter(ot => level >= ot.minLevel);

            // Normalize weights
            const totalWeight = validObstacles.reduce((sum, ot) => sum + ot.weight, 0);
            validObstacles.forEach(ot => ot.weight /= totalWeight);

            // Place obstacles randomly
            let remaining = totalObstacles;
            while (remaining > 0) {
                const roll = Math.random();
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

                if (!tile.isStart() && tile.getGoaltype() === "none" && !tile.isSecure() && !tile.isSecurehidden() && !tile.isMarked() && tile.getHazardtype() === "none" && tile.getObstacletype() === "none") {
                    tile.setObstacletype(chosenType);
                    remaining--;
                }
            }
        }
        return board;
    }

    generateHazards(board, totalHazards, level, size) {
        const boardSize = size;

        // Hazard types with weight and minimum level
        const hazardTypes = [
            { type: "mine", weight: 0.3, minLevel: 0 },
            { type: "cactus", weight: 0.3, minLevel: 0 },
            { type: "radioactive", weight: 0.2, minLevel: 5 },
            { type: "deadbush", weight: 0.3, minLevel: 9999 }, //8
            { type: "spiderMine", weight: 0.15, minLevel: 9999 }, // 12
            { type: "bandit", weight: 0.05, minLevel: 9999 }, // 15
            { type: "liberal", weight: 0.1, minLevel: 9999 }, // 15
            { type: "sandsnake", weight: 0.03, minLevel: 9999 }, // 20
            { type: "dunecrawler", weight: 0.01, minLevel: 9999 } // 30
        ];

        // Filter by level
        const validHazards = hazardTypes.filter(ht => level >= ht.minLevel);

        // Normalize weights
        const totalWeight = validHazards.reduce((sum, ht) => sum + ht.weight, 0);
        validHazards.forEach(ht => ht.weight /= totalWeight);

        let remaining = totalHazards;
        let attempts = 0;
        const maxAttempts = 5000;

        while (remaining > 0 && attempts < maxAttempts) {
            const roll = Math.random();
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

            if (!tile.isStart() && tile.getGoaltype() === "none" && !tile.isSecure() && !tile.isSecurehidden() && !tile.isMarked() && tile.getHazardtype() === "none" && tile.getObstacletype() === "none") {
                tile.setHazardtype(chosenType);
                tile.setHazardlive(false);

                // Live hazards
                if (["deadbush", "bandit", "liberal", "dunecrawler"]) {
                    tile.setHazardlive(true);
                }

                // Damage radius
                if (chosenType === "radioactive") {
                    this.applyRadius(tile, board, x, y, "setDamageratio");
                }

                // Detection radius
                if (["spiderMine", "liberal", "sandsnake"]) {
                    this.applyRadius(tile, board, x, y, "setDetectionratio");
                }

                remaining--;
            }
        }

        if (remaining > 0) {
            console.warn(`Only ${totalHazards - remaining} of ${totalHazards} can be placed`);
        }

        return board;
    }

    // Helper function to apply damage/detection radius around a tile
    applyRadius(tile, board, x, y, method) {
        const boardSize = board.length;
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, 1], [-1, -1], [1, 1], [1, -1]
        ];
        
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
                board[nx][ny][method](true);
            }
        }
    }

    trackHazardCount(board) {
        const boardSize = board.length;
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, 1], [-1, -1], [1, 1], [1, -1]
        ];

        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];

                // Increment hazard counts around standard hazards
                if (tile.getHazardtype() !== "none" || (tile.getHazardtype() !== "none" && !tile.isHazardlive())) {
                    for (const [dx, dy] of directions) {
                        const x = i + dx;
                        const y = j + dy;
                        
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                            board[x][y].incrementHazardcount();
                        }
                    }
                }

                // Apply damage radius for radioactive
                if (tile.getHazardtype() === "radioactive") {
                    for (const [dx, dy] of directions) {
                        const x = i + dx;
                        const y = j + dy;
                    
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                            board[x][y].setDamageratio(true);
                        }
                    }
                }

                // Apply detection radius for spiderMine, bandit, sandsnake
                if (["spiderMine", "bandit", "sandsnake"].includes(tile.getHazardtype())) {
                    for (const [dx, dy] of directions) {
                        const x = i + dx;
                        const y = j + dy;
                        
                        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                            board[x][y].setDetectionratio(true);
                        }
                    }
                }
            }
        }
        return board;
    }

    updateVision(board, character) {
        const boardSize = board.length;
        const visionX = character.getPosX();
        const visionY = character.getPosY();
        const visionRange = character.getVision();

        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];

                if (tile.getGoaltype() === "joni"){
                    tile.setHide(true);
                } else if (
                    !tile.isStart() &&
                    tile.getGoaltype() === "none" &&
                    !tile.isSecure()
                ){
                    tile.setHide(true);
                }
            }
        }

        board[visionX][visionY].setHide(false);

        const minX = Math.max(0, visionX - visionRange);
        const maxX = Math.min(boardSize - 1, visionX + visionRange);
        const minY = Math.max(0, visionY - visionRange);
        const maxY = Math.min(boardSize - 1, visionY + visionRange);

        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];

        const visible = Array.from({ length: boardSize }, () =>
        Array(boardSize).fill(false)
        );

        visible[visionX][visionY] = true;

        for (const [dx, dy] of directions) {
            if (board[visionX][visionY].getHazardcount() > 0) break;

            let x = visionX;
            let y = visionY;

            while (true) {
                x += dx;
                y += dy;

                if (x < minX || x > maxX || y < minY || y > maxY) break;

                const tile = board[x][y];

                if (tile.getHazardtype() !== "none") break;

                tile.setHide(false);
                visible[x][y] = true;

                if (tile.getHazardcount() > 0) break;
            }
        }

        const diagonals = [
            [-1, -1], [-1, 1],
            [1, -1], [1, 1]
        ];

        for (const [dx, dy] of diagonals) {
            const dx1 = visionX + dx;
            const dy1 = visionY + dy;

            if (dx1 < minX || dx1 > maxX || dy1 < minY || dy1 > maxY) continue;

            const cx1 = visionX + dx;
            const cy1 = visionY;
            const cx2 = visionX;
            const cy2 = visionY + dy;

            let canSee = true;

            // Cardinal 1
            if (cx1 >= minX && cx1 <= maxX && cy1 >= minY && cy1 <= maxY) {
                const tile1 = board[cx1][cy1];

                if (!visible[cx1][cy1] || tile1.getHazardcount() > 0)
                    canSee = false;

                if (tile1.getHazardtype() !== "none")
                    canSee = false;

                if (tile1.getObstacletype() !== "none")
                    canSee = false;

                if (tile1.getTileheight() >
                    board[visionX][visionY].getTileheight())
                    canSee = false;
            }

            // Cardinal 2
            if (cx2 >= minX && cx2 <= maxX && cy2 >= minY && cy2 <= maxY) {
                const tile2 = board[cx2][cy2];

                if (!visible[cx2][cy2] || tile2.getHazardcount() > 0)
                    canSee = false;

                if (tile2.getHazardtype() !== "none")
                    canSee = false;

                if (tile2.getObstacletype() !== "none")
                    canSee = false;

                if (tile2.getTileheight() >
                    board[visionX][visionY].getTileheight())
                    canSee = false;
            }

            if (canSee) {
                board[dx1][dy1].setHide(false);
            }
        }
    }

    regenerateHazards(board, totalHazards, level, size) {
        const boardSize = size;
        this.resetHazardCount(board, boardSize);
        let remainingHazards = 0;
        let markedHazards = 0;
        let failedFlags = 0;
        let failedJumpFlags = 0;

        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];

                if (tile.getHazardtype() !== "none") {
                    if (tile.isFlagged()) {
                        tile.setMarked(true);
                        tile.setFlagged(false);
                        this.player.incrementPoints(200);
                        markedHazards++;
                        continue;
                    }
                
                    if (tile.isMarked()) {
                        this.player.incrementPoints(200);
                        markedHazards++;
                        continue;
                    }
                
                    tile.setHazardtype("none");
                    remainingHazards++;
                }

                if  (tile.isFlagged() && tile.getHazardtype() === "none") {
                    tile.setFlagged(false);
                    this.player.decrementPoints(200);
                    failedFlags++;
                }

                if (tile.isJumpflagged() && tile.getHazardtype() === "none") {
                    failedJumpFlags++;
                    this.player.decrementPoints(50);
                }
            }
        }
        
        this.player.setFailedFlags(failedFlags);
        this.player.setFailedJumpFlags(failedJumpFlags);
        return this.generateHazards(board, remainingHazards, level, size);
    }

    resetHazardCount(board) {
        const boardSize = board.length;
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];
                tile.setHazardcount(0);
                tile.setDamageratio(false);
                tile.setDetectionratio(false);
                if (tile.isHazardlive()) tile.setHazardlive(false);
            }
        }
    return board;
    }

    updateVisionAroundPlayer(board, character) {
        const boardSize = board.length;
        const visionX = character.getPosX();
        const visionY = character.getPosY();
        const visionRange = character.getVision();

        const minX = Math.max(0, visionX - visionRange);
        const maxX = Math.min(boardSize - 1, visionX + visionRange);
        const minY = Math.max(0, visionY - visionRange);
        const maxY = Math.min(boardSize - 1, visionY + visionRange);

    for (let i = minX; i <= maxX; i++) {
        for (let j = minY; j <= maxY; j++) {
            const tile = board[i][j];
            if (!tile.isStart() && tile.getGoaltype() === "none" && !tile.isSecure()) {
                tile.setHide(true);
            }
        }
    }

    const playerTile = board[visionX][visionY];
    const playerHeight = playerTile.getTileheight();
    const playerHazardCount = playerTile.getHazardcount();
    
    if (playerHazardCount > 0) {
        playerTile.setHide(false);
        return;
    }

    playerTile.setHide(false);

    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dx, dy] of directions) {
        let x = visionX;
        let y = visionY;
        
        while (true) {
            x += dx;
            y += dy;
            
            if (x < minX || x > maxX || y < minY || y > maxY) break;
            
            const tile = board[x][y];
            
            if (tile.getHazardtype() !== "none") break;
            
            tile.setHide(false);
            
            if (tile.getHazardcount() > 0) break;
        }
    }
    
    if (visionRange >= 2) {
        const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        
        for (const [dx, dy] of diagonals) {
            const diagX = visionX + dx;
            const diagY = visionY + dy;
            
            if (diagX < minX || diagX > maxX || diagY < minY || diagY > maxY) continue;
            
            const card1X = visionX + dx;
            const card1Y = visionY;
            const card2X = visionX;
            const card2Y = visionY + dy;
            
            let canSee = true;
            
            if (card1X >= minX && card1X <= maxX && card1Y >= minY && card1Y <= maxY) {
                const tile1 = board[card1X][card1Y];
                if (tile1.isHide() || 
                    tile1.getHazardcount() > 0 ||
                    tile1.getHazardtype() !== "none" ||
                    tile1.getObstacletype() !== "none" ||
                    tile1.getTileheight() > playerHeight) {
                    canSee = false;
                }
            } else {
                canSee = false;
            }
            
            if (canSee && card2X >= minX && card2X <= maxX && card2Y >= minY && card2Y <= maxY) {
                const tile2 = board[card2X][card2Y];
                if (tile2.isHide() || 
                    tile2.getHazardcount() > 0 ||
                    tile2.getHazardtype() !== "none" ||
                    tile2.getObstacletype() !== "none" ||
                    tile2.getTileheight() > playerHeight) {
                    canSee = false;
                }
            } else if (canSee) {
                canSee = false;
            }
            
            if (canSee) {
                board[diagX][diagY].setHide(false);
            }
        }
    }
}

    setGameManager(gm) {
        this.gameManager = gm;
    }
}