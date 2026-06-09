// ==============================================================
// ==================== SCOREBOARD MANAGER ======================
// ==============================================================
// Handles scoreboard display, animations, grade calculation,
// and all score-related UI logic.

import { DifficultyScaler } from "./DifficultyScaler.js";
import { PathResolver } from "../utils/PathResolver.js";

export class ScoreboardManager {
    
    // ======================= CONSTRUCTOR =======================
    
    constructor(gameManager) {
        this.gameManager = gameManager;  // Reference to parent GameManager
        this.finalScores = null;         // Store final scores for animation
        this.isScoreAnimating = false;    // Animation state flag
    }
    
    // ======================= MAIN DISPLAY METHOD =======================
    
    // Display the scoreboard overlay
    show(isVictory) {
        const overlay = document.getElementById("scoreboard-overlay");
        if (!overlay) return;
        
        this.updateScoreboardLabels();
        const scores = this.calculateScores();
        
        // Store final scores for animation
        this.finalScores = {
            rescued: scores.rescued,
            maxRescued: scores.maxRescued,
            marked: scores.marked,
            maxMarked: scores.maxMarked,
            size: scores.size,
            hurt: scores.hurt, 
            deaths: parseInt(scores.deaths) || 0,
            failed: parseInt(scores.failed.replace(/[^0-9-]/g, '')) || 0,
            total: scores.total,
            maxTotal: scores.maxTotal
        };
        
        // Start score animation (with or without sound based on SFX settings)
        const sfxEnabled = this.gameManager.save.isSFXEnabled();
        const sfxVolume = this.gameManager.save.getSFXVolume();

        if (sfxEnabled && sfxVolume > 0) {
            this.animateScoreNumbers();  // Con sonido
        } else {
            this.animateScoreNumbersSilent();  // Sin sonido
        }
        
        // Set initial score displays
        document.getElementById("rescued-score").textContent = scores.rescuedDisplay;
        document.getElementById("marked-score").textContent = scores.markedDisplay;
        document.getElementById("size-score").textContent = scores.sizeDisplay;
        document.getElementById("deaths-score").textContent = scores.deaths;
        document.getElementById("failed-score").textContent = scores.failed;
        document.getElementById("hurt-score").textContent = scores.hurt;
        document.getElementById("total-score").textContent = scores.totalDisplay;
        
        // Determine grade based on percentage
        const gradeFile = this.getGradeFile(scores.total, scores.maxTotal);
        const gradeImg = document.getElementById("score-grade");
        gradeImg.style.opacity = "0";
        gradeImg.src = PathResolver.resolveAsset('gameGameover', gradeFile);
        
        // Setup buttons based on game mode
        this.setupButtons(isVictory);
        
        // Show overlay
        overlay.classList.add("active");
        
        // Update scale for responsive design
        this.updateScale();
    }

    // ======================= TRANSLATION METHOD =======================

    updateScoreboardLabels() {
        const lm = this.gameManager.localeManager;
        if (!lm) return;
        
        const rescuedLabel = document.getElementById("score-label-rescued");
        const markedLabel = document.getElementById("score-labeled");
        const difficultyLabel = document.getElementById("score-label-difficulty");
        const deathsLabel = document.getElementById("score-label-deaths");
        const failedLabel = document.getElementById("score-label-failed");
        const damageLabel = document.getElementById("score-label-damage");
        
        if (rescuedLabel) rescuedLabel.textContent = lm.get('game.scoreboard.rescued');
        if (markedLabel) markedLabel.textContent = lm.get('game.scoreboard.marked');
        if (difficultyLabel) difficultyLabel.textContent = lm.get('game.scoreboard.difficulty');
        if (deathsLabel) deathsLabel.textContent = lm.get('game.scoreboard.deaths');
        if (failedLabel) failedLabel.textContent = lm.get('game.scoreboard.failed');
        if (damageLabel) damageLabel.textContent = lm.get('game.scoreboard.damage');
    }
    
    // Hide the scoreboard overlay
    hide() {
        const overlay = document.getElementById("scoreboard-overlay");
        if (overlay) {
            overlay.classList.remove("active");
        }
    }
    
    // ======================= GRADE CALCULATION =======================
    
    // Get grade file based on percentage
    getGradeFile(total, maxTotal) {
        const percentage = (total / maxTotal) * 100;
        if (percentage >= 100) return "s.png";
        if (percentage >= 90) return "a.png";
        if (percentage >= 80) return "b.png";
        if (percentage >= 70) return "c.png";
        if (percentage >= 60) return "d.png";
        if (percentage >= 50) return "e.png";
        return "f.png";
    }
    
    // ======================= ANIMATION METHODS =======================
    
    // Animate score numbers counting up
    animateScoreNumbers() {
        this.gameManager.audio.startScoreAnimationSFX();
        
        const elements = [
            { id: "rescued-score", finalValue: `${this.finalScores.rescued}/${this.finalScores.maxRescued}`, type: "fraction", animateTransform: true },
            { id: "marked-score", finalValue: `${this.finalScores.marked}/${this.finalScores.maxMarked}`, type: "fraction", animateTransform: true },
            { id: "size-score", finalValue: this.finalScores.size.toString(), type: "number", animateTransform: true },
            { id: "deaths-score", finalValue: this.finalScores.deaths.toString(), type: "number", animateTransform: true },
            { id: "failed-score", finalValue: this.finalScores.failed.toString(), type: "number", animateTransform: true },
            { id: "hurt-score", finalValue: this.finalScores.hurt.toString(), type: "number", animateTransform: true },
            { id: "total-score", finalValue: `${this.finalScores.total}/${this.finalScores.maxTotal}`, type: "fraction", animateTransform: false }
        ];
        
        let delay = 0;
        const stepDelay = 200;
        
        elements.forEach((element) => {
            setTimeout(() => {
                this.animateSingleNumber(element.id, element.finalValue, element.type);
                this.animateTransform(element.id, element.animateTransform);
            }, delay);
            delay += stepDelay;
        });
        
        const totalDuration = delay + 1500;
        
        // Grade fade in after all numbers are animated
        setTimeout(() => {
            this.gameManager.audio.stopScoreAnimationSFX();
            const gradeImg = document.getElementById("score-grade");
            if (gradeImg) {
                this.gameManager.audio.playGradeSFX();
                gradeImg.style.transition = "opacity 0.5s ease, transform 0.3s ease";
                gradeImg.style.opacity = "1";
                gradeImg.style.transform = "scale(2.5)";
                setTimeout(() => {
                    gradeImg.style.transform = "scale(1)";
                }, 300);
            }
        }, totalDuration);
    }

    // Animate score numbers without sound (for when SFX is disabled)
    animateScoreNumbersSilent() {
        const elements = [
            { id: "rescued-score", finalValue: `${this.finalScores.rescued}/${this.finalScores.maxRescued}`, type: "fraction", animateTransform: true },
            { id: "marked-score", finalValue: `${this.finalScores.marked}/${this.finalScores.maxMarked}`, type: "fraction", animateTransform: true },
            { id: "size-score", finalValue: this.finalScores.size.toString(), type: "number", animateTransform: true },
            { id: "deaths-score", finalValue: this.finalScores.deaths.toString(), type: "number", animateTransform: true },
            { id: "failed-score", finalValue: this.finalScores.failed.toString(), type: "number", animateTransform: true },
            { id: "hurt-score", finalValue: this.finalScores.hurt.toString(), type: "number", animateTransform: true },
            { id: "total-score", finalValue: `${this.finalScores.total}/${this.finalScores.maxTotal}`, type: "fraction", animateTransform: false }
        ];
        
        let delay = 0;
        const stepDelay = 200;
        
        elements.forEach((element) => {
            setTimeout(() => {
                this.animateSingleNumber(element.id, element.finalValue, element.type);
                this.animateTransform(element.id, element.animateTransform);
            }, delay);
            delay += stepDelay;
        });
        
        const totalDuration = delay + 1500;
        
        // Grade fade in after all numbers are animated (sin sonido)
        setTimeout(() => {
            const gradeImg = document.getElementById("score-grade");
            if (gradeImg) {
                gradeImg.style.transition = "opacity 0.5s ease, transform 0.3s ease";
                gradeImg.style.opacity = "1";
                gradeImg.style.transform = "scale(2.5)";
                setTimeout(() => {
                    gradeImg.style.transform = "scale(1)";
                }, 300);
            }
        }, totalDuration);
    }
    
    // Animate transform for a single element
    animateTransform(elementId, shouldAnimate) {
        const el = document.getElementById(elementId);
        if (!el || !shouldAnimate) {
            if (el && !shouldAnimate) {
                el.style.opacity = "0";
                el.style.transition = "opacity 0.3s ease";
                setTimeout(() => { el.style.opacity = "1"; }, 50);
            }
            return;
        }
        
        el.style.opacity = "0";
        el.style.transform = "translateY(10px)";
        el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
        }, 50);
    }
    
    // Animate a single number element (fraction or integer)
    animateSingleNumber(elementId, finalValue, type) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (type === "fraction") {
            this.animateFraction(element, finalValue);
        } else if (type === "number") {
            this.animateInteger(element, finalValue);
        }
    }
    
    animateFraction(element, finalValue) {
        const [finalNum, finalMax] = finalValue.split('/');
        const numEnd = parseInt(finalNum);
        const maxEnd = parseInt(finalMax);
        const duration = 1500;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);
            const currentNum = Math.floor(numEnd * progress);
            const currentMax = Math.floor(maxEnd * progress);
            element.textContent = `${currentNum}/${currentMax}`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }
    
    animateInteger(element, finalValue) {
        const finalNum = parseInt(finalValue);
        const duration = 1500;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);
            let currentNum = Math.floor(finalNum * progress);
            
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
    
    // ======================= SCORE CALCULATION =======================
    
    // Calculate all score components
    calculateScores() {
        const player = this.gameManager.getPlayer();
        const board = this.gameManager.getBoard();
        const charCtrl = this.gameManager.charCtrl;
        const maxFlags = this.getMaxFlagsByCharacter(player.getType());
        const size = board.length;
        
        // ===== RESCUED SCORE =====
        const totalGoals = charCtrl.getTotalGoals();
        const rescuedCount = player.getTotalRescued();
        const rescuedPoints = rescuedCount * 500;
        const maxRescuedPoints = totalGoals * 500;
        
        // ===== MARKED HAZARDS SCORE =====
        let markedPoints = 0;
        let maxMarkedPoints = 0;
        let markedCount = 0;
        
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                if (board[i][j].isMarked()) markedCount++;
            }
        }
        
        markedPoints = markedCount * 200;
        maxMarkedPoints = maxFlags * 200;
        
        // ===== DIFFICULTY BONUS =====
        const difficultyBonus = this.calculateDifficultyBonus();
        
        // ===== DEATHS PENALTY =====
        let deathsCount = 0;
        const deathsPoints = -(deathsCount * 500);
        const deathsDisplay = deathsPoints.toString();
        
        // ===== FAILED FLAGS PENALTY =====
        const failedFlags = player.getFailedFlags ? player.getFailedFlags() : 0;
        const failedJumpFlags = player.getFailedJumpFlags ? player.getFailedJumpFlags() : 0;
        const failedPoints = -((failedFlags * 200) + (failedJumpFlags * 100));
        const failedDisplay = `- ${(failedFlags * 200) + (failedJumpFlags * 100)}`;
        
        // ===== HURT PENALTY =====
        const hurtCount = player.getDamageTaken ? player.getDamageTaken() : 0;
        const hurtPoints = -(hurtCount * 100);
        const hurtDisplay = hurtPoints.toString();
        
        // ===== TOTAL SCORE =====
        const totalPoints = rescuedPoints + markedPoints + difficultyBonus + deathsPoints + failedPoints + hurtPoints;
        const maxTotal = maxRescuedPoints + maxMarkedPoints + difficultyBonus;
        
        return {
            rescued: rescuedPoints,
            maxRescued: maxRescuedPoints,
            rescuedDisplay: `${rescuedPoints}/${maxRescuedPoints}`,
            marked: markedPoints,
            maxMarked: maxMarkedPoints,
            markedDisplay: `${markedPoints}/${maxMarkedPoints}`,
            size: difficultyBonus,
            sizeDisplay: difficultyBonus.toString(),
            deaths: deathsDisplay,
            failed: failedDisplay,
            hurt: hurtDisplay,
            total: totalPoints,
            maxTotal: maxTotal,
            totalDisplay: `${totalPoints}/${maxTotal}`
        };
    }
    
    // Calculate difficulty bonus (size + hazards + obstacles)
    calculateDifficultyBonus() {
        const config = this.gameManager.config;
        const currentLevel = this.gameManager.currentLevel;
    
        let size, hazards, obstacles;
    
        if (config.mode === "legacy") {
            size = DifficultyScaler.getBoardSize(currentLevel);
            hazards = currentLevel;
            obstacles = currentLevel;
        } else {
            size = config.size;
            hazards = config.hazards;
            obstacles = config.obstacles;
        }
    
        const sizeBonus = DifficultyScaler.getSizeBonus(size);
        const hazardsBonus = DifficultyScaler.getHazardsBonus(hazards);
        const obstaclesBonus = DifficultyScaler.getObstaclesBonus(obstacles);
    
        return sizeBonus + hazardsBonus + obstaclesBonus;
    }
    
    // ======================= BONUS CALCULATIONS =======================
    
    getSizeBonus(size) {
        switch(size) {
            case 8: return 10;
            case 12: return 30;
            case 16: return 50;
            case 20: return 80;
            case 24: return 100;
            default: return 10;
        }
    }
    
    getHazardsBonus(hazards) {
        switch(hazards) {
            case 1: return 20;
            case 5: return 50;
            case 8: return 100;
            case 12: return 150;
            case 20: return 200;
            case 30: return 300;
            default: return 20;
        }
    }
    
    getObstaclesBonus(obstacles) {
        switch(obstacles) {
            case 1: return 0;
            case 3: return 20;
            case 5: return 40;
            case 10: return 60;
            case 15: return 80;
            case 30: return 100;
            default: return 0;
        }
    }
    
    getMaxFlagsByCharacter(characterType) {
        switch (characterType) {
            case "chef": return 5;
            case "mosquito": return 7;
            case "mommy": return 1;
            case "scout": return 0;
            default: return 5;
        }
    }
    
    // ======================= BUTTON SETUP =======================
    
    setupButtons(isVictory) {
        const mode = this.gameManager.config.mode;
        const continueBtn = document.getElementById("score-continue");
        const retryBtn = document.getElementById("score-retry");
        const homeBtn = document.getElementById("score-home");
        const randomBtn = document.getElementById("score-random");
        
        continueBtn.style.display = "none";
        retryBtn.style.display = "none";
        homeBtn.style.display = "block";
        if (randomBtn) randomBtn.style.display = "none";
        
        if (mode === "legacy" && isVictory) {
            continueBtn.style.display = "block";
        } else if (mode === "custom") {
            retryBtn.style.display = "block";
            if (randomBtn) {
                randomBtn.style.display = "block";
            }
        } else if (mode === "tutorial") {
            continueBtn.style.display = "none";
            retryBtn.style.display = "none";
            homeBtn.style.display = "none";
            if (randomBtn) randomBtn.style.display = "none";
        }
        
        // Clone buttons to remove existing event listeners
        const newContinue = continueBtn.cloneNode(true);
        const newRetry = retryBtn.cloneNode(true);
        const newHome = homeBtn.cloneNode(true);
        const newRandom = randomBtn ? randomBtn.cloneNode(true) : null;
        
        continueBtn.parentNode.replaceChild(newContinue, continueBtn);
        retryBtn.parentNode.replaceChild(newRetry, retryBtn);
        homeBtn.parentNode.replaceChild(newHome, homeBtn);
        if (newRandom && randomBtn) {
            randomBtn.parentNode.replaceChild(newRandom, randomBtn);
        }
        
        // Bind callbacks
        newContinue.addEventListener("click", () => this.gameManager.nextLevel());
        newRetry.addEventListener("click", () => this.gameManager.retryLevel());
        newHome.addEventListener("click", () => this.gameManager.returnToMenu());
        if (newRandom) {
            newRandom.addEventListener("click", () => this.gameManager.randomizeNewGame());
        }
    }
    
    // ======================= RESPONSIVE SCALING =======================
    
    updateScale() {
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
}