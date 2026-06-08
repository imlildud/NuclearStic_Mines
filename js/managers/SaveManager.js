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
    cleanupOldDailyEntries(maxDays = 1) {
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
        
    // ======================= UTILITY =======================
    
    // Clear all game data (but preserve settings if needed)
    clearAllGameData(preserveSettings = true) {
        const settings = preserveSettings ? {
            language: this.getLanguage(),
            sfxEnabled: this.isSFXEnabled(),
            musicVolume: this.getMusicVolume(),
            sfxVolume: this.getSFXVolume()
        } : null;
        
        // Clear all keys related to game data
        localStorage.removeItem("gameConfig");
        localStorage.removeItem("legacy_level");
        localStorage.removeItem("legacy_highscore");
        localStorage.removeItem("tutorialCompleted");
        
        // Clean up all daily entries
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key.startsWith("daily_completed_") || key.startsWith("daily_score_")) {
                localStorage.removeItem(key);
            }
        }
        
        // Restore settings if needed
        if (settings) {
            this.setLanguage(settings.language);
            this.setSFXEnabled(settings.sfxEnabled);
            this.setMusicVolume(settings.musicVolume);
            this.setSFXVolume(settings.sfxVolume);
        }
        
        console.log("[SaveManager] All game data cleared");
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