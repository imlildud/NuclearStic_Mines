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

// ==================== NORMAL RANKS (Letters F to S+) ====================

const NORMAL_RANKS = [
    { rank: "F-", min: 0, max: 450000, next: 450000 },
    { rank: "F", min: 450001, max: 1050000, next: 1050000 },
    { rank: "F+", min: 1050001, max: 1950000, next: 1950000 },
    { rank: "E-", min: 1950001, max: 3000000, next: 3000000 },
    { rank: "E", min: 3000001, max: 4500000, next: 4500000 },
    { rank: "E+", min: 4500001, max: 6600000, next: 6600000 },
    { rank: "D-", min: 6600001, max: 9600000, next: 9600000 },
    { rank: "D", min: 9600001, max: 13500000, next: 13500000 },
    { rank: "D+", min: 13500001, max: 18600000, next: 18600000 },
    { rank: "C-", min: 18600001, max: 25200000, next: 25200000 },
    { rank: "C", min: 25200001, max: 33600000, next: 33600000 },
    { rank: "C+", min: 33600001, max: 43800000, next: 43800000 },
    { rank: "B-", min: 43800001, max: 56100000, next: 56100000 },
    { rank: "B", min: 56100001, max: 70800000, next: 70800000 },
    { rank: "B+", min: 70800001, max: 88200000, next: 88200000 },
    { rank: "A-", min: 88200001, max: 108600000, next: 108600000 },
    { rank: "A", min: 108600001, max: 132300000, next: 132300000 },
    { rank: "A+", min: 132300001, max: 159600000, next: 159600000 },
    { rank: "S-", min: 159600001, max: 191100000, next: 191100000 },
    { rank: "S", min: 191100001, max: 227100000, next: 227100000 },
    { rank: "S+", min: 227100001, max: Infinity, next: 227100001 }
];

// ==================== HARDCORE RANKS (Greek letters) ====================

const HARDCORE_RANKS = [
    { rank: "ζ", min: 0, max: 2000000, next: 2000000 },      // Zeta
    { rank: "ε", min: 2000001, max: 7000000, next: 7000000 },        // Epsilon
    { rank: "δ", min: 7000001, max: 20000000, next: 20000000 },      // Delta
    { rank: "γ", min: 20000001, max: 50000000, next: 50000000 },     // Gamma
    { rank: "β", min: 50000001, max: 100000000, next: 100000000 },   // Beta
    { rank: "Ω", min: 100000001, max: Infinity, next: 100000001 }    // Omega
];

// ==================== PUBLIC METHODS ====================

export const RankManager = {
    
    // Get rank data based on points and mode
    getRankData(points, isHardcore = false) {
        const ranks = isHardcore ? HARDCORE_RANKS : NORMAL_RANKS;
        
        for (const r of ranks) {
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
        
        // Fallback
        if (isHardcore) {
            return { rank: "ζ", min: -Infinity, max: 2000000, progress: points, nextThreshold: 2000000, percent: 0 };
        }
        return { rank: "F-", min: 0, max: 450000, progress: points, nextThreshold: 450000, percent: 0 };
    },

    // Update rank display in ID card (static, no animation)
    updateRankDisplay(totalPoints, isHardcore) {
        const rankBadge = document.getElementById("rank-badge");
        const rankBarFill = document.getElementById("rank-bar-fill");
        const rankText = document.getElementById("rank-text");
        
        if (!rankBadge) return;
        
        const rankData = this.getRankData(totalPoints, isHardcore);
        
        // Update badge image based on current rank
        rankBadge.src = `assets/hud/badges/rank_${rankData.rank.toLowerCase()}.png`;
        
        // Calculate progress percentage within current rank (0% to 100%)
        let percent = 0;
        
        if (isHardcore) {
            // For hardcore, handle infinite negative range
            if (rankData.rank === "ζ" && totalPoints < 0) {
                // Negative points show 0% progress
                percent = 0;
            } else {
                const progressInRank = totalPoints - rankData.min;
                const rankRange = rankData.max - rankData.min;
                if (rankRange > 0) {
                    percent = (progressInRank / rankRange) * 100;
                } else {
                    percent = 100;
                }
            }
        } else {
            const progressInRank = totalPoints - rankData.min;
            const rankRange = rankData.max - rankData.min;
            if (rankRange > 0) {
                percent = (progressInRank / rankRange) * 100;
            } else {
                percent = 100;
            }
        }
        
        rankBarFill.style.width = `${Math.min(percent, 100)}%`;
        rankText.textContent = `${totalPoints.toLocaleString()} / ${rankData.max.toLocaleString()}`;
        
        // Apply styling based on hardcore mode
        if (isHardcore) {
            rankBarFill.style.background = "linear-gradient(90deg, #8b0000, #4a0000)";
        } else {
            rankBarFill.style.background = "linear-gradient(90deg, #4a7c59, #2a4a35)";
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
        const oldRank = this.getRankData(oldPoints, isHardcore).rank;
        const newRank = this.getRankData(newPoints, isHardcore).rank;
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
            const rankDataCurrent = this.getRankData(currentValue, isHardcore);
            rankText.textContent = `${currentValue.toLocaleString()} / ${rankDataCurrent.max.toLocaleString()}`;
            
            // Update progress bar
            let percent = 0;
            
            if (isHardcore && rankDataCurrent.rank === "ζ" && currentValue < 0) {
                percent = 0;
            } else {
                const progressInRank = currentValue - rankDataCurrent.min;
                const rankRange = rankDataCurrent.max - rankDataCurrent.min;
                if (rankRange > 0) {
                    percent = (progressInRank / rankRange) * 100;
                } else {
                    percent = 100;
                }
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

    // Get total points from SaveManager (depends on mode)
    getTotalPoints(isHardcore = false) {
        if (isHardcore) {
            return saveManager.getHardcoreTotalPoints();
        }
        return saveManager.getTotalPoints();
    },

    // Add points to total (depends on mode)
    addPoints(points, isHardcore = false) {
        if (isHardcore) {
            return saveManager.addHardcorePoints(points);
        }
        return saveManager.addPoints(points);
    },
    
    // Get old total points for animation
    getOldTotalPoints(isHardcore = false) {
        if (isHardcore) {
            return saveManager.getOldHardcoreTotalPoints();
        }
        return saveManager.getOldTotalPoints();
    },
    
    // Sync old total points
    syncOldTotalPoints(isHardcore = false) {
        if (isHardcore) {
            return saveManager.syncOldHardcoreTotalPoints();
        }
        return saveManager.syncOldTotalPoints();
    }
};

// Expose globally for ScoreboardManager to call
window.RankManager = RankManager;