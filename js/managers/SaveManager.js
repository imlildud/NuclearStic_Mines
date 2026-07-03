// ==============================================================
// ====================== SAVE MANAGER ==========================
// ==============================================================
// Handles all localStorage operations for game configuration,
// progress saving, and automatic cleanup of old daily entries.

export class SaveManager {
    
    // ======================= CONSTRUCTOR =======================
    
    constructor() {
        this.config = null;
    }
    
    // ======================= GAME CONFIGURATION =======================
    
    // Load game configuration from localStorage
    loadConfig() {
        const configJSON = localStorage.getItem("gameConfig");
        if (!configJSON) {
            throw new Error("No configuration found.");
        }
        this.config = JSON.parse(configJSON);
        return this.config;
    }
    
    // Save game configuration to localStorage
    saveConfig(config) {
        localStorage.setItem('gameConfig', JSON.stringify(config));
        this.config = config;
    }

    // ======================= USERNAME =======================

    // Get saved username
    getUsername() {
        return localStorage.getItem("username") || "";
    }

    // Set username
    setUsername(name) {
        localStorage.setItem("username", name);
    }

    // ======================= TOTAL POINTS (RANKING) =======================

    // Get total accumulated points across all games
    getTotalPoints() {
        const points = localStorage.getItem("totalPoints");
        return points ? parseInt(points) : 0;
    }

    // Add points to total (can be negative)
    addPoints(points) {
        const current = this.getTotalPoints();
        const newTotal = current + points;
        localStorage.setItem("totalPoints", newTotal);
        console.log(`[SaveManager] Points added: ${points} | Total: ${newTotal}`);
        return newTotal;
    }

    // Set total points directly (for debugging/reset)
    setTotalPoints(points) {
        localStorage.setItem("totalPoints", points);
        console.log(`[SaveManager] Total points set to: ${points}`);
    }

    // Get last score from last game
    getLastScore() {
        const score = localStorage.getItem("lastScore");
        return score ? parseInt(score) : 0;
    }

    // Set last score
    setLastScore(score) {
        localStorage.setItem("lastScore", score);
    }

    // Get old total points (saved before starting a game)
    getOldTotalPoints() {
        const points = localStorage.getItem("oldTotalPoints");
        return points ? parseInt(points) : 0;
    }

    // Set old total points (call this when starting a game)
    setOldTotalPoints(points) {
        localStorage.setItem("oldTotalPoints", points);
        console.log(`[SaveManager] Old total points saved: ${points}`);
    }

    // Sync old total points with current total points (called when game starts)
    syncOldTotalPoints() {
        const current = this.getTotalPoints();
        this.setOldTotalPoints(current);
        return current;
    }

    // ======================= HARDCORE TOTAL POINTS =======================

    // Get hardcore total accumulated points
    getHardcoreTotalPoints() {
        const points = localStorage.getItem("hardcoreTotalPoints");
        return points ? parseInt(points) : 0;
    }

    // Add points to hardcore total (can be negative)
    addHardcorePoints(points) {
        const current = this.getHardcoreTotalPoints();
        const newTotal = current + points;
        localStorage.setItem("hardcoreTotalPoints", newTotal);
        console.log(`[SaveManager] Hardcore points added: ${points} | Total: ${newTotal}`);
        return newTotal;
    }

    // Set hardcore total points directly (for debugging/reset)
    setHardcoreTotalPoints(points) {
        localStorage.setItem("hardcoreTotalPoints", points);
        console.log(`[SaveManager] Hardcore total points set to: ${points}`);
    }

    // Get old hardcore total points (for animation)
    getOldHardcoreTotalPoints() {
        const points = localStorage.getItem("oldHardcoreTotalPoints");
        return points ? parseInt(points) : 0;
    }

    // Set old hardcore total points
    setOldHardcoreTotalPoints(points) {
        localStorage.setItem("oldHardcoreTotalPoints", points);
        console.log(`[SaveManager] Old hardcore total points saved: ${points}`);
    }

    // Sync old hardcore total points with current
    syncOldHardcoreTotalPoints() {
        const current = this.getHardcoreTotalPoints();
        this.setOldHardcoreTotalPoints(current);
        return current;
    }
        
    // ======================= LEGACY MODE PROGRESS =======================
    
    // Get current legacy level
    getLegacyLevel() {
        const level = localStorage.getItem("legacy_level");
        return level ? parseInt(level) : 1;
    }
    
    // Set legacy level
    setLegacyLevel(level) {
        localStorage.setItem("legacy_level", level);
        this.updateLegacyHighScore(level);
    }
    
    // Get legacy high score (highest level ever reached)
    getLegacyHighScore() {
        const highScore = localStorage.getItem("legacy_highscore");
        return highScore ? parseInt(highScore) : 1;
    }
    
    // Update legacy high score if new level is higher
    updateLegacyHighScore(level) {
        const currentHigh = this.getLegacyHighScore();
        if (level > currentHigh) {
            localStorage.setItem("legacy_highscore", level);
            console.log(`[SaveManager] New legacy high score: ${level}`);
        }
    }
    
    // Clear legacy progress (when losing)
    clearLegacyProgress() {
        localStorage.removeItem("legacy_level");
        localStorage.setItem("legacy_level", 1);
    }
    
    // Reset legacy high score (if needed for debugging)
    resetLegacyHighScore() {
        localStorage.removeItem("legacy_highscore");
        console.log("[SaveManager] Legacy high score reset");
    }

    // ======================= HARDCORE MODE PROGRESS =======================
    
    // Get current hardcore level
    getHardcoreLevel() {
        const level = localStorage.getItem("hardcore_level");
        return level ? parseInt(level) : 1;
    }
    
    // Set hardcore level
    setHardcoreLevel(level) {
        localStorage.setItem("hardcore_level", level);
        this.updateHardcoreHighScore(level);
    }
    
    // Get hardcore high score (highest level ever reached)
    getHardcoreHighScore() {
        const highScore = localStorage.getItem("hardcore_highscore");
        return highScore ? parseInt(highScore) : 1;
    }
    
    // Update hardcore high score if new level is higher
    updateHardcoreHighScore(level) {
        const currentHigh = this.getHardcoreHighScore();
        if (level > currentHigh) {
            localStorage.setItem("hardcore_highscore", level);
            console.log(`[SaveManager] New hardcore high score: ${level}`);
        }
    }
    
    // Clear hardcore progress (when losing)
    clearHardcoreProgress() {
        localStorage.removeItem("hardcore_level");
        localStorage.setItem("hardcore_level", 1);
    }
    
    // Reset legacy high score (if needed for debugging)
    resetHardcoreHighScore() {
        localStorage.removeItem("hardcore_highscore");
        console.log("[SaveManager] Hardcore high score reset");
    }
    
    // ======================= DAILY MODE =======================

    // Get today's date string (consistent with existing keys)
    getTodayString() {
        const today = new Date();
        return today.toDateString();
    }

    // Get date string for a specific date
    getDateString(date) {
        return date.toDateString();
    }

    // Check if daily was completed today
    isDailyCompletedToday() {
        const today = this.getTodayString();
        const completed = localStorage.getItem(`daily_completed_${today}`);
        console.log(`[SaveManager] Checking daily for ${today}: ${completed}`);
        return completed === "true";
    }

    // Check if daily was attempted today (even if failed)
    isDailyAttemptedToday() {
        const today = this.getTodayString();
        const completed = localStorage.getItem(`daily_completed_${today}`);
        return completed === "true" || completed === "failed";
    }

    // Save daily score for today
    saveDailyScore(score, completed = true) {
        const today = this.getTodayString();
        localStorage.setItem(`daily_completed_${today}`, completed ? "true" : "failed");
        localStorage.setItem(`daily_score_${today}`, score.toString());
        console.log(`[SaveManager] Daily saved for ${today}: score=${score}, completed=${completed}`);
        
        this.updateDailyStreak(completed);
    }

    // ======================= DAILY STREAK =======================

    // Get current daily streak (consecutive wins)
    getDailyStreak() {
        const streak = localStorage.getItem("daily_streak");
        return streak ? parseInt(streak) : 0;
    }

    // Set daily streak
    setDailyStreak(streak) {
        localStorage.setItem("daily_streak", streak);
        console.log(`[SaveManager] Daily streak updated: ${streak}`);
    }

    // Update streak based on today's result
    updateDailyStreak(completed) {
        console.log(`[SaveManager] updateDailyStreak - completed: ${completed}`);
        
        if (completed === true) {
            // Won today - increase streak
            const currentStreak = this.getDailyStreak();
            const newStreak = currentStreak + 1;
            this.setDailyStreak(newStreak);
            console.log(`[SaveManager] Streak increased from ${currentStreak} to ${newStreak}`);
        } else if (completed === false) {
            // Lost today - reset streak to 0
            this.setDailyStreak(0);
            console.log(`[SaveManager] Streak reset to 0 due to loss`);
        }
    }

    // ======================= AVATAR =======================

    // Get saved avatar ID (1-6)
    getAvatar() {
        const avatar = localStorage.getItem("avatar");
        return avatar ? parseInt(avatar) : 1;
    }

    // Set avatar ID
    setAvatar(id) {
        localStorage.setItem("avatar", id);
    }

    // ======================= TEST =======================

    // Check if secret code is activated
    isSecretCodeActivated(code) {
        const value = localStorage.getItem(`secret_${code}`);
        return value === "true";
    }

    // Activate secret code
    activateSecretCode(code) {
        localStorage.setItem(`secret_${code}`, "true");
        console.log(`[SaveManager] Secret code activated: ${code}`);
    }

    // Deactivate secret code
    deactivateSecretCode(code) {
        localStorage.removeItem(`secret_${code}`);
    }

    // Get all activated codes
    getActivatedCodes() {
        const codes = [];
        if (this.isSecretCodeActivated('back2school')) codes.push('back2school');
        if (this.isSecretCodeActivated('masiosare')) codes.push('masiosare');
        if (this.isSecretCodeActivated('debugthis')) codes.push('debugthis');
        return codes;
    }

    // ======================= DEBUG MODE =======================

    isDebugModeEnabled() {
        return localStorage.getItem("debug_mode") === "true";
    }

    setDebugMode(enabled) {
        localStorage.setItem("debug_mode", enabled);
    }
    
    // ======================= DAILY CLEANUP =======================
    
    // Remove old daily entries
    cleanupOldDailyEntries(maxDays = 7) {
        const keys = Object.keys(localStorage);
        const now = new Date();
        let removedCount = 0;
        
        for (const key of keys) {
            // Check if key is a daily entry (daily_completed_ or daily_score_)
            if (key.startsWith("daily_completed_") || key.startsWith("daily_score_")) {
                // Extract date from key (format: daily_completed_2025-1-15)
                const dateStr = key.replace(/^(daily_completed_|daily_score_)/, '');
                const [year, month, day] = dateStr.split('-').map(Number);
                const entryDate = new Date(year, month - 1, day);
                
                // Calculate days difference
                const daysDiff = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
                
                if (daysDiff > maxDays) {
                    localStorage.removeItem(key);
                    removedCount++;
                }
            }
        }
        
        if (removedCount > 0) {
            console.log(`[SaveManager] Cleaned up ${removedCount} old daily entries`);
        }
    }
    
    // Remove daily entries older than specific date
    cleanupDailyBeforeDate(date) {
        const keys = Object.keys(localStorage);
        let removedCount = 0;
        
        for (const key of keys) {
            if (key.startsWith("daily_completed_") || key.startsWith("daily_score_")) {
                const dateStr = key.replace(/^(daily_completed_|daily_score_)/, '');
                const [year, month, day] = dateStr.split('-').map(Number);
                const entryDate = new Date(year, month - 1, day);
                
                if (entryDate < date) {
                    localStorage.removeItem(key);
                    removedCount++;
                }
            }
        }
        
        if (removedCount > 0) {
            console.log(`[SaveManager] Cleaned up ${removedCount} daily entries before ${date.toDateString()}`);
        }
    }
    
    // ======================= TUTORIAL =======================
    
    // Check if tutorial has been completed
    isTutorialCompleted() {
        return localStorage.getItem("tutorialCompleted") === "true";
    }
    
    // Mark tutorial as completed
    setTutorialCompleted(completed = true) {
        localStorage.setItem("tutorialCompleted", completed ? "true" : "false");
    }
    
    // Reset tutorial (so it shows again)
    resetTutorial() {
        localStorage.removeItem("tutorialCompleted");
    }

    // ======================= LEGACY KEYCHAINS =======================

    // Get saved legacy keychains
    getLegacyKeychains() {
        const data = localStorage.getItem("legacyKeychains");
        return data ? JSON.parse(data) : [];
    }

    // Set legacy keychains
    setLegacyKeychains(keychains) {
        localStorage.setItem("legacyKeychains", JSON.stringify(keychains));
        console.log("[SaveManager] Legacy keychains saved:", keychains);
    }

    // Clear legacy keychains (when dying)
    clearLegacyKeychains() {
        localStorage.removeItem("legacyKeychains");
        console.log("[SaveManager] Legacy keychains cleared");
    }

    // Get saved legacy keychain uses
    getLegacyKeychainUses() {
        const data = localStorage.getItem("legacyKeychainUses");
        return data ? JSON.parse(data) : {};
    }

    // Set legacy keychain uses
    setLegacyKeychainUses(uses) {
        localStorage.setItem("legacyKeychainUses", JSON.stringify(uses));
        console.log("[SaveManager] Legacy keychain uses saved:", uses);
    }

    // Clear legacy keychain uses (when dying)
    clearLegacyKeychainUses() {
        localStorage.removeItem("legacyKeychainUses");
        console.log("[SaveManager] Legacy keychain uses cleared");
    }

    // ======================= CUSTOM KEYCHAINS =======================

    // Get saved custom keychains
    getCustomKeychains() {
        const data = localStorage.getItem("customKeychains");
        return data ? JSON.parse(data) : [];
    }

    // Set custom keychains
    setCustomKeychains(keychains) {
        localStorage.setItem("customKeychains", JSON.stringify(keychains));
        console.log("[SaveManager] Custom keychains saved:", keychains);
    }
    
    // ======================= SETTINGS =======================
    
    // Get saved language preference
    getLanguage() {
        return localStorage.getItem("language") || "en";
    }
    
    // Set language preference
    setLanguage(lang) {
        localStorage.setItem("language", lang);
    }
    
    // Get SFX enabled state
    isSFXEnabled() {
        const value = localStorage.getItem("sfxEnabled");
        return value !== null ? value === "true" : true;
    }
    
    // Set SFX enabled state
    setSFXEnabled(enabled) {
        localStorage.setItem("sfxEnabled", enabled);
    }
    
    // Get music volume (0-100)
    getMusicVolume() {
        const volume = localStorage.getItem("musicVolume");
        return volume !== null ? parseInt(volume) : 50;
    }
    
    // Set music volume
    setMusicVolume(volume) {
        localStorage.setItem("musicVolume", Math.min(100, Math.max(0, volume)));
    }
    
    // Get SFX volume (0-100)
    getSFXVolume() {
        const volume = localStorage.getItem("sfxVolume");
        return volume !== null ? parseInt(volume) : 50;
    }
    
    // Set SFX volume
    setSFXVolume(volume) {
        localStorage.setItem("sfxVolume", Math.min(100, Math.max(0, volume)));
    }

    // ======================= TOUCH BUTTONS =======================

    getTouchEnabled() {
        const value = localStorage.getItem("touchEnabled");
        return value !== null ? value === "true" : true;
    }

    setTouchEnabled(enabled) {
        localStorage.setItem("touchEnabled", enabled);
    }

    // ======================= FALL DAMAGE =======================

    isFallDamageEnabled() {
        const value = localStorage.getItem("fallDamageEnabled");
        return value !== null ? value === "true" : false;
    }

    setFallDamageEnabled(enabled) {
        localStorage.setItem("fallDamageEnabled", enabled);
    }

    // ======================= HARDCORE =======================

    isHardcoreEnabled() {
        const value = localStorage.getItem("hardcoreEnabled");
        return value !== null ? value === "true" : false;
    }

    setHardcoreEnabled(enabled) {
        localStorage.setItem("hardcoreEnabled", enabled);
    }
        
    // ======================= UTILITY =======================
    
    // Clear EVERYTHING - nuclear option
    clearAllGameData() {
        localStorage.clear();
        console.log("[SaveManager] Complete localStorage wipe executed");
    }
    
    // Get total size of localStorage (for debugging)
    getStorageSize() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            total += key.length + value.length;
        }
        return total;
    }
    
    // Log all stored keys (for debugging)
    logAllKeys() {
        console.log("=== localStorage contents ===");
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            console.log(`${key}: ${value}`);
        }
        console.log(`Total size: ~${Math.round(this.getStorageSize() / 1024)} KB`);
    }
}