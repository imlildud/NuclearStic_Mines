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
    }

    startGame() {
        this.gameInputLocked = false;

        // 1.- Create a character
        this.player = CharacterFactory.createCharacter(this.config.character);

        // 2.- Create controllers
        this.boardCtrl = new BoardController(this.player);
        this.charCtrl = new CharacterController(this.player, this.boardCtrl);

        // 3.- Config start level
        this.configLevel(this.currentLevel);
    }

    configLevel() {
        let size;
        let goals;
        let hazardAmount;
        let hazardIntensity;
        let heightIntensity;
        let obstacleIntensity;

        if(this.config.mode === "legacy"){
            size = this.boardCtrl.loadDifficulty(this.currentLevel);
            hazardAmount = this.boardCtrl.loadNumberOfHazard(this.currentLevel);
            goals = this.boardCtrl.loadNumberOfGoals(this.currentLevel);
            heightIntensity = this.currentLevel;
            obstacleIntensity = this.currentLevel;
        }else{
            size = this.config.size;
            goals = this.config.goals;
            hazardAmount = this.boardCtrl.loadNumberOfHazard(size);
            hazardIntensity = this.config.hazards;
            heightIntensity = this.config.obstacles;
            obstacleIntensity = this.config.obstacles;
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
        
        this.charCtrl.getStartCoords(this.board);
        this.boardCtrl.updateVision(this.board, this.player);
    }

    handleInput(direction) {
        if (this.gameInputLocked) return;
         
        // Movement
        this.charCtrl.moveCharacter(direction, this.board);

        // Check tiles
        this.charCtrl.verifyTile(this.board);
        this.boardCtrl.updateVision(this.board, this.player);

        // Victory
        if (this.charCtrl.winCondition(this.board)){
            this.currentLevel ++;
            this.configLevel(this.currentLevel);
            return;
        }

        // Lose
        if (!this.player.isAlive()) {
            this.gameInputLocked = true;
            this.handleGameOver();
        }
    }

    handleGameOver(){
        console.log("You're cooked");
    }


    getBoard() { return this.board; }
    getPlayer() { return this.player; }
}