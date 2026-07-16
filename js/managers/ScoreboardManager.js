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
        this.gameManager = gameManager;
        this.finalScores = null;
        this.isScoreAnimating = false;
    }
    
    // ======================= SIZE MULTIPLIER =======================
    
    // Get rescue points per child based on board size
    getRescueValue(size) {
        if (size <= 8) return 100;      // Small
        if (size <= 12) return 150;     // Medium
        if (size <= 16) return 200;     // Large
        if (size <= 20) return 300;     // Xtra-Large
        return 500;                      // Ultra-Large
    }
    
    // Get flag value (marked hazard) based on board size
    getFlagValue(size) {
        if (size <= 8) return 40;       // Small
        if (size <= 12) return 70;      // Medium
        if (size <= 16) return 100;     // Large
        if (size <= 20) return 150;     // Xtra-Large
        return 200;                      // Ultra-Large
    }
    
    // Get maximum flags based on total hazards on board (Opción E)
    getMaxFlagsByHazards(board) {
        let totalHazards = 0;
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                if (board[i][j].getHazardtype() !== "none") {
                    totalHazards++;
                }
            }
        }
        return totalHazards;
    }
    
    // Get mode multiplier (Legacy level or Daily streak)
    getModeMultiplier() {
        const config = this.gameManager.config;
        
        if (config.mode === "legacy") {
            // Legacy: 1 + (level / 100), max 2.0 at level 100
            const level = this.gameManager.currentLevel;
            let multiplier = 1 + (level / 100);
            if (multiplier > 2.0) multiplier = 2.0;
            return multiplier;
        }
        
        if (config.mode === "daily") {
            // Daily: 1 + (streak / 100), max 1.6 at streak 60
            const streak = this.gameManager.save.getDailyStreak();
            let multiplier = 1 + (streak / 100);
            if (multiplier > 1.6) multiplier = 1.6;
            return multiplier;
        }
        
        // Custom: no multiplier
        return 1.0;
    }
    
    // ======================= MAIN DISPLAY METHOD =======================
    
    // Display the scoreboard overlay
    show(isVictory) {
        const overlay = document.getElementById("scoreboard-overlay");
        if (!overlay) return;
        
        this.updateScoreboardLabels();
        const scores = this.calculateScores();
        
        this.finalScores = {
            rescued: scores.rescued,
            maxRescued: scores.maxRescued,
            marked: scores.marked,
            maxMarked: scores.maxMarked,
            size: scores.size,
            hurt: scores.hurt, 
            deaths: parseInt(scores.deaths.replace(/[^0-9-]/g, '')) || 0,
            failed: parseInt(scores.failed.replace(/[^0-9-]/g, '')) || 0,
            total: scores.total,
            maxTotal: scores.maxTotal
        };
        
        const sfxEnabled = this.gameManager.save.isSFXEnabled();
        const sfxVolume = this.gameManager.save.getSFXVolume();

        if (sfxEnabled && sfxVolume > 0) {
            this.animateScoreNumbers();
        } else {
            this.animateScoreNumbersSilent();
        }
        
        document.getElementById("rescued-score").textContent = scores.rescuedDisplay;
        document.getElementById("marked-score").textContent = scores.markedDisplay;
        document.getElementById("size-score").textContent = scores.sizeDisplay;
        document.getElementById("deaths-score").textContent = scores.deaths;
        document.getElementById("failed-score").textContent = scores.failed;
        document.getElementById("hurt-score").textContent = scores.hurt;
        document.getElementById("total-score").textContent = scores.totalDisplay;
        
        const gradeFile = this.getGradeFile(scores.total, scores.maxTotal);
        const gradeImg = document.getElementById("score-grade");
        gradeImg.style.opacity = "0";
        gradeImg.src = PathResolver.resolveAsset('gameGameover', gradeFile);
        
        this.setupButtons(isVictory);
        overlay.classList.add("active");
        this.updateScale();

        // Save total points with mode multiplier applied
        const totalPointsEarned = scores.total;
        const isHardcore = this.gameManager.isHardcoreEnabled() && this.gameManager.config.mode === "legacy";

        if (isHardcore) {
            this.gameManager.save.addHardcorePoints(totalPointsEarned);
        } else {
            this.gameManager.save.addPoints(totalPointsEarned);
        }
        this.gameManager.save.setLastScore(totalPointsEarned);

        if (window.RankManager) {
            const newTotal = isHardcore ? this.gameManager.save.getHardcoreTotalPoints() : this.gameManager.save.getTotalPoints();
            window.RankManager.updateRankDisplay(newTotal, isHardcore);
        }
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
    
    hide() {
        const overlay = document.getElementById("scoreboard-overlay");
        if (overlay) {
            overlay.classList.remove("active");
        }
    }
    
    // ======================= GRADE CALCULATION =======================
    
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
            { id: "size-score", finalValue: this.finalScores.size.toString(), type: "string", animateTransform: true },
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

    animateScoreNumbersSilent() {
        const elements = [
            { id: "rescued-score", finalValue: `${this.finalScores.rescued}/${this.finalScores.maxRescued}`, type: "fraction", animateTransform: true },
            { id: "marked-score", finalValue: `${this.finalScores.marked}/${this.finalScores.maxMarked}`, type: "fraction", animateTransform: true },
            { id: "size-score", finalValue: this.finalScores.size.toString(), type: "string", animateTransform: true },
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
        const totalPals = charCtrl.getTotalPals();
        const size = board.length;
        const isHardcore = this.gameManager.isHardcoreEnabled() && this.gameManager.config.mode === "legacy";
        
        // Get values based on board size
        const rescueValue = this.getRescueValue(size);
        const flagValue = this.getFlagValue(size);
        
        // Max flags = total hazards on board (Opción E)
        const maxFlags = this.getMaxFlagsByHazards(board);
        
        // ===== RESCUED SCORE =====
        const rescuedCount = player.getTotalRescued();
        const rescuedPoints = rescuedCount * rescueValue;
        const maxRescuedPoints = totalPals * rescueValue;
        
        // ===== MARKED HAZARDS SCORE =====
        let markedPoints = 0;
        let maxMarkedPoints = 0;
        let markedCount = 0;

        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                const tile = board[i][j];
                if (tile.isMarked() || (tile.isJumpflagged() && tile.isMarked())) {
                    markedCount++;
                }
            }
        }
        markedPoints = markedCount * flagValue;
        maxMarkedPoints = maxFlags * flagValue;
        
        // ===== DIFFICULTY BONUS =====
        let difficultyMultiplier = this.calculateDifficultyMultiplier();
        if (isHardcore){
            difficultyMultiplier += 0.5;
        }
        
        // ===== PENALTIES =====
        const deadPals = player.getDeadPals ? player.getDeadPals() : 0;
        const deadPenalty = -(deadPals * rescueValue);

        const failedFlags = player.getFailedFlags ? player.getFailedFlags() : 0;
        const failedJumpFlags = player.getFailedJumpFlags ? player.getFailedJumpFlags() : 0;
        const failedPenalty = (failedFlags * flagValue) + (failedJumpFlags * (flagValue));
        
        // ===== HURT PENALTY =====
        const hurtCount = player.getDamageTaken ? player.getDamageTaken() : 0;
        const hurtPenalty = -(hurtCount * 100);
        
        // ===== SUBTOTAL (before multiplier) =====
        let subTotal = rescuedPoints + markedPoints + deadPenalty - failedPenalty + hurtPenalty;

        // Only clamp to 0 for non-hardcore modes
        if (!isHardcore && subTotal < 0) {
            subTotal = 0;
        }
        
        // ===== APPLY MODE MULTIPLIER =====
        const modeMultiplier = this.getModeMultiplier();
        const totalPoints = Math.floor(subTotal * difficultyMultiplier * modeMultiplier);
        
        // Calculate max total for percentage display
        const maxSubTotal = maxRescuedPoints + maxMarkedPoints;
        const maxTotal = Math.floor(maxSubTotal * difficultyMultiplier * modeMultiplier);
        
        // ===== S RANK CHECK =====
        const isSRank = totalPoints >= maxTotal * 0.9;
        
        // ===== CURSE MULTIPLIERS =====
        const hasOblivion = player.hasKeychain('oblivion');
        const hasLink = player.hasKeychain('link');
        const hasJudgment = player.hasKeychain('judgment');
        const hasDelirium = player.hasKeychain('delirium');
        
        let curseBonus = 0;
        
        if (hasOblivion) curseBonus += 0.1;
        if (hasLink) curseBonus += 0.2;
        if (hasJudgment) curseBonus += 0.3;
        if (hasDelirium) curseBonus += 0.4;
        
        if (isSRank) {
            if (hasOblivion) curseBonus += 0.4;
            if (hasLink) curseBonus += 0.5;
            if (hasJudgment) curseBonus += 0.5;
            if (hasDelirium) curseBonus += 0.6;
        }
        
        // Recalculate with curse bonus
        const finalMultiplier = difficultyMultiplier + curseBonus;
        const finalTotal = Math.floor(subTotal * finalMultiplier * modeMultiplier);
        const finalMaxTotal = Math.floor(maxSubTotal * finalMultiplier * modeMultiplier);
        
        return {
            rescued: rescuedPoints,
            maxRescued: maxRescuedPoints,
            rescuedDisplay: `${rescuedPoints}/${maxRescuedPoints}`,
            marked: markedPoints,
            maxMarked: maxMarkedPoints,
            markedDisplay: `${markedPoints}/${maxMarkedPoints}`,
            size: finalMultiplier,
            sizeDisplay: `x${(finalMultiplier + (modeMultiplier - 1.0)).toFixed(2)}`,
            deaths: `- ${Math.floor(Math.abs(deadPenalty))}`,
            failed: `- ${Math.floor(failedPenalty)}`,
            hurt: hurtPenalty,
            hurtDisplay: `- ${hurtPenalty}`,
            total: finalTotal,
            maxTotal: finalMaxTotal,
            totalDisplay: `${finalTotal}/${finalMaxTotal}`
        };
    }
    
    // Calculate difficulty multiplier based on hazards and obstacles intensity
    calculateDifficultyMultiplier() {
        const config = this.gameManager.config;
        const currentLevel = this.gameManager.currentLevel;

        let hazards, obstacles;

        if (config.mode === "legacy") {
            const isHardcore = this.gameManager.isHardcoreEnabled();
            
            if (isHardcore) {
                // Hardcore: use config values (already set in GameManager)
                hazards = config.hazards;
                obstacles = config.obstacles;
                console.log(`[Difficulty] Hardcore - hazards: ${hazards}, obstacles: ${obstacles}`);
            } else {
                // Normal Legacy: use current level as intensity
                hazards = currentLevel;
                obstacles = currentLevel;
                console.log(`[Difficulty] Normal Legacy - level: ${currentLevel}`);
            }
        } else {
            // Custom / Daily mode
            hazards = config.hazards;
            obstacles = config.obstacles;
            console.log(`[Difficulty] ${config.mode} - hazards: ${hazards}, obstacles: ${obstacles}`);
        }

        // Base multiplier starts at 1.0
        let multiplier = 1.0;
        
        // Hazard intensity bonus
        if (hazards >= 30) multiplier += 0.05;
        else if (hazards >= 20) multiplier += 0.04;
        else if (hazards >= 12) multiplier += 0.04;
        else if (hazards >= 8) multiplier += 0.02;
        else if (hazards >= 5) multiplier += 0.01;
        
        // Obstacle intensity bonus
        if (obstacles >= 30) multiplier += 0.06;
        else if (obstacles >= 15) multiplier += 0.04;
        else if (obstacles >= 10) multiplier += 0.2;
        else if (obstacles >= 5) multiplier += 0.01;
        else if (obstacles >= 3) multiplier += 0.0;
        
        console.log(`[Difficulty] Final multiplier: ${multiplier}`);
        return multiplier;
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

            const currentLevel = this.gameManager.currentLevel + 1;
            const isBiomeTransition = currentLevel % 10 === 0;

            if (isBiomeTransition) {
                continueBtn.style.display = "none";
                homeBtn.style.display = "block";
            } else {
                continueBtn.style.display = "block";
            }
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