import { CharacterFactory } from "./CharacterFactory.js";
import { BoardController } from "./BoardController.js";
import { CharacterController } from "./CharacterController.js";

export class GameManager {
    constructor(config) {
        this.config = config;
        this.currentLevel = 1;
        this.gameInputLocked = false;
        this.player = null;
        this.boardCtrl = null;
        this.charCtrl = null;
        this.board = null;
        this.lastVisionUpdate = 0;
        this.VISION_UPDATE_DELAY = 50;
        this.lastMoveTime = 0;
        this.MOVE_DELAY = 200;
        this.renderer = null;
        this.lastResult = null;
    }

    setRenderer(renderer) {
        this.renderer = renderer;
    }


    startGame() {
        this.gameInputLocked = false;

        this.currentLevel = this.config.level || 1;
        this.player = CharacterFactory.createCharacter(this.config.character);
        this.boardCtrl = new BoardController(this.player);
        this.charCtrl = new CharacterController(this.player, this.boardCtrl);
    
        this.configLevel(this.currentLevel);
    
        this.boardCtrl.updateVision(this.board, this.player);
        this.boardCtrl.setGameManager(this);
    }

    configLevel() {
        let size;
        let goals;
        let hazardAmount;
        let hazardIntensity;
        let heightIntensity;
        let obstacleIntensity;
        let zone;
        let childLevel;

        if(this.config.mode === "legacy"){
            size = this.boardCtrl.loadDifficulty(this.currentLevel);
            hazardAmount = this.boardCtrl.loadNumberOfHazard(this.currentLevel);
            goals = this.boardCtrl.loadNumberOfGoals(this.currentLevel);
            heightIntensity = this.currentLevel;
            obstacleIntensity = this.currentLevel;
            zone = this.boardCtrl.loadTypeOfZone(this.currentLevel);
            childLevel = this.currentLevel; 
        }else{
            size = this.config.size;
            goals = this.config.goals;
            hazardAmount = this.boardCtrl.loadNumberOfHazardBySize(size);
            hazardIntensity = this.config.hazards;
            heightIntensity = this.config.obstacles;
            obstacleIntensity = this.config.obstacles;
            zone = this.config.zone;
            childLevel = 10;
        }

        this.board = this.boardCtrl.generateBoard(size);

        this.board = this.boardCtrl.generateStartAndGoal(
            this.board,
            goals,
            childLevel
        );

        this.board = this.boardCtrl.setSafeTiles(
            this.board,
            size
        );

        this.board = this.boardCtrl.generateHeights(
            this.board,
            heightIntensity,
            size
        );

        this.board = this.boardCtrl.generateObstacles(
            this.board,
            obstacleIntensity,
            size
        );
        
        this.board = this.boardCtrl.generateHazards(
            this.board,
            hazardAmount,
            hazardIntensity,
            size
        );

        this.board = this.boardCtrl.trackHazardCount(
            this.board,
            size
        );
        
        this.charCtrl.setCharacterGoals(goals);
        this.charCtrl.getStartCoords(this.board);
        this.boardCtrl.updateVision(this.board, this.player);

        // ========== DEBUG: ==========
        console.log("========== GAME CONFIGURATION ==========");
        console.log(`Mode: ${this.config.mode}`);
        console.log(`Size: ${size}`);
        console.log(`Goals: ${goals}`);
        console.log(`Hazard Amount: ${hazardAmount}`);
        console.log(`Hazard Intensity: ${hazardIntensity}`);
        console.log(`Height Intensity: ${heightIntensity}`);
        console.log(`Obstacle Intensity: ${obstacleIntensity}`);
        console.log(`Zone: ${zone}`);
        console.log(`Child Level: ${childLevel}`);
        console.log(`Character: ${this.config.character}`);
        console.log("========================================");
    }

    handleInput(direction) {
        if (this.gameInputLocked) return;
        
        const now = Date.now();
        if (now - this.lastMoveTime < this.MOVE_DELAY) return;
        this.lastMoveTime = now;
    
        this.charCtrl.moveCharacter(direction, this.board);
        this.charCtrl.verifyTile(this.board);
    
        this.boardCtrl.updateVisionAroundPlayer(this.board, this.player);

        // Regen Hazards
        if (this.player.isRegen() === true){
            console.log("Goals:" + this.player.getRescued())
            let hazardAmount;
            let hazardIntensity;
            let size;

            if(this.config.mode === "legacy"){
                size = this.boardCtrl.loadDifficulty(this.currentLevel);
                hazardAmount = this.boardCtrl.loadNumberOfHazard(this.currentLevel);
                hazardIntensity = this.currentLevel;
            }else{
                size = this.config.size;
                hazardAmount = this.boardCtrl.loadNumberOfHazard(size);
                hazardIntensity = this.config.hazards;
            }
            this.boardCtrl.regenerateHazards(this.board,
                hazardAmount,
                hazardIntensity,
                size
            );
            this.boardCtrl.trackHazardCount(this.board);
            this.boardCtrl.updateVision(this.board, this.player);
            this.player.setRegen(false);
        }

        // Victory
        if (this.charCtrl.winCondition(this.board)){
            this.handleVictory();
            return;
        }

        // Lose
        if (!this.player.isAlive()) {
            this.gameInputLocked = true;
            this.handleGameOver();
            return;
        }
    }

        // ==================== GAME OVERS ====================
    handleVictory() {
        this.gameInputLocked = true;
        this.showScoreboard(true);
        this.lastResult = "victory";
    }

    handleGameOver() {
        this.gameInputLocked = true;
        this.showScoreboard(false);
        this.lastResult = "gameover";
    }

    handleLegacyVictory() {
        console.log(`Legacy: Next level ${this.currentLevel + 1}`);
        
        this.currentLevel++;
        localStorage.setItem("legacy_level", this.currentLevel);
        
        const currentPoints = this.player.getPoints();
        const currentType = this.player.getType();
        
        this.player = CharacterFactory.createCharacter(currentType);
        this.player.setPoints(currentPoints);
        
        this.boardCtrl = new BoardController(this.player);
        this.charCtrl = new CharacterController(this.player, this.boardCtrl);
        
        this.configLevel(this.currentLevel);
        
        this.gameInputLocked = false;
        this.gameOver = false;
        
        console.log(`Level ${this.currentLevel} started`);
    }

    handleLegacyLose() {
        console.log(`Game over: Record ${this.currentLevel}`);
        localStorage.removeItem("legacy_level"); // Borrar progreso
        this.currentLevel = 1;
    }

    handleDailyVictory(score) {
        console.log(`Daily complete! Score: ${score}`);
    
        const today = new Date().toDateString();
        localStorage.setItem(`daily_completed_${today}`, "true");
        localStorage.setItem(`daily_score_${today}`, score);
    
        console.log(`Daily locked`);
    }

    handleDailyLose(score) {
        console.log(`Daily failed! Score: ${score}`);
    
        const today = new Date().toDateString();
        localStorage.setItem(`daily_completed_${today}`, "failed");
        localStorage.setItem(`daily_score_${today}`, score);
    
        console.log(`Daily locked`);
    }

    // Flag system
    handleFlagDirection(direction) {
        if (!this.board) return;

        const px = this.player.getPosX();
        const py = this.player.getPosY();
        const abilityId = this.player.getAbilityId();

        let targetX = px;
        let targetY = py;
        let jumpX = px;
        let jumpY = py;

        switch(direction) {
            case "Up":    targetY--; jumpY -= 2; break;
            case "Down":  targetY++; jumpY += 2; break;
            case "Left":  targetX--; jumpX -= 2; break;
            case "Right": targetX++; jumpX += 2; break;
        }

        const size = this.board.length;
        if (targetX < 0 || targetX >= size || targetY < 0 || targetY >= size) return;
    
        const tile = this.board[targetX][targetY];

        // ==================== SCOUT ABILITY ====================
        if (abilityId === 4) {
            if (jumpX < 0 || jumpX >= size || jumpY < 0 || jumpY >= size) return;
        
            if (this.player.getFlags() > 0) {
                if (!tile.isJumpflagged()){
                    tile.setJumpflagged(true);
                    this.player.decrementFlags();
                }
            }
            
            if (tile.isJumpflagged()){
                this.player.setPosX(jumpX);
                this.player.setPosY(jumpY);
                this.charCtrl.verifyTile(this.board);
                this.boardCtrl.updateVisionAroundPlayer(this.board, this.player)
            };
            return;
        }

        if (abilityId === 1 && tile.isFlagged()) {
            return;
        }
        
        if (!tile.isHide() || tile.isMarked()) return;

        if (tile.isFlagged()) {
            tile.setFlagged(false);
            this.player.incrementFlags();
            return;
        }

        if (this.player.getFlags() > 0) {
            tile.setFlagged(true);
            this.player.decrementFlags();

            // ==================== CHEF ABILITY ====================
            if (abilityId === 1 && tile.getHazardtype() !== "none") {
                tile.setMarked(true);
                tile.setFlagged(false);
                this.player.incrementPoints(200);
            }
        }
    }


    getBoard() { return this.board; }
    getPlayer() { return this.player; }
    getZone() { return this.config.zone; }

    // ==================== SCOREBOARD ====================

    showScoreboard(isVictory) {
        const overlay = document.getElementById("scoreboard-overlay");
        if (!overlay) return;
    
        const scores = this.calculateScores();

        document.getElementById("rescued-score").textContent = scores.rescuedDisplay;
        document.getElementById("marked-score").textContent = scores.markedDisplay;
        document.getElementById("deaths-score").textContent = scores.deaths;
        document.getElementById("failed-score").textContent = scores.failed;
        document.getElementById("total-score").textContent = scores.totalDisplay;
    
        const percentage = (scores.total / scores.maxTotal) * 100;
        let gradeFile = "f.png";
        if (percentage >= 100) gradeFile = "s.png";
        else if (percentage >= 90) gradeFile = "a.png";
        else if (percentage >= 80) gradeFile = "b.png";
        else if (percentage >= 70) gradeFile = "c.png";
        else if (percentage >= 60) gradeFile = "d.png";
        else if (percentage >= 50) gradeFile = "e.png";
    
        document.getElementById("score-grade").src = `../assets/hud/game/gameover/${gradeFile}`;
    
        this.setupScoreboardButtons(isVictory);

        if (this.config.mode === "legacy") {
            if (!isVictory) {
                this.handleLegacyLose();
            }
        } else if (this.config.mode === "daily") {
            const totalPoints = scores.total;
    
            const today = new Date().toDateString();
            localStorage.setItem(`daily_completed_${today}`, "true");
            localStorage.setItem(`daily_score_${today}`, totalPoints);
    
            console.log(`Daily locked with score: ${totalPoints}`);
        }
        overlay.classList.add("active");
        this.gameInputLocked = true;
    }

    calculateScores() {
        const player = this.player;
        const maxFlags = this.getMaxFlagsByCharacter(player.getType());
    
        // ===== RESCUED =====
        const totalGoals = this.charCtrl.getTotalGoals();
        const rescuedCount = player.getTotalRescued();
        const rescuedPoints = rescuedCount * 500;
        const maxRescuedPoints = totalGoals * 500;
    
        // ===== MARKED =====
        let markedPoints = 0;
        let maxMarkedPoints = 0;

        let markedCount = 0;
        for (let i = 0; i < this.board.length; i++) {
            for (let j = 0; j < this.board.length; j++) {
                if (this.board[i][j].isMarked()) markedCount++;
            }
        }

        markedPoints = markedCount * 200;
        maxMarkedPoints = maxFlags * 200;
        
        // ===== DEATHS =====
        let deathsCount = 0;
        const deathsPoints = -(deathsCount * 500);
        const deathsDisplay = deathsPoints.toString();

        // ===== FAILED =====
        const failedFlags = this.player.getFailedFlags ? this.player.getFailedFlags() : 0;
        const failedJumpFlags = this.player.getFailedJumpFlags ? this.player.getFailedJumpFlags() : 0;
        const failedPoints = -((failedFlags * 200) + (failedJumpFlags * 50));
        const failedDisplay = `- ${(failedFlags * 200) + (failedJumpFlags * 50)}`;

        // ===== TOTAL =====
        const totalPoints = rescuedPoints + markedPoints + deathsPoints + failedPoints;
        const maxTotal = maxRescuedPoints + maxMarkedPoints;
    
        return {
            rescued: rescuedPoints,
            maxRescued: maxRescuedPoints,
            rescuedDisplay: `${rescuedPoints}/${maxRescuedPoints}`,
        
            marked: markedPoints,
            maxMarked: maxMarkedPoints,
            markedDisplay: `${markedPoints}/${maxMarkedPoints}`,
        
            deaths: deathsDisplay,
            failed: failedDisplay,
        
            total: totalPoints,
            maxTotal: maxTotal,
            totalDisplay: `${totalPoints}/${maxTotal}`
        };
    }

    getMaxFlagsByCharacter(characterType) {
        switch (characterType) {
            case "chef": return 5;
            case "mosquito": return 8;
            case "mommy": return 1;
            case "scout": return 0;
            default: return 5;
        }
    }

    setupScoreboardButtons(isVictory) {
        const mode = this.config.mode;
        const continueBtn = document.getElementById("score-continue");
        const retryBtn = document.getElementById("score-retry");
        const homeBtn = document.getElementById("score-home");
    
        continueBtn.style.display = "none";
        retryBtn.style.display = "none";
        homeBtn.style.display = "block";
    
        if (mode === "legacy") {
            if (isVictory) {
                continueBtn.style.display = "block";
            }
        } else if (mode === "daily") {
        } else if (mode === "custom") {
        retryBtn.style.display = "block";
        }
    
        const newContinue = continueBtn.cloneNode(true);
        const newRetry = retryBtn.cloneNode(true);
        const newHome = homeBtn.cloneNode(true);
        continueBtn.parentNode.replaceChild(newContinue, continueBtn);
        retryBtn.parentNode.replaceChild(newRetry, retryBtn);
        homeBtn.parentNode.replaceChild(newHome, homeBtn);
    
        newContinue.addEventListener("click", () => this.nextLevel());
        newRetry.addEventListener("click", () => this.retryLevel());
        newHome.addEventListener("click", () => this.returnToMenu());
    }

    nextLevel() {
        if (this.config.mode === "legacy") {
            this.handleLegacyVictory();
            document.getElementById("scoreboard-overlay").classList.remove("active");
        }
    }

    retryLevel() {
        if (this.config.mode === "custom") {
            this.startGame();
        }
        document.getElementById("scoreboard-overlay").classList.remove("active");
    }

    returnToMenu() {
        if (this.config.mode === "legacy" && this.lastResult === "victory") {
            this.currentLevel ++;
            localStorage.setItem("legacy_level", this.currentLevel);
            console.log(`Saving level on Home: ${this.currentLevel}`);
        }
        window.location.href = '../index.html';
    }
}