// ==============================================================
// ====================== SAVE MANAGER ==========================
// ==============================================================
// Handles all localStorage operations for game configuration,
// progress saving, and automatic cleanup of old daily entries.
//
// All SaveManager-controlled keys and values are encrypted before
// being written to localStorage.
//
// Old plaintext saves are still readable and are automatically
// migrated to the encrypted format when they are saved again.
// ==============================================================

import { CryptoManager } from "./CryptoManager.js";

export class SaveManager {

    // ======================= CONSTRUCTOR =======================

    constructor() {
        this.config = null;
    }

    // ======================= STORAGE HELPERS =======================

    // Get the encrypted localStorage key for a logical key
    getStorageKey(key) {
        return CryptoManager.encryptKey(key);
    }

    // Get a value from localStorage
    // The encrypted key is checked first.
    // The plaintext key is checked second for backwards compatibility.
    getValue(key) {
        const encryptedKey = this.getStorageKey(key);
        const encryptedValue = localStorage.getItem(encryptedKey);

        if (encryptedValue !== null) {
            const decrypted = CryptoManager.decryptString(encryptedValue);

            if (decrypted !== null) {
                return decrypted;
            }

            console.warn(
                `[SaveManager] Failed to decrypt key: ${key}`
            );

            return null;
        }

        // Backwards compatibility with old unencrypted saves
        const oldValue = localStorage.getItem(key);
        return oldValue;
    }

    // Save a string value using an encrypted key and encrypted value
    setValue(key, value) {
        const encryptedKey = this.getStorageKey(key);
        const encryptedValue = CryptoManager.encryptString(value);

        localStorage.setItem(
            encryptedKey,
            encryptedValue
        );

        // Remove the old plaintext entry after successful migration
        if (encryptedKey !== key) {
            localStorage.removeItem(key);
        }
    }

    // Remove a value using both encrypted and legacy keys
    removeValue(key) {
        const encryptedKey = this.getStorageKey(key);
        localStorage.removeItem(encryptedKey);
        localStorage.removeItem(key);
    }

    // Get a JSON value
    getJSON(key, defaultValue = null) {
        const value = this.getValue(key);

        if (value === null || value === undefined) {
            return defaultValue;
        }
        try {
            return JSON.parse(value);
        } catch (error) {
            console.error(
                `[SaveManager] Failed to parse JSON for: ${key}`,
                error
            );
            return defaultValue;
        }
    }

    // Save a JSON value
    setJSON(key, value) {
        this.setValue(key, JSON.stringify(value));
    }

    // ======================= GAME CONFIGURATION =======================

    // Load game configuration from localStorage
    loadConfig() {
        const configJSON = this.getValue("gameConfig");

        if (!configJSON) {
            throw new Error("No configuration found.");
        }
        this.config = JSON.parse(configJSON);
        return this.config;
    }

    // Save game configuration to localStorage
    saveConfig(config) {
        this.setValue(
            "gameConfig",
            JSON.stringify(config)
        );

        this.config = config;
    }

    // ======================= USERNAME =======================

    // Get saved username
    getUsername() {
        return this.getValue("username") || "";
    }

    // Set username
    setUsername(name) {
        this.setValue("username", name);
    }

    // ======================= TOTAL POINTS (RANKING) =======================

    // Get total accumulated points across all games
    getTotalPoints() {
        const points = this.getValue("totalPoints");
        return points ? parseInt(points) : 0;
    }

    // Add points to total (can be negative)
    addPoints(points) {
        const current = this.getTotalPoints();
        const newTotal = current + points;

        this.setValue("totalPoints", newTotal);

        console.log(
            `[SaveManager] Points added: ${points} | Total: ${newTotal}`
        );

        return newTotal;
    }

    // Set total points directly (for debugging/reset)
    setTotalPoints(points) {
        this.setValue("totalPoints", points);

        console.log(
            `[SaveManager] Total points set to: ${points}`
        );
    }

    // Get last score from last game
    getLastScore() {
        const score = this.getValue("lastScore");
        return score ? parseInt(score) : 0;
    }

    // Set last score
    setLastScore(score) {
        this.setValue("lastScore", score);
    }

    // Get old total points (saved before starting a game)
    getOldTotalPoints() {
        const points = this.getValue("oldTotalPoints");
        return points ? parseInt(points) : 0;
    }

    // Set old total points (call this when starting a game)
    setOldTotalPoints(points) {
        this.setValue("oldTotalPoints", points);

        console.log(
            `[SaveManager] Old total points saved: ${points}`
        );
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
        const points = this.getValue("hardcoreTotalPoints");
        return points ? parseInt(points) : 0;
    }

    // Add points to hardcore total (can be negative)
    addHardcorePoints(points) {
        const current = this.getHardcoreTotalPoints();
        const newTotal = current + points;

        this.setValue("hardcoreTotalPoints", newTotal);
        console.log(
            `[SaveManager] Hardcore points added: ${points} | Total: ${newTotal}`
        );
        return newTotal;
    }

    // Set hardcore total points directly (for debugging/reset)
    setHardcoreTotalPoints(points) {
        this.setValue("hardcoreTotalPoints", points);

        console.log(
            `[SaveManager] Hardcore total points set to: ${points}`
        );
    }

    // Get old hardcore total points (for animation)
    getOldHardcoreTotalPoints() {
        const points = this.getValue("oldHardcoreTotalPoints");
        return points ? parseInt(points) : 0;
    }

    // Set old hardcore total points
    setOldHardcoreTotalPoints(points) {
        this.setValue(
            "oldHardcoreTotalPoints",
            points
        );
        console.log(
            `[SaveManager] Old hardcore total points saved: ${points}`
        );
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
        const level = this.getValue("legacy_level");
        return level ? parseInt(level) : 1;
    }

    // Set legacy level
    setLegacyLevel(level) {
        this.setValue("legacy_level", level);
        this.updateLegacyHighScore(level);
    }

    // Get legacy high score (highest level ever reached)
    getLegacyHighScore() {
        const highScore = this.getValue("legacy_highscore");
        return highScore ? parseInt(highScore) : 1;
    }

    // Update legacy high score if new level is higher
    updateLegacyHighScore(level) {
        const currentHigh = this.getLegacyHighScore();

        if (level > currentHigh) {
            this.setValue(
                "legacy_highscore",
                level
            );
            console.log(
                `[SaveManager] New legacy high score: ${level}`
            );
        }
    }

    // Clear legacy progress (when losing)
    clearLegacyProgress() {
        this.removeValue("legacy_level");
        this.setValue(
            "legacy_level",
            1
        );
    }

    // Reset legacy high score (if needed for debugging)
    resetLegacyHighScore() {
        this.removeValue("legacy_highscore");
        console.log(
            "[SaveManager] Legacy high score reset"
        );
    }

    // ======================= HARDCORE MODE PROGRESS =======================

    // Get current hardcore level
    getHardcoreLevel() {
        const level = this.getValue("hardcore_level");
        return level ? parseInt(level) : 1;
    }

    // Set hardcore level
    setHardcoreLevel(level) {
        this.setValue(
            "hardcore_level",
            level
        );
        this.updateHardcoreHighScore(level);
    }

    // Get hardcore high score (highest level ever reached)
    getHardcoreHighScore() {
        const highScore = this.getValue("hardcore_highscore");
        return highScore ? parseInt(highScore) : 1;
    }

    // Update hardcore high score if new level is higher
    updateHardcoreHighScore(level) {
        const currentHigh = this.getHardcoreHighScore();

        if (level > currentHigh) {
            this.setValue(
                "hardcore_highscore",
                level
            );

            console.log(
                `[SaveManager] New hardcore high score: ${level}`
            );
        }
    }

    // Clear hardcore progress (when losing)
    clearHardcoreProgress() {
        this.removeValue("hardcore_level");
        this.setValue(
            "hardcore_level",
            1
        );
    }

    // Reset hardcore high score (if needed for debugging)
    resetHardcoreHighScore() {
        this.removeValue("hardcore_highscore");
        console.log(
            "[SaveManager] Hardcore high score reset"
        );
    }

    // ======================= HARDCORE CHARACTER =======================

    // Get saved hardcore character
    getHardcoreCharacter() {
        return this.getValue("hardcoreCharacter") || null;
    }

    // Set hardcore character
    setHardcoreCharacter(char) {
        this.setValue(
            "hardcoreCharacter",
            char
        );
        console.log(
            "[SaveManager] Hardcore character saved:",
            char
        );
    }

    // Clear hardcore character
    clearHardcoreCharacter() {
        this.removeValue("hardcoreCharacter");
        console.log(
            "[SaveManager] Hardcore character cleared"
        );
    }

    // ======================= HARDCORE HEALTH =======================

    // Get saved hardcore health
    getHardcoreHealth() {
        const hp = this.getValue("hardcoreHealth");
        return hp ? parseInt(hp) : null;
    }

    // Set hardcore health
    setHardcoreHealth(hp) {
        this.setValue(
            "hardcoreHealth",
            hp
        );
        console.log(
            "[SaveManager] Hardcore health saved:",
            hp
        );
    }

    // Clear hardcore health
    clearHardcoreHealth() {
        this.removeValue("hardcoreHealth");
        console.log(
            "[SaveManager] Hardcore health cleared"
        );
    }

    // Clear ALL hardcore data
    clearHardcoreAll() {
        this.clearHardcoreKeychains();
        this.clearHardcoreKeychainUses();
        this.clearHardcoreCharacter();
        this.clearHardcoreHealth();

        console.log(
            "[SaveManager] All hardcore data cleared"
        );
    }

    // ======================= DAILY MODE =======================

    // Get today's date string
    getTodayString() {
        const today = new Date();
        return today.toDateString();
    }

    // Check if daily was attempted today
    isDailyAttemptedToday() {
        const today = this.getTodayString();
        const lastPlayed = this.getValue("lastDailyPlayed");
        return lastPlayed === today;
    }

    // Mark daily as completed today (no score saved)
    markDailyCompleted() {
        const today = this.getTodayString();
        this.setValue(
            "lastDailyPlayed",
            today
        );

        this.updateDailyStreak(true);
        console.log(
            "[SaveManager] Daily marked as completed for:",
            today
        );
    }

    // Mark daily as failed today (no score saved)
    markDailyFailed() {
        const today = this.getTodayString();

        this.setValue(
            "lastDailyPlayed",
            today
        );

        this.updateDailyStreak(false);
        console.log(
            "[SaveManager] Daily marked as failed for:",
            today
        );
    }

    // ======================= DAILY STREAK =======================

    // Get current daily streak (consecutive wins)
    getDailyStreak() {
        const streak = this.getValue("daily_streak");
        return streak ? parseInt(streak) : 0;
    }

    // Set daily streak
    setDailyStreak(streak) {
        this.setValue(
            "daily_streak",
            streak
        );
        console.log(
            `[SaveManager] Daily streak updated: ${streak}`
        );
    }

    // Update streak based on today's result
    updateDailyStreak(completed) {
        console.log(
            `[SaveManager] updateDailyStreak - completed: ${completed}`
        );

        if (completed === true) {
            // Won today - increase streak
            const currentStreak = this.getDailyStreak();
            const newStreak = currentStreak + 1;

            this.setDailyStreak(newStreak);

            // ===== UPDATE DAILY RECORD =====
            this.updateDailyRecord();

            console.log(
                `[SaveManager] Streak increased from ${currentStreak} to ${newStreak}`
            );

        } else if (completed === false) {
            // Lost today - reset streak to 0
            this.setDailyStreak(0);

            console.log(
                `[SaveManager] Streak reset to 0 due to loss`
            );
        }
    }

    // Get highest daily streak ever achieved
    getDailyRecord() {
        const record = this.getValue("dailyRecord");
        return record ? parseInt(record) : 0;
    }

    // Set daily record (only if higher)
    setDailyRecord(streak) {
        const current = this.getDailyRecord();

        if (streak > current) {
            this.setValue(
                "dailyRecord",
                streak
            );
            console.log(
                `[SaveManager] New daily record: ${streak}`
            );
            return true;
        }

        return false;
    }

    // Update daily record based on current streak
    updateDailyRecord() {
        const currentStreak = this.getDailyStreak();
        return this.setDailyRecord(
            currentStreak
        );
    }

    // ======================= AVATAR =======================

    // Get saved avatar ID (1-6)
    getAvatar() {
        const avatar = this.getValue("avatar");
        return avatar ? parseInt(avatar) : 1;
    }

    // Set avatar ID
    setAvatar(id) {
        this.setValue("avatar", id);
    }

    // ======================= TEST =======================

    // Check if secret code is activated
    isSecretCodeActivated(code) {
        const value = this.getValue(
            `secret_${code}`
        );
        return value === "true";
    }

    // Activate secret code
    activateSecretCode(code) {
        this.setValue(
            `secret_${code}`,
            "true"
        );
        console.log(
            `[SaveManager] Secret code activated: ${code}`
        );
    }

    // Deactivate secret code
    deactivateSecretCode(code) {
        this.removeValue(
            `secret_${code}`
        );
    }

    // Get all activated codes
    getActivatedCodes() {
        const codes = [];

        if (this.isSecretCodeActivated("back2school")) {
            codes.push("back2school");
        }

        if (this.isSecretCodeActivated("masiosare")) {
            codes.push("masiosare");
        }

        if (this.isSecretCodeActivated("debugthis")) {
            codes.push("debugthis");
        }
        return codes;
    }

    // ======================= DEBUG MODE =======================

    isDebugModeEnabled() {
        return this.getValue("debug_mode") === "true";
    }

    setDebugMode(enabled) {
        this.setValue(
            "debug_mode",
            enabled
        );
    }

    // ======================= TUTORIAL =======================

    // Check if tutorial has been completed
    isTutorialCompleted() {
        return this.getValue(
            "tutorialCompleted"
        ) === "true";
    }

    // Mark tutorial as completed
    setTutorialCompleted(completed = true) {
        this.setValue(
            "tutorialCompleted",
            completed ? "true" : "false"
        );
    }

    // Reset tutorial (so it shows again)
    resetTutorial() {
        this.removeValue(
            "tutorialCompleted"
        );
    }

    // ======================= LEGACY KEYCHAINS =======================

    // Get saved legacy keychains
    getLegacyKeychains() {
        return this.getJSON(
            "legacyKeychains",
            []
        );
    }

    // Set legacy keychains
    setLegacyKeychains(keychains) {
        this.setJSON(
            "legacyKeychains",
            keychains
        );

        console.log(
            "[SaveManager] Legacy keychains saved:",
            keychains
        );
    }

    // Clear legacy keychains (when dying)
    clearLegacyKeychains() {
        this.removeValue(
            "legacyKeychains"
        );

        console.log(
            "[SaveManager] Legacy keychains cleared"
        );
    }

    // Get saved legacy keychain uses
    getLegacyKeychainUses() {
        return this.getJSON(
            "legacyKeychainUses",
            {}
        );
    }

    // Set legacy keychain uses
    setLegacyKeychainUses(uses) {
        this.setJSON(
            "legacyKeychainUses",
            uses
        );

        console.log(
            "[SaveManager] Legacy keychain uses saved:",
            uses
        );
    }

    // Clear legacy keychain uses (when dying)
    clearLegacyKeychainUses() {
        this.removeValue(
            "legacyKeychainUses"
        );

        console.log(
            "[SaveManager] Legacy keychain uses cleared"
        );
    }

    // ======================= STUFFED KEYCHAINS =======================

    // Get saved legacy stuffed keychains
    getLegacyStuffedKeychains() {
        return this.getJSON(
            "legacyStuffedKeychains",
            []
        );
    }

    // Set legacy stuffed keychains
    setLegacyStuffedKeychains(keychains) {
        this.setJSON(
            "legacyStuffedKeychains",
            keychains
        );
        console.log(
            "[SaveManager] Legacy stuffed keychains saved:",
            keychains
        );
    }

    // Clear legacy stuffed keychains
    clearLegacyStuffedKeychains() {
        this.removeValue(
            "legacyStuffedKeychains"
        );
        console.log(
            "[SaveManager] Legacy stuffed keychains cleared"
        );
    }

    // Get hardcore stuffed keychains
    getHardcoreStuffedKeychains() {
        return this.getJSON(
            "hardcoreStuffedKeychains",
            []
        );
    }

    // Set hardcore stuffed keychains
    setHardcoreStuffedKeychains(keychains) {
        this.setJSON(
            "hardcoreStuffedKeychains",
            keychains
        );
        console.log(
            "[SaveManager] Hardcore stuffed keychains saved:",
            keychains
        );
    }

    // Clear hardcore stuffed keychains
    clearHardcoreStuffedKeychains() {
        this.removeValue(
            "hardcoreStuffedKeychains"
        );
        console.log(
            "[SaveManager] Hardcore stuffed keychains cleared"
        );
    }

    // ======================= HARDCORE KEYCHAINS =======================

    // Get saved hardcore keychains
    getHardcoreKeychains() {
        return this.getJSON(
            "hardcoreKeychains",
            []
        );
    }

    // Set hardcore keychains
    setHardcoreKeychains(keychains) {
        this.setJSON(
            "hardcoreKeychains",
            keychains
        );

        console.log(
            "[SaveManager] Hardcore keychains saved:",
            keychains
        );
    }

    // Clear hardcore keychains (when dying or winning)
    clearHardcoreKeychains() {
        this.removeValue(
            "hardcoreKeychains"
        );

        console.log(
            "[SaveManager] Hardcore keychains cleared"
        );
    }

    // Get saved hardcore keychain uses
    getHardcoreKeychainUses() {
        return this.getJSON(
            "hardcoreKeychainUses",
            {}
        );
    }

    // Set hardcore keychain uses
    setHardcoreKeychainUses(uses) {
        this.setJSON(
            "hardcoreKeychainUses",
            uses
        );

        console.log(
            "[SaveManager] Hardcore keychain uses saved:",
            uses
        );
    }

    // Clear hardcore keychain uses
    clearHardcoreKeychainUses() {
        this.removeValue(
            "hardcoreKeychainUses"
        );

        console.log(
            "[SaveManager] Hardcore keychain uses cleared"
        );
    }

    // ======================= CUSTOM KEYCHAINS =======================

    // Get saved custom keychains
    getCustomKeychains() {
        return this.getJSON(
            "customKeychains",
            []
        );
    }

    // Set custom keychains
    setCustomKeychains(keychains) {
        this.setJSON(
            "customKeychains",
            keychains
        );

        console.log(
            "[SaveManager] Custom keychains saved:",
            keychains
        );
    }

    // ======================= SETTINGS =======================

    // Get saved language preference
    getLanguage() {
        return this.getValue(
            "language"
        ) || "en";
    }

    // Set language preference
    setLanguage(lang) {
        this.setValue(
            "language",
            lang
        );
    }

    // Get SFX enabled state
    isSFXEnabled() {
        const value = this.getValue(
            "sfxEnabled"
        );

        return value !== null
            ? value === "true"
            : true;
    }

    // Set SFX enabled state
    setSFXEnabled(enabled) {
        this.setValue(
            "sfxEnabled",
            enabled
        );
    }

    // Get music volume (0-100)
    getMusicVolume() {
        const volume = this.getValue(
            "musicVolume"
        );

        return volume !== null
            ? parseInt(volume)
            : 50;
    }

    // Set music volume
    setMusicVolume(volume) {
        this.setValue(
            "musicVolume",
            Math.min(
                100,
                Math.max(0, volume)
            )
        );
    }

    // Get SFX volume (0-100)
    getSFXVolume() {
        const volume = this.getValue(
            "sfxVolume"
        );
        return volume !== null
            ? parseInt(volume)
            : 50;
    }

    // Set SFX volume
    setSFXVolume(volume) {
        this.setValue(
            "sfxVolume",
            Math.min(
                100,
                Math.max(0, volume)
            )
        );
    }

    // ======================= TOUCH BUTTONS =======================

    // Get touch button setting
    getTouchEnabled() {
        const value = this.getValue(
            "touchEnabled"
        );
        return value !== null
            ? value === "true"
            : true;
    }

    // Set touch button setting
    setTouchEnabled(enabled) {
        this.setValue(
            "touchEnabled",
            enabled
        );
    }

    // ======================= FALL DAMAGE =======================

    // Get fall damage setting
    isFallDamageEnabled() {
        const value = this.getValue(
            "fallDamageEnabled"
        );

        return value !== null
            ? value === "true"
            : false;
    }

    // Set fall damage setting
    setFallDamageEnabled(enabled) {
        this.setValue(
            "fallDamageEnabled",
            enabled
        );
    }

    // ======================= HARDCORE =======================

    // Get hardcore mode setting
    isHardcoreEnabled() {
        const value = this.getValue(
            "hardcoreEnabled"
        );

        return value !== null
            ? value === "true"
            : false;
    }

    // Set hardcore mode setting
    setHardcoreEnabled(enabled) {
        this.setValue(
            "hardcoreEnabled",
            enabled
        );
    }

    // ======================= UTILITY =======================

    // Clear EVERYTHING - nuclear option
    clearAllGameData() {
        localStorage.clear();

        console.log(
            "[SaveManager] Complete localStorage wipe executed"
        );
    }

    // Get total size of localStorage (for debugging)
    getStorageSize() {
        let total = 0;

        for (
            let i = 0;
            i < localStorage.length;
            i++
        ) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);

            total += key.length + value.length;
        }
        return total;
    }

    // Log all stored keys (for debugging)
    logAllKeys() {
        console.log(
            "=== localStorage contents ==="
        );

        for (
            let i = 0;
            i < localStorage.length;
            i++
        ) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);

            console.log(
                `${key}: ${value}`
            );
        }

        console.log(
            `Total size: ~${Math.round(
                this.getStorageSize() / 1024
            )} KB`
        );
    }
}