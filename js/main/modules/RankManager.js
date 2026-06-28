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
    { rank: "F-", min: 0, max: 200000, next: 200000 },
    { rank: "F", min: 200001, max: 500000, next: 500000 },
    { rank: "F+", min: 500001, max: 900000, next: 900000 },
    { rank: "E-", min: 900001, max: 1400000, next: 1400000 },
    { rank: "E", min: 1400001, max: 2000000, next: 2000000 },
    { rank: "E+", min: 2000001, max: 2700000, next: 2700000 },
    { rank: "D-", min: 2700001, max: 3500000, next: 3500000 },
    { rank: "D", min: 3500001, max: 4600000, next: 4600000 },
    { rank: "D+", min: 4600001, max: 6000000, next: 6000000 },
    { rank: "C-", min: 6000001, max: 7700000, next: 7700000 },
    { rank: "C", min: 7700001, max: 9700000, next: 9700000 },
    { rank: "C+", min: 9700001, max: 12000000, next: 12000000 },
    { rank: "B-", min: 12000001, max: 14600000, next: 14600000 },
    { rank: "B", min: 14600001, max: 17500000, next: 17500000 },
    { rank: "B+", min: 17500001, max: 20700000, next: 20700000 },
    { rank: "A-", min: 20700001, max: 24200000, next: 24200000 },
    { rank: "A", min: 24200001, max: 28000000, next: 28000000 },
    { rank: "A+", min: 28000001, max: 32100000, next: 32100000 },
    { rank: "S-", min: 32100001, max: 36500000, next: 36500000 },
    { rank: "S", min: 36500001, max: 50000000, next: 50000000 },
    { rank: "S+", min: 50000001, max: Infinity, next: 50000001 }
];

// ==================== HARDCORE RANKS (Greek letters) ====================

const HARDCORE_RANKS = [
    { rank: "ζ", min: 0, max: 500000, next: 500000 },      // Zeta
    { rank: "ε", min: 500001, max: 1000000, next: 1000000 },        // Epsilon
    { rank: "δ", min: 1000001, max: 2000000, next: 2000000 },      // Delta
    { rank: "γ", min: 2000001, max: 3500000, next: 3500000 },     // Gamma
    { rank: "β", min: 3500001, max: 5000000, next: 5000000 },   // Beta
    { rank: "Ω", min: 5000001, max: Infinity, next: 5000001 }    // Omega
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