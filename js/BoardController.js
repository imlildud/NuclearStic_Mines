import { TileModel } from "./TileModel.js";
import { CharacterModel } from "./CharacterModel.js";

export class BoardController {
    constructor(player) {
        this.player = player; // CharacterModel
    }

    // Set the size of the board
    loadDifficulty(level) {
        const startSize = 8;
        const step = 4;
        const boardSize = startSize + Math.floor(step * (level / 5));
        console.log(`Level: ${level}, Board size: ${boardSize}`);
        return boardSize;
    }

    // Set the total number of hazards to be placed
    loadNumberOfHazard(level) {
        const startHazards = 7;
        const step = 7;
        const hazard = startHazards + Math.floor(step * (level / 5));
        console.log(`Total number of hazards: ${hazard}`);
        return hazard;
    }

    // Set the number of goals to rescue
    loadNumberOfGoals(level) {
        const startGoals = 1;
        const step = 1;
        const goals = startGoals + Math.floor(step * (level / 5));
        console.log(`Total number of kids: ${goals}`);
        return goals;
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
            { type: "ru", minLevel: 10 },
            { type: "evy", minLevel: 20 },
            { type: "zac", minLevel: 30 }
        ];

        const validGoals = goalTypes.filter(g => level >= g.minLevel);

        // Set start tile
        switch (probability) {
            case 0: board[edgemin][randomPos].setStart(true); break;
            case 1: board[randomPos][edgemin].setStart(true); break;
            case 2: board[edgemax][randomPos].setStart(true); break;
            case 3: board[randomPos][edgemax].setStart(true); break;
        }

        // Place goals
        let remainingGoals = numGoals;
        while (remainingGoals > 0) {
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
            
            if (tile.getGoalType() === "none" && !tile.isStart()) {
                const goalIndex = Math.floor(Math.random() * validGoals.length);
                tile.setGoalType(validGoals[goalIndex].type);
                console.log(`Children tile generated at [${goalX},${goalY}]: ${validGoals[goalIndex].type}`);
                remainingGoals--;
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
                
                if (board[i][j].isStart() || board[i][j].getGoaltype() !== "none") {
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

    generateHeights(board, level) {
        const boardSize = board.length;
        
        if (level >= 3) {
            const totalHeights = this.randInt(5, Math.floor((boardSize - 1) / 2) + level);

            // Height types with weight and min level
            const heightTypes = [
                { type: 1, weight: 0.45, minLevel: 3 },
                { type: 2, weight: 0.35, minLevel: 5 },
                { type: 3, weight: 0.15, minLevel: 10 },
                { type: 4, weight: 0.05, minLevel: 15 }
            ];

            // Filter by level
            const validHeights = heightTypes.filter(ht => level >= ht.minLevel);

            // Normalize weights
            const totalWeight = validHeights.reduce((sum, ht) => sum + ht.weight, 0);
            validHeights.forEach(ht => ht.weight /= totalWeight);

            // Place heights randomly
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
            
                if (!tile.isStart() && tile.getGoaltype() === "none" && !tile.isSecure() && !tile.isMarked() && tile.getHazardtype() === "none" && tile.getObstacletype() === "none") {
                    tile.setTileheight(chosenType);
                    remaining--;
                }
            }
        }

        // Spread heights around
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];
                
                if (tile.getTileheight() > 1) {
                    const heightFounded = tile.getTileheight();
                    const caseNum = this.randInt(0, 3);
                    let directions;

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
                        default: directions = [];
                    }
                }
            }
        }
    }

    generateObstacles(board, level) {
        const boardSize = board.length;
        
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

                if (!tile.isStart() && tile.getGoaltype() === "none" && !tile.isSecure() && !tile.isMarked() && tile.getHazardtype() === "none" && tile.getObstacletype() === "none") {
                    tile.setObstacletype(chosenType);
                    remaining--;
                }
            }
        }
        return board;
    }

    generateHazards(board, totalHazards, level) {
        const boardSize = board.length;

        // Hazard types with weight and minimum level
        const hazardTypes = [
            { type: "mine", weight: 0.3, minLevel: 0 },
            { type: "cactus", weight: 0.3, minLevel: 0 },
            { type: "deadbush", weight: 0.3, minLevel: 3 },
            { type: "radioactive", weight: 0.2, minLevel: 5 },
            { type: "spiderMine", weight: 0.15, minLevel: 10 },
            { type: "bandit", weight: 0.05, minLevel: 15 },
            { type: "liberal", weight: 0.1, minLevel: 18 },
            { type: "sandsnake", weight: 0.03, minLevel: 20 },
            { type: "dunecrawler", weight: 0.01, minLevel: 30 }
        ];

        // Filter by level
        const validHazards = hazardTypes.filter(ht => level >= ht.minLevel);

        // Normalize weights
        const totalWeight = validHazards.reduce((sum, ht) => sum + ht.weight, 0);
        validHazards.forEach(ht => ht.weight /= totalWeight);

        let remaining = totalHazards;
        while (remaining > 0) {
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

            if (!tile.isStart() && tile.getGoaltype() === "none" && !tile.isSecure() && !tile.isMarked() && tile.getHazardtype() === "none" && tile.getObstacletype() === "none") {
                tile.setHazardtype(chosenType);

                // Live hazards
                if (["deadbush", "bandit", "liberal", "dunecrawler"].includes(chosenType)) {
                    tile.setHazardlive(true);
                }

                // Damage radius
                if (chosenType === "radioactive") {
                    this.applyRadius(tile, board, x, y, "setDamageratio");
                }

                // Detection radius
                if (["spiderMine", "bandit", "sandsnake"].includes(chosentype)) {
                    this.applyRadius(tile, board, x, y, "setDetectionratio");
                }

                remaining--;
            }
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
                if (tile.getHazardtype() !== "none" && !tile.isHazardlive()) {
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
        const visionX = character.getPosx();
        const visionY = character.getPosy();
        const visionRange = character.getVision();

        // Step 1: Hide all non-start/non-goal/non-secure/non-obstacle/non-live hazard tiles
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];
                
                if (!tile.isStart() && tile.getGoaltype() === "none" && !tile.isSecure() &&
                    tile.getObstacletype() === "none" && !tile.isHazardlive()) {
                    tile.setHide(true);
                }
            }
        }

        // Step 2: Show tile the player is standing on
        board[visionX][visionY].setHide(false);

        // Step 3: Compute vision boundaries
        const minX = Math.max(0, visionX - visionRange);
        const maxX = Math.min(boardSize - 1, visionX + visionRange);
        const minY = Math.max(0, visionY - visionRange);
        const maxY = Math.min(boardSize - 1, visionY + visionRange);

        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]  // cardinal directions
        ];

        // Track visible tiles for diagonal checking
        const visible = Array.from({ length: boardSize }, () => Array(boardSize).fill(false));
        visible[visionX][visionY] = true;

        // Step 4: Reveal tiles in cardinal directions
        for (const [dx, dy] of directions) {
            let x = visionX;
            let y = visionY;

            while (true) {
                x += dx;
                y += dy;
                
                if (x < minX || x > maxX || y < minY || y > maxY) break;

                // Stop expansion if current tile has hazard count or is a hazard
                if (board[x][y].getHazardcount() > 0) break;
                if (board[x][y].getHazardtype() !== "none" && !board[x][y].isHazardlive()) break;

                board[x][y].setHide(false);
                visible[x][y] = true;

                if (board[x][y].getHazardcount() > 0) break;
            }
        }

        // Step 5: Diagonals
        const diagonals = [
            [-1, -1], [-1, 1],
            [1, -1], [1, 1]
        ];

        for (const [dx, dy] of diagonals) {
            const dx1 = visionX + dx;
            const dy1 = visionY + dy;
            
            if (dx1 < minX || dx1 > maxX || dy1 < minY || dy1 > maxY) continue;

            const cx1 = visionX + dx;
            const cy1 = visionY; // vertical
            const cx2 = visionX;
            const cy2 = visionY + dy; // horizontal

            let canSee = true;

            // Cardinal 1
            if (cx1 >= minX && cx1 <= maxX && cy1 >= minY && cy1 <= maxY) {
                if (!visible[cx1][cy1] || board[cx1][cy1].getHazardcount() > 0) canSee = false;
                if (board[cx1][cy1].getHazardtype() !== "none") canSee = false;
                if (board[cx1][cy1].getObstacletype() !== "none") canSee = true;
                if (board[cx1][cy1].getTileheight() > board[visionX][visionY].getTileheight()) canSee = false;
            }

            // Cardinal 2
            if (cx2 >= minX && cx2 <= maxX && cy2 >= minY && cy2 <= maxY) {
                if (!visible[cx2][cy2] || board[cx2][cy2].getHazardcount() > 0) canSee = false;
                if (board[cx2][cy2].getHazardtype() !== "none") canSee = false;
                if (board[cx1][cy1].getHazardtype() !== "none") canSee = false;
                if (board[cx1][cy1].getObstacletype() !== "none") canSee = true;
                if (board[cx1][cy1].getTileheight() > board[visionX][visionY].getTileheight()) canSee = false;
            }

            if (canSee) board[dx1][dy1].setHide(false);
        }
    }

    regenerateHazards(board, boardSize, level) {
        this.resetHazardCount(board, boardSize);
        let remainingHazards = 0;

        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const tile = board[i][j];

                if (tile.getHazardType() !== "none") {
                    if (tile.isFlagged()) {
                        tile.setMarked(true);           // correctly marked
                        this.player.incrementPoints(200);
                    } else {
                        tile.setHazardType("none");    // remove unmarked hazard
                        remainingHazards++;            // to replace later
                    }
                }

                if (tile.isFlagged() && tile.getHazardType() === "none") {
                    tile.setFlagged(false);
                    this.player.decrementPoints(200);
                }
            }
        }

        // Generate the missing hazards
        return this.generateHazards(board, remainingHazards, level);
    }

    resetHazardCount(board, boardSize) {
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
}