// ==============================================================
// ======================== RANK MANAGER ========================
// ==============================================================
// Handles rank calculations, animations, and display updates for the ID card.
// Manages total points, rank progression, and visual feedback when ranking up/down.

import { SaveManager } from "../../managers/SaveManager.js";
import { AudioManager } from "../../managers/AudioManager.js";

// ==================== INSTANCES ====================

const saveManager = new SaveManager();
const audioManager = new AudioManager();

// ==================== RANK DATA ====================

// Rank thresholds with x1.5 progression
const RANKS = [
    { rank: "F-", min: 0, max: 50000, next: 50000 },
    { rank: "F", min: 50001, max: 100000, next: 100000 },
    { rank: "F+", min: 100001, max: 175000, next: 175000 },
    { rank: "E-", min: 175001, max: 287500, next: 287500 },
    { rank: "E", min: 287501, max: 431250, next: 431250 },
    { rank: "E+", min: 431251, max: 646875, next: 646875 },
    { rank: "D-", min: 646876, max: 970312, next: 970312 },
    { rank: "D", min: 970313, max: 1455468, next: 1455468 },
    { rank: "D+", min: 1455469, max: 2183202, next: 2183202 },
    { rank: "C-", min: 2183203, max: 3274803, next: 3274803 },
    { rank: "C", min: 3274804, max: 4912204, next: 4912204 },
    { rank: "C+", min: 4912205, max: 7368306, next: 7368306 },
    { rank: "B-", min: 7368307, max: 11052459, next: 11052459 },
    { rank: "B", min: 11052460, max: 16578688, next: 16578688 },
    { rank: "B+", min: 16578689, max: 24868032, next: 24868032 },
    { rank: "A-", min: 24868033, max: 37302048, next: 37302048 },
    { rank: "A", min: 37302049, max: 55953072, next: 55953072 },
    { rank: "A+", min: 55953073, max: 83929608, next: 83929608 },
    { rank: "S-", min: 83929609, max: 125894412, next: 125894412 },
    { rank: "S", min: 125894413, max: 188841618, next: 188841618 },
    { rank: "S+", min: 188841619, max: Infinity, next: 188841619 }
];

// ==================== PUBLIC METHODS ====================

export const RankManager = {
    
    // Get rank data based on total points
    getRankData(points) {
        for (const r of RANKS) {
            if (points >= r.min && points <= r.max) {
                return {
                    rank: r.rank,
                    progress: points,
                    nextThreshold: r.next,
                    percent: (points - r.min) / (r.max - r.min) * 100
                };
            }
        }
        // Fallback
        return { rank: "F", progress: points, nextThreshold: 40000, percent: 0 };
    },

    // Update rank display in ID card (static, no animation)
    updateRankDisplay(totalPoints, isHardcore) {
        const rankBadge = document.getElementById("rank-badge");
        const rankBarFill = document.getElementById("rank-bar-fill");
        const rankText = document.getElementById("rank-text");
        
        if (!rankBadge) return;
        
        const rankData = this.getRankData(totalPoints);
        rankBadge.src = `assets/hud/badges/rank_${rankData.rank.toLowerCase()}.png`;
        
        const percent = (rankData.progress / rankData.nextThreshold) * 100;
        rankBarFill.style.width = `${Math.min(percent, 100)}%`;
        rankText.textContent = `${totalPoints.toLocaleString()} / ${rankData.nextThreshold.toLocaleString()}`;
        
        // Apply hardcore styling if enabled
        if (isHardcore) {
            rankBarFill.style.background = "linear-gradient(90deg, #8b0000, #4a0000)";
        } else {
            rankBarFill.style.background = "linear-gradient(90deg, #4a7c59, #2a4a35)";
        }
    },

    // Animate total points counting up from old value to new value
    animateTotalPoints(oldPoints, newPoints, isHardcore, onComplete = null) {
        if (oldPoints === newPoints) {
            if (onComplete) onComplete();
            return;
        }
        
        const rankText = document.getElementById("rank-text");
        const rankBarFill = document.getElementById("rank-bar-fill");
        const rankBadge = document.getElementById("rank-badge");
        
        if (!rankText) {
            if (onComplete) onComplete();
            return;
        }
        
        // Check if rank changed during this session
        const oldRank = this.getRankData(oldPoints).rank;
        const newRank = this.getRankData(newPoints).rank;
        const rankChanged = (oldRank !== newRank);
        
        // Start looping score sound
        audioManager.startScoreAnimationSFX();
        
        const duration = 1500;
        const startTime = performance.now();
        const startValue = oldPoints;
        const endValue = newPoints;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);
            const currentValue = Math.floor(startValue + (endValue - startValue) * progress);
            
            // Update rank text with current value
            const rankDataCurrent = this.getRankData(currentValue);
            rankText.textContent = `${currentValue.toLocaleString()} / ${rankDataCurrent.nextThreshold.toLocaleString()}`;
            
            // Update progress bar
            const percent = (currentValue / rankDataCurrent.nextThreshold) * 100;
            rankBarFill.style.width = `${Math.min(percent, 100)}%`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete - stop score sound
                audioManager.stopScoreAnimationSFX();
                
                // If rank changed, animate the badge with grade sound
                if (rankChanged) {
                    this.animateRankChange(rankBadge, newRank);
                }
                
                if (onComplete) onComplete();
            }
        };
        
        requestAnimationFrame(animate);
    },

    // Animate rank badge when player ranks up or down
    animateRankChange(badgeElement, newRank) {
        if (!badgeElement) return;
        
        // Update badge image to new rank
        badgeElement.src = `assets/hud/badges/rank_${newRank.toLowerCase()}.png`;
        
        // Apply animation: scale up + slight fade
        badgeElement.style.transition = "transform 0.2s ease, opacity 0.2s ease";
        badgeElement.style.transform = "scale(2.5)";
        badgeElement.style.opacity = "0.5";
        
        // Play grade sound for rank up/down
        audioManager.playGradeSFX();
        
        // Scale back down
        setTimeout(() => {
            badgeElement.style.transform = "scale(1)";
            badgeElement.style.opacity = "1";
            
            // Clean up transition after animation
            setTimeout(() => {
                badgeElement.style.transition = "";
            }, 300);
        }, 200);
    },

    // Get total points from SaveManager
    getTotalPoints() {
        return saveManager.getTotalPoints();
    },

    // Add points to total (called after each game)
    addPoints(points) {
        return saveManager.addPoints(points);
    },

    // Get last score from last game
    getLastScore() {
        return saveManager.getLastScore();
    },

    // Set last score
    setLastScore(score) {
        saveManager.setLastScore(score);
    }
};

// Expose globally for ScoreboardManager to call
window.RankManager = RankManager;