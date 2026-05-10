// ==============================================================
// ====================== GAME MANAGER ==========================
// ==============================================================
// Core game logic controller. Manages game state, level progression,
// input handling, victory/defeat conditions, and scoreboard display.

import { CharacterFactory } from "./CharacterFactory.js";
import { BoardController } from "./BoardController.js";
import { CharacterController } from "./CharacterController.js";

export class GameManager {
    
    // ======================= CONSTRUCTOR =======================
    
    constructor(config) {
        this.config = config;                       // Game configuration from menu
        this.currentLevel = 1;                     // Current legacy mode level
        this.gameInputLocked = false;               // Prevents input during animations
        this.player = null;                         // Reference to player character
        this.boardCtrl = null;                      // Board controller instance
        this.charCtrl = null;                       // Character controller instance
        this.board = null;                          // Game board grid
        this.lastVisionUpdate = 0;                  // Throttle for vision updates
        this.VISION_UPDATE_DELAY = 50;              // Vision update delay (ms)
        this.lastMoveTime = 0;                      // Throttle for movement
        this.MOVE_DELAY = 200;                      // Movement cooldown (ms)
        this.renderer = null;                       // Reference to renderer
        this.lastResult = null;                     // Last game result (victory/gameover)
        this.sfxEnabled = true;                     // Sound effects toggle
        this.isScoreAnimating = false;              // Score animation flag
        this.scoreAudio = null;                     // Score animation audio
    }
    
    // ======================= SFX SYSTEM =======================
    
    // Play sound effect (optional loop)
    playSFX(soundFile, loop = false) {
        if (!this.sfxEnabled) return;
        const audio = new Audio(`../assets/audio/sfx/${soundFile}`);
        audio.loop = loop;
        audio.volume = 0.3;
        audio.play().catch(e => console.log("SFX failed:", soundFile, e));
        return audio;
    }
    
    // Play death sound effect
    playDeathSFX() {
        this.playSFX("death.mp3");
    }
    
    // Play grade reveal sound effect
    playGradeSFX() {
        this.playSFX("grade.mp3");
    }
    
    // Start looping score animation sound
    startScoreAnimationSFX() {
        if (this.isScoreAnimating) return;
        this.isScoreAnimating = true;
        this.scoreAudio = this.playSFX("score.mp3", true);
    }
    
    // Stop score animation sound
    stopScoreAnimationSFX() {
        if (this.scoreAudio) {
            this.scoreAudio.pause();
            this.scoreAudio.currentTime = 0;
            this.scoreAudio = null;
        }
        this.isScoreAnimating = false;
    }
    
    // Set renderer reference
    setRenderer(renderer) {
        this.renderer = renderer;
    }
    
    // ======================= GAME INITIALIZATION =======================
    
    // Start or restart the game
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
    
    // Configure level based on game mode (legacy or custom/daily)
    configLevel() {
        let size;
        let goals;
        let hazardAmount;
        let hazardIntensity;
        let heightIntensity;
        let obstacleIntensity;
        let zone;
        let childLevel;
        
        // ===== LEGACY MODE =====
        if(this.config.mode === "legacy"){
            size = this.boardCtrl.loadDifficulty(this.currentLevel);
            hazardAmount = this.boardCtrl.loadNumberOfHazard(this.currentLevel);
            goals = this.boardCtrl.loadNumberOfGoals(this.currentLevel);
            heightIntensity = this.currentLevel;
            obstacleIntensity = this.currentLevel;
            zone = this.boardCtrl.loadTypeOfZone(this.currentLevel);
            childLevel = this.currentLevel;
        }
        // ===== CUSTOM / DAILY MODE =====
        else{
            size = this.config.size;
            goals = this.config.goals;
            hazardAmount = this.boardCtrl.loadNumberOfHazardBySize(size);
            hazardIntensity = this.config.hazards;
            heightIntensity = this.config.obstacles;
            obstacleIntensity = this.config.obstacles;
            zone = this.config.zone;
            childLevel = 10;
        }
        
        // Generate board step by step
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
        
        // Set character goals and starting position
        this.charCtrl.setCharacterGoals(goals);
        this.charCtrl.getStartCoords(this.board);
        this.boardCtrl.updateVision(this.board, this.player);
        
        // ========== DEBUG OUTPUT ==========
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
    
    // ======================= INPUT HANDLING =======================
    
    // Handle movement input (WASD)
    handleInput(direction) {
        if (this.gameInputLocked) return;
        
        // Movement throttling
        const now = Date.now();
        if (now - this.lastMoveTime < this.MOVE_DELAY) return;
        this.lastMoveTime = now;
        
        // Execute movement
        this.charCtrl.moveCharacter(direction, this.board);
        this.charCtrl.verifyTile(this.board);
        
        // Update vision around player
        this.boardCtrl.updateVisionAroundPlayer(this.board, this.player);
        
        // ===== HAZARD REGENERATION =====
        // Triggered when player has regen flag active (after rescuing)
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
            
            this.boardCtrl.regenerateHazards(
                this.board,
                hazardAmount,
                hazardIntensity,
                size
            );
            this.boardCtrl.trackHazardCount(this.board);
            this.boardCtrl.updateVision(this.board, this.player);
            this.player.setRegen(false);
        }
        
        // ===== VICTORY CHECK =====
        if (this.charCtrl.winCondition(this.board)){
            this.handleVictory();
            return;
        }
        
        // ===== DEFEAT CHECK =====
        if (!this.player.isAlive()) {
            this.gameInputLocked = true;
            this.handleGameOver();
            return;
        }
    }
    
    // ======================= GAME OVER HANDLERS =======================
    
    // Handle victory condition
    handleVictory() {
        this.gameInputLocked = true;
        this.showScoreboard(true);
        this.lastResult = "victory";
    }
    
    // Handle game over condition
    handleGameOver() {
        this.gameInputLocked = true;
        this.playDeathSFX();
        this.showScoreboard(false);
        this.lastResult = "gameover";
    }
    
    // Handle next level in legacy mode (victory)
    handleLegacyVictory() {
        console.log(`Legacy: Next level ${this.currentLevel + 1}`);
        
        this.currentLevel++;
        localStorage.setItem("legacy_level", this.currentLevel);
        
        // Preserve points but reset character
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
    
    // Handle legacy mode loss
    handleLegacyLose() {
        console.log(`Game over: Record ${this.currentLevel}`);
        localStorage.removeItem("legacy_level"); // Clear progress
        this.currentLevel = 1;
    }
    
    // Handle daily mode victory
    handleDailyVictory(score) {
        console.log(`Daily complete! Score: ${score}`);
        
        const today = new Date().toDateString();
        localStorage.setItem(`daily_completed_${today}`, "true");
        localStorage.setItem(`daily_score_${today}`, score);
        
        console.log(`Daily locked`);
    }
    
    // Handle daily mode loss
    handleDailyLose(score) {
        console.log(`Daily failed! Score: ${score}`);
        
        const today = new Date().toDateString();
        localStorage.setItem(`daily_completed_${today}`, "failed");
        localStorage.setItem(`daily_score_${today}`, score);
        
        console.log(`Daily locked`);
    }
    
    // ======================= FLAG SYSTEM =======================
    
    // Handle flag placement (arrow keys)
    handleFlagDirection(direction) {
        if (!this.board) return;
        
        const px = this.player.getPosX();
        const py = this.player.getPosY();
        const abilityId = this.player.getAbilityId();
        
        let targetX = px;
        let targetY = py;
        let jumpX = px;
        let jumpY = py;
        
        // Calculate target and jump positions
        switch(direction) {
            case "Up":    targetY--; jumpY -= 2; break;
            case "Down":  targetY++; jumpY += 2; break;
            case "Left":  targetX--; jumpX -= 2; break;
            case "Right": targetX++; jumpX += 2; break;
        }
        
        const size = this.board.length;
        if (targetX < 0 || targetX >= size || targetY < 0 || targetY >= size) return;
        
        const tile = this.board[targetX][targetY];
        
        // ==================== SCOUT ABILITY (Ability 4) ====================
        // Scout can jump 2 tiles using jump flags
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
        
        // ==================== CHEF ABILITY (Ability 1) ====================
        // Chef cannot re-flag already flagged tiles
        if (abilityId === 1 && tile.isFlagged()) {
            return;
        }
        
        // Cannot flag visible or marked tiles
        if (!tile.isHide() || tile.isMarked()) return;
        
        // Remove flag if already placed
        if (tile.isFlagged()) {
            tile.setFlagged(false);
            this.player.incrementFlags();
            return;
        }
        
        // Place new flag if available
        if (this.player.getFlags() > 0) {
            tile.setFlagged(true);
            this.player.decrementFlags();
            
            // Chef ability: Mark hazards automatically when flagged
            if (abilityId === 1 && tile.getHazardtype() !== "none") {
                tile.setMarked(true);
                tile.setFlagged(false);
                this.player.incrementPoints(200);
            }
        }
    }
    
    // ======================= GETTERS =======================
    
    getBoard() { return this.board; }
    getPlayer() { return this.player; }
    getZone() { return this.config.zone; }
    
    // ======================= SCOREBOARD SYSTEM =======================
    
    // Display the scoreboard overlay
    showScoreboard(isVictory) {
        const overlay = document.getElementById("scoreboard-overlay");
        if (!overlay) return;
        
        const scores = this.calculateScores();
        
        // Store final scores for animation
        this.finalScores = {
            rescued: scores.rescued,
            maxRescued: scores.maxRescued,
            marked: scores.marked,
            maxMarked: scores.maxMarked,
            deaths: parseInt(scores.deaths) || 0,
            failed: parseInt(scores.failed.replace(/[^0-9-]/g, '')) || 0,
            total: scores.total,
            maxTotal: scores.maxTotal
        };
        
        // Start score animation
        this.animateScoreNumbers();
        
        // Set initial score displays
        document.getElementById("rescued-score").textContent = scores.rescuedDisplay;
        document.getElementById("marked-score").textContent = scores.markedDisplay;
        document.getElementById("deaths-score").textContent = scores.deaths;
        document.getElementById("failed-score").textContent = scores.failed;
        document.getElementById("total-score").textContent = scores.totalDisplay;
        
        // Determine grade based on percentage
        const percentage = (scores.total / scores.maxTotal) * 100;
        let gradeFile = "f.png";
        if (percentage >= 100) gradeFile = "s.png";
        else if (percentage >= 90) gradeFile = "a.png";
        else if (percentage >= 80) gradeFile = "b.png";
        else if (percentage >= 70) gradeFile = "c.png";
        else if (percentage >= 60) gradeFile = "d.png";
        else if (percentage >= 50) gradeFile = "e.png";
        
        const gradeImg = document.getElementById("score-grade");
        gradeImg.style.opacity = "0";
        gradeImg.src = `../assets/hud/game/gameover/${gradeFile}`;
        
        // Setup buttons based on game mode
        this.setupScoreboardButtons(isVictory);
        
        // Save progress for legacy/daily modes
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
        
        // Show overlay
        overlay.classList.add("active");
        this.gameInputLocked = true;
        this.updateScoreboardScale();
    }
    
    // Update scoreboard scale based on screen size
    updateScoreboardScale() {
        const scoreboard = document.querySelector('.hud-scoreboard');
        if (!scoreboard) return;

        const targetWidth = 850; 
        const targetHeight = 620;
    
        const scaleX = (window.innerWidth * 0.95) / targetWidth;
        const scaleY = (window.innerHeight * 0.95) / targetHeight;
        
        let finalScale = Math.min(scaleX, scaleY);
        finalScale = Math.min(finalScale, 1.2);
    
        scoreboard.style.setProperty('--sb-scale', finalScale);
    }
    
    // Animate score numbers counting up
    animateScoreNumbers() {
        this.startScoreAnimationSFX();
        
        const elements = [
            { id: "rescued-score", finalValue: `${this.finalScores.rescued}/${this.finalScores.maxRescued}`, type: "fraction", animateTransform: true },
            { id: "marked-score", finalValue: `${this.finalScores.marked}/${this.finalScores.maxMarked}`, type: "fraction", animateTransform: true },
            { id: "deaths-score", finalValue: this.finalScores.deaths.toString(), type: "number", animateTransform: true },
            { id: "failed-score", finalValue: this.finalScores.failed.toString(), type: "number", animateTransform: true },
            { id: "total-score", finalValue: `${this.finalScores.total}/${this.finalScores.maxTotal}`, type: "fraction", animateTransform: false }
        ];
        
        let delay = 0;
        const stepDelay = 200;
        
        // Animate each element with staggered delay
        elements.forEach((element) => {
            setTimeout(() => {
                this.animateSingleNumber(element.id, element.finalValue, element.type);
                
                const el = document.getElementById(element.id);
                if (el) {
                    if (element.animateTransform) {
                        el.style.opacity = "0";
                        el.style.transform = "translateY(10px)";
                        el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
                        setTimeout(() => {
                            el.style.opacity = "1";
                            el.style.transform = "translateY(0)";
                        }, 50);
                    } else {
                        el.style.opacity = "0";
                        el.style.transition = "opacity 0.3s ease";
                        setTimeout(() => {
                            el.style.opacity = "1";
                        }, 50);
                    }
                }
            }, delay);
            delay += stepDelay;
        });
        
        const totalDuration = delay + 1500;
        
        // Grade fade in after all numbers are animated
        setTimeout(() => {
            this.stopScoreAnimationSFX();
            const gradeImg = document.getElementById("score-grade");
            if (gradeImg) {
                this.playGradeSFX();
                gradeImg.style.transition = "opacity 0.5s ease, transform 0.3s ease";
                gradeImg.style.opacity = "1";
                gradeImg.style.transform = "scale(2.5)";
                setTimeout(() => {
                    gradeImg.style.transform = "scale(1)";
                }, 300);
            }
        }, totalDuration);
    }
    
    // Animate a single number element (fraction or integer)
    animateSingleNumber(elementId, finalValue, type) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Fraction animation (e.g., "5/10")
        if (type === "fraction") {
            const [finalNum, finalMax] = finalValue.split('/');
            const numStart = 0;
            const maxStart = 0;
            const numEnd = parseInt(finalNum);
            const maxEnd = parseInt(finalMax);
            const duration = 1500;
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(1, elapsed / duration);
                const currentNum = Math.floor(numStart + (numEnd - numStart) * progress);
                const currentMax = Math.floor(maxStart + (maxEnd - maxStart) * progress);
                element.textContent = `${currentNum}/${currentMax}`;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            requestAnimationFrame(animate);
        }
        // Integer animation (with support for negatives)
        else if (type === "number") {
            const finalNum = parseInt(finalValue);
            const start = 0;
            const duration = 1500;
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(1, elapsed / duration);
                let currentNum = Math.floor(start + (finalNum - start) * progress);
                
                if (finalNum < 0) {
                    currentNum = -currentNum;
                    element.textContent = `- ${currentNum}`;
                } else {
                    element.textContent = currentNum.toString();
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            requestAnimationFrame(animate);
        }
    }
    
    // Calculate all score components
    calculateScores() {
        const player = this.player;
        const maxFlags = this.getMaxFlagsByCharacter(player.getType());
        
        // ===== RESCUED SCORE =====
        const totalGoals = this.charCtrl.getTotalGoals();
        const rescuedCount = player.getTotalRescued();
        const rescuedPoints = rescuedCount * 500;
        const maxRescuedPoints = totalGoals * 500;
        
        // ===== MARKED HAZARDS SCORE =====
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
        
        // ===== DEATHS PENALTY =====
        let deathsCount = 0;
        const deathsPoints = -(deathsCount * 500);
        const deathsDisplay = deathsPoints.toString();
        
        // ===== FAILED FLAGS PENALTY =====
        const failedFlags = this.player.getFailedFlags ? this.player.getFailedFlags() : 0;
        const failedJumpFlags = this.player.getFailedJumpFlags ? this.player.getFailedJumpFlags() : 0;
        const failedPoints = -((failedFlags * 200) + (failedJumpFlags * 100));
        const failedDisplay = `- ${(failedFlags * 200) + (failedJumpFlags * 100)}`;
        
        // ===== TOTAL SCORE =====
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
    
    // Get maximum flags based on character type
    getMaxFlagsByCharacter(characterType) {
        switch (characterType) {
            case "chef": return 5;
            case "mosquito": return 7;
            case "mommy": return 1;
            case "scout": return 0;
            default: return 5;
        }
    }
    
    // Setup scoreboard buttons based on game mode
    setupScoreboardButtons(isVictory) {
        const mode = this.config.mode;
        const continueBtn = document.getElementById("score-continue");
        const retryBtn = document.getElementById("score-retry");
        const homeBtn = document.getElementById("score-home");
        
        // Hide all buttons initially
        continueBtn.style.display = "none";
        retryBtn.style.display = "none";
        homeBtn.style.display = "block";
        
        // Legacy mode shows Continue on victory
        if (mode === "legacy") {
            if (isVictory) {
                continueBtn.style.display = "block";
            }
        }
        // Daily mode has no special buttons
        else if (mode === "daily") {
            // Daily mode uses only Home
        }
        // Custom mode shows Retry button
        else if (mode === "custom") {
            retryBtn.style.display = "block";
        }
        
        // Clone buttons to remove existing event listeners
        const newContinue = continueBtn.cloneNode(true);
        const newRetry = retryBtn.cloneNode(true);
        const newHome = homeBtn.cloneNode(true);
        continueBtn.parentNode.replaceChild(newContinue, continueBtn);
        retryBtn.parentNode.replaceChild(newRetry, retryBtn);
        homeBtn.parentNode.replaceChild(newHome, homeBtn);
        
        // Add fresh event listeners
        newContinue.addEventListener("click", () => this.nextLevel());
        newRetry.addEventListener("click", () => this.retryLevel());
        newHome.addEventListener("click", () => this.returnToMenu());
    }
    
    // Proceed to next level (legacy mode)
    nextLevel() {
        if (this.config.mode === "legacy") {
            this.handleLegacyVictory();
            document.getElementById("scoreboard-overlay").classList.remove("active");
        }
    }
    
    // Retry current level (custom mode)
    retryLevel() {
        if (this.config.mode === "custom") {
            this.startGame();
        }
        document.getElementById("scoreboard-overlay").classList.remove("active");
    }
    
    // Return to main menu
    returnToMenu() {
        // Save progress before leaving (legacy mode victory)
        if (this.config.mode === "legacy" && this.lastResult === "victory") {
            this.currentLevel++;
            localStorage.setItem("legacy_level", this.currentLevel);
            console.log(`Saving level on Home: ${this.currentLevel}`);
        }
        window.location.href = '../index.html';
    }
}