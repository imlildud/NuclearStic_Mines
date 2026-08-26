// ==============================================================
// ==================== DISCORD RPC =============================
// ==============================================================
// Handles Discord Rich Presence integration

// ==============================================================
// ==================== PRESENCE UPDATE =========================
// ==============================================================

// Update Discord Rich Presence with game state
export function updateDiscordPresence(details, state, extra = {}) {
    if (typeof window !== "undefined" && window.discordRPC) {
        window.discordRPC.update(details, state, extra);
        return true;
    }
    console.warn("[RPC] Discord bridge unavailable");
    return false;
}

// Check if Discord RPC is ready
export function isDiscordReady() {
    return typeof window !== "undefined" && window.discordRPC !== undefined;
}

// Reset the Discord activity timer
export function resetDiscordTimestamp() {
    if (typeof window !== "undefined" && window.discordRPC) {
        window.discordRPC.resetTimestamp();
    }
}

// ==============================================================
// ==================== FORMATTING HELPERS ======================
// ==============================================================

// Capitalize character name
function formatCharacter(name) {
    if (!name) return "Unknown";
    return name.charAt(0).toUpperCase() + name.slice(1);
}

// Get emoji for character
function getCharacterEmoji(character) {
    const emojis = {
        chef: "👨‍🍳",
        mosquito: "🦟",
        mommy: "🛡️",
        scout: "🏔️"
    };
    return emojis[character?.toLowerCase()] || "🎮";
}

// Get display name for hazard intensity
function getHazardName(value) {
    if (value <= 2) return "Low";
    if (value <= 7) return "Medium";
    if (value <= 11) return "High";
    if (value <= 17) return "Xtrahigh";
    if (value <= 20) return "Ultrahigh";
    return "Insanely High";
}

// Get display name for obstacle intensity
function getObstacleName(value) {
    if (value <= 2) return "Low";
    if (value <= 4) return "Medium";
    if (value <= 9) return "High";
    if (value <= 14) return "Xtrahigh";
    if (value <= 19) return "Ultrahigh";
    return "Insanely High";
}

// ==============================================================
// ==================== BUILD PRESENCE ==========================
// ==============================================================

// Build Discord presence based on game mode and config
export function buildDiscordPresence(gameConfig) {
    const mode = gameConfig.mode || "menu";
    const isLegacy = mode === "legacy" || mode === "hardcore";
    const seed = gameConfig.seed || "---";
    
    // Menu: simple presence
    if (mode === "menu") {
        return {
            details: "In the menu",
            state: "Preparing for adventure",
            largeImageKey: "nuclearstic_logo"
        };
    }

    // Tutorial mode
    if (mode === "tutorial") {
        return {
            details: "📚 Learning the ropes",
            state: "Playing the tutorial",
            largeImageKey: "nuclearstic_logo"
        };
    }

    // Test mode
    if (mode === "test") {
        return {
            details: "🧪 Testing mode",
            state: "Debugging the game",
            largeImageKey: "nuclearstic_logo"
        };
    }
    
    // Legacy / Hardcore: show level
    if (isLegacy) {
        const level = gameConfig.level || 1;
        const modeDisplay = mode === "hardcore" ? "Hardcore" : "Legacy";
        const charEmoji = getCharacterEmoji(gameConfig.character);
        const charName = formatCharacter(gameConfig.character);
        
        return {
            details: `${modeDisplay} - Level ${level}`,
            state: `${charEmoji} ${charName} 🌱 ${seed}`,
            largeImageKey: gameConfig.zone || "desert"
        };
    }
    
    // Daily / Custom: show mode name
    const modeDisplay = mode === "daily" ? "Daily" : "Custom";
    const charEmoji = getCharacterEmoji(gameConfig.character);
    const charName = formatCharacter(gameConfig.character);
    
    return {
        details: `${modeDisplay} Mission`,
        state: `${charEmoji} ${charName} 🗺️ ${gameConfig.size}x${gameConfig.size} ☢️ ${getHazardName(gameConfig.hazards)} 🧱 ${getObstacleName(gameConfig.obstacles)} 🎯 ${gameConfig.pals} 🌱 ${seed}`,
        largeImageKey: gameConfig.zone || "desert"
    };
}

export function buildIdCardPresence(username, totalPoints, isHardcore, legacyRecord, dailyStreak, hardcoreRecord) {
    // Get rank data
    const rankData = getRankDataForDisplay(totalPoints, isHardcore);
    
    // Truncate username if too long
    const displayName = username.length > 15 ? username.slice(0, 15) + "..." : username;
    
    return {
        details: `🪪 ${displayName}'s ID Card`,
        state: `🏅Rank ${rankData.rank} 🏆 ${legacyRecord} 🔥 ${dailyStreak} 😈 ${hardcoreRecord}`,
        largeImageKey: "nuclearstic_logo"
    };
}

// Helper to get rank data (copied from RankManager logic)
function getRankDataForDisplay(points, isHardcore) {
    const NORMAL_RANKS = [
        { rank: "F-", min: 0, max: 200000 },
        { rank: "F", min: 200001, max: 500000 },
        { rank: "F+", min: 500001, max: 900000 },
        { rank: "E-", min: 900001, max: 1400000 },
        { rank: "E", min: 1400001, max: 2000000 },
        { rank: "E+", min: 2000001, max: 2700000 },
        { rank: "D-", min: 2700001, max: 3500000 },
        { rank: "D", min: 3500001, max: 4600000 },
        { rank: "D+", min: 4600001, max: 6000000 },
        { rank: "C-", min: 6000001, max: 7700000 },
        { rank: "C", min: 7700001, max: 9700000 },
        { rank: "C+", min: 9700001, max: 12000000 },
        { rank: "B-", min: 12000001, max: 14600000 },
        { rank: "B", min: 14600001, max: 17500000 },
        { rank: "B+", min: 17500001, max: 20700000 },
        { rank: "A-", min: 20700001, max: 24200000 },
        { rank: "A", min: 24200001, max: 28000000 },
        { rank: "A+", min: 28000001, max: 32100000 },
        { rank: "S-", min: 32100001, max: 36500000 },
        { rank: "S", min: 36500001, max: 50000000 },
        { rank: "S+", min: 50000001, max: Infinity }
    ];

    const HARDCORE_RANKS = [
        { rank: "ζ", min: 0, max: 500000 },
        { rank: "ε", min: 500001, max: 1000000 },
        { rank: "δ", min: 1000001, max: 2000000 },
        { rank: "γ", min: 2000001, max: 3500000 },
        { rank: "β", min: 3500001, max: 5000000 },
        { rank: "Ω", min: 5000001, max: Infinity }
    ];

    const ranks = isHardcore ? HARDCORE_RANKS : NORMAL_RANKS;
    
    for (const r of ranks) {
        if (points >= r.min && points <= r.max) {
            return r;
        }
    }
    
    return isHardcore ? { rank: "ζ" } : { rank: "F-" };
}

// ==============================================================
// ==================== EXPORTS =================================
// ==============================================================

export {
    formatCharacter,
    getCharacterEmoji,
    getHazardName,
    getObstacleName
};