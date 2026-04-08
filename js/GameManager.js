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
    }

    startGame() {
        this.gameInputLocked = false;
    
        this.player = CharacterFactory.createCharacter(this.config.character);
        this.boardCtrl = new BoardController(this.player);
        this.charCtrl = new CharacterController(this.player, this.boardCtrl);
    
        this.configLevel(this.currentLevel);
    
        this.boardCtrl.updateVision(this.board, this.player);
    }

    configLevel() {
        let size;
        let goals;
        let hazardAmount;
        let hazardIntensity;
        let heightIntensity;
        let obstacleIntensity;
        let zone;

        if(this.config.mode === "legacy"){
            size = this.boardCtrl.loadDifficulty(this.currentLevel);
            hazardAmount = this.boardCtrl.loadNumberOfHazard(this.currentLevel);
            goals = this.boardCtrl.loadNumberOfGoals(this.currentLevel);
            heightIntensity = this.currentLevel;
            obstacleIntensity = this.currentLevel;
            zone = this.boardCtrl.loadTypeOfZone(this.currentLevel);
        }else{
            size = this.config.size;
            goals = this.config.goals;
            hazardAmount = this.boardCtrl.loadNumberOfHazard(size);
            hazardIntensity = this.config.hazards;
            heightIntensity = this.config.obstacles;
            obstacleIntensity = this.config.obstacles;
            zone = this.config.zone;
        }

        this.board = this.boardCtrl.generateBoard(size);

        this.board = this.boardCtrl.generateStartAndGoal(
            this.board,
            goals,
            this.currentLevel
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
    }

    handleInput(direction) {
        if (this.gameInputLocked) return;
     
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

        // ==================== VICTORY ====================
    handleVictory() {
        this.gameInputLocked = true;
        this.gameOver = true;
        
        const mode = this.config.mode;
        const score = this.player.getPoints();
        
        console.log(`VICTORY! Mode: ${mode}, Score: ${score}`);
        
        // this.showVictoryScreen();
        // this.showScoreTable(score);
        
        if (mode === "legacy") {
            this.handleLegacyVictory();
        } else if (mode === "daily") {
            this.handleDailyVictory(score);
        } else if (mode === "custom") {
            this.handleCustomVictory(score);
        }
    }

    handleLegacyVictory() {
        console.log(`Legacy: Next level ${this.currentLevel + 1}`);
        
        this.currentLevel++;
        
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

    handleDailyVictory(score) {
        console.log(`Daily complete! Score: ${score}`);
        
        const today = new Date().toDateString();
        localStorage.setItem(`daily_completed_${today}`, "true");
        localStorage.setItem(`daily_score_${today}`, score);
        
        console.log(`Daily locked`);
        
        this.returnToMenu();
    }

    handleCustomVictory(score) {
        console.log(`Custom complete! Score: ${score}`);
        this.returnToMenu();
    }

    // ==================== GAME OVER ====================
    handleGameOver() {
        this.gameInputLocked = true;
        this.gameOver = true;
        
        const mode = this.config.mode;
        const score = this.player.getPoints();
        
        console.log(`GAME OVER! Mode: ${mode}, Score: ${score}, Level: ${this.currentLevel}`);
        
        // this.showGameOverScreen();
        // this.showScoreTable(score);
        
        if (mode === "legacy") {
            this.handleLegacyLose();
        } else if (mode === "daily") {
            this.handleDailyLose(score);
        } else if (mode === "custom") {
            this.handleCustomLose(score);
        }
    }

    handleLegacyLose() {
        console.log(`Game over: Record ${this.currentLevel}`);
        
        this.currentLevel = 1;
        this.startGame();
        
        console.log(`Restarting`);
    }
    
    handleDailyLose(score) {
        console.log(`Daily failed! Score: ${score}`);
        
        const today = new Date().toDateString();
        localStorage.setItem(`daily_completed_${today}`, "failed");
        localStorage.setItem(`daily_score_${today}`, score);
        
        console.log(`Daily locked`);
        
        this.returnToMenu();
    }
    
    handleCustomLose(score) {
        console.log(`Custom failed! Score: ${score}`);
        this.returnToMenu();
    }

    // ==================== UTILS ====================
    returnToMenu() {
        console.log(`Exit...`);
        window.location.href = '../index.html';
    }

    // showVictoryScreen() { ... }
    // showGameOverScreen() { ... }
    // showScoreTable(score) { ... }

    // Flag system
    handleFlagDirection(direction) {

        if (!this.board) return;

        const px = this.player.getPosX();
        const py = this.player.getPosY();

        let targetX = px;
        let targetY = py;

        switch(direction) {
            case "Up":    targetY--; break;
            case "Down":  targetY++; break;
            case "Left":  targetX--; break;
            case "Right": targetX++; break;
        }

        const size = this.board.length;

        if (targetX < 0 || targetY < 0 || 
            targetX >= size || targetY >= size) return;

        const tile = this.board[targetX][targetY];

        if (!tile.isHide()) return;

        if (tile.isFlagged()) {
            tile.setFlagged(false);
            this.player.incrementFlags();
            return;
        }   

        if (this.player.getFlags() > 0) {
            tile.setFlagged(true);
            this.player.decrementFlags();
        }
    }

    handleGameOver(){
        console.log("You're cooked");
    }


    getBoard() { return this.board; }
    getPlayer() { return this.player; }
    getZone() { return this.config.zone; }
}