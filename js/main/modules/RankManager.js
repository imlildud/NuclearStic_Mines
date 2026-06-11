// js/main/modules/RankManager.js
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
    { rank: "F-", min: 0, max: 150000, next: 150000 },
    { rank: "F", min: 150001, max: 350000, next: 350000 },
    { rank: "F+", min: 350001, max: 650000, next: 650000 },

    { rank: "E-", min: 650001, max: 1000000, next: 1000000 },
    { rank: "E", min: 1000001, max: 1500000, next: 1500000 },
    { rank: "E+", min: 1500001, max: 2200000, next: 2200000 },

    { rank: "D-", min: 2200001, max: 3200000, next: 3200000 },
    { rank: "D", min: 3200001, max: 4500000, next: 4500000 },
    { rank: "D+", min: 4500001, max: 6200000, next: 6200000 },

    { rank: "C-", min: 6200001, max: 8400000, next: 8400000 },
    { rank: "C", min: 8400001, max: 11200000, next: 11200000 },
    { rank: "C+", min: 11200001, max: 14600000, next: 14600000 },

    { rank: "B-", min: 14600001, max: 18700000, next: 18700000 },
    { rank: "B", min: 18700001, max: 23600000, next: 23600000 },
    { rank: "B+", min: 23600001, max: 29400000, next: 29400000 },

    { rank: "A-", min: 29400001, max: 36200000, next: 36200000 },
    { rank: "A", min: 36200001, max: 44100000, next: 44100000 },
    { rank: "A+", min: 44100001, max: 53200000, next: 53200000 },

    { rank: "S-", min: 53200001, max: 63700000, next: 63700000 },
    { rank: "S", min: 63700001, max: 75700000, next: 75700000 },
    { rank: "S+", min: 75700001, max: Infinity, next: 75700001 }
];

// ==================== PUBLIC METHODS ====================

export const RankManager = {
    
    // Get rank data based on total points
    getRankData(points) {
        for (const r of RANKS) {
            if (points >= r.min && points <= r.max) {
                return {
                    rank: r.rank,
                    min: r.min,
                    max: r.max,
                    progress: points,
                    nextThreshold: r.next,
                    percent: (points - r.min) / (r.max - r.min) * 100
                };
            }
        }
        // Fallback for points below minimum (should not happen)
        return { rank: "F-", min: 0, max: 50000, progress: points, nextThreshold: 50000, percent: 0 };
    },

    // Update rank display in ID card (static, no animation)
    updateRankDisplay(totalPoints, isHardcore) {
        const rankBadge = document.getElementById("rank-badge");
        const rankBarFill = document.getElementById("rank-bar-fill");
        const rankText = document.getElementById("rank-text");
        
        if (!rankBadge) return;
        
        const rankData = this.getRankData(totalPoints);
        
        // Update badge image based on current rank
        rankBadge.src = `assets/hud/badges/rank_${rankData.rank.toLowerCase()}.png`;
        
        // Calculate progress percentage within current rank (0% to 100%)
        const progressInRank = totalPoints - rankData.min;
        const rankRange = rankData.max - rankData.min;
        let percent = 0;
        
        if (rankRange > 0) {
            percent = (progressInRank / rankRange) * 100;
        } else {
            percent = 100; // Max rank (S+ has no upper bound)
        }
        
        rankBarFill.style.width = `${Math.min(percent, 100)}%`;
        rankText.textContent = `${totalPoints.toLocaleString()} / ${rankData.max.toLocaleString()}`;
        
        // Apply hardcore styling if enabled
        if (isHardcore) {
            rankBarFill.style.background = "linear-gradient(90deg, #8b0000, #4a0000)";
        } else {
            rankBarFill.style.background = "linear-gradient(90deg, #4a7c59, #2a4a35";
        }
    },

    // Animate total points counting up from old value to new value
    animateTotalPoints(oldPoints, newPoints, isHardcore, onComplete = null) {
        // Don't animate if no change or if oldPoints is invalid (initial load)
        if (oldPoints === newPoints || oldPoints === null || oldPoints === undefined) {
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
        
        // Update badge image FIRST (before animation)
        if (rankChanged) {
            rankBadge.src = `assets/hud/badges/rank_${newRank.toLowerCase()}.png`;
            // Animate badge scale
            rankBadge.style.transition = "transform 0.2s ease, opacity 0.2s ease";
            rankBadge.style.transform = "scale(2.5)";
            rankBadge.style.opacity = "0.5";
            audioManager.playGradeSFX();
            
            setTimeout(() => {
                rankBadge.style.transform = "scale(1)";
                rankBadge.style.opacity = "1";
                setTimeout(() => {
                    rankBadge.style.transition = "";
                }, 300);
            }, 200);
        }
        
        // Start looping score sound for number animation
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
            rankText.textContent = `${currentValue.toLocaleString()} / ${rankDataCurrent.max.toLocaleString()}`;
            
            // Update progress bar
            const progressInRank = currentValue - rankDataCurrent.min;
            const rankRange = rankDataCurrent.max - rankDataCurrent.min;
            let percent = 0;
            
            if (rankRange > 0) {
                percent = (progressInRank / rankRange) * 100;
            } else {
                percent = 100;
            }
            
            rankBarFill.style.width = `${Math.min(percent, 100)}%`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete - stop score sound
                audioManager.stopScoreAnimationSFX();
                
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