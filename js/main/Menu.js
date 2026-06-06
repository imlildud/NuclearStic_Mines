/* ========================================================= */
/* ========================= MENU ========================== */
/* ========================================================= */
// Main menu controller. Handles mode selection (Legacy/Daily/Custom),
// punchcard configuration, music/sfx, and game launch.

import { SaveManager } from "../managers/SaveManager.js";
import { AudioManager } from "../managers/AudioManager.js";

// ==============================================================
// ====================== GLOBAL STATE ==========================
// ==============================================================

let punchcardMode = null;
let dailyConfig = null;
let currentConfig = null;

// ==================== MANAGERS ====================
const saveManager = new SaveManager();
const audioManager = new AudioManager();

// ==============================================================
// ==================== WELCOME SCREEN LOGIC ====================
// ==============================================================

function initWelcomeScreen() {
    const welcomeScreen = document.getElementById("welcome-screen");
    const mainMenu = document.querySelector(".overlay");  // ✅ usar clase .overlay
    const yesBtn = document.getElementById("welcome-yes");
    const noBtn = document.getElementById("welcome-no");
    
    // Check if tutorial was already completed
    const tutorialCompleted = saveManager.isTutorialCompleted();  // ✅ declarar const
    
    if (tutorialCompleted) {
        // Already completed, show main menu directly
        if (welcomeScreen) welcomeScreen.style.display = "none";
        if (mainMenu) mainMenu.style.display = "flex";
        return;
    }
    
    // First time, show welcome screen
    if (welcomeScreen) welcomeScreen.style.display = "flex";
    if (mainMenu) mainMenu.style.display = "none";
    
    // Yep button - start tutorial
    if (yesBtn) {
        yesBtn.addEventListener("click", () => {
            // Save that tutorial was started (not completed yet)
            saveManager.setTutorialCompleted(false);
            
            // Create tutorial config
            const config = {
                mode: "tutorial",
                seed: null,
                level: 1,
                character: "student",
                size: 5,
                hazards: 1,
                obstacles: 1,
                goals: 1,
                zone: "backyard"
            };
            
            // Save config and go to game
            saveManager.saveConfig(config);
            window.location.href = "../../pages/game.html";
        });
    }
    
    // No ty button - skip tutorial
    if (noBtn) {
        noBtn.addEventListener("click", () => {
            // Mark tutorial as completed (skipped)
            saveManager.setTutorialCompleted(true);
            
            // Hide welcome, show main menu
            if (welcomeScreen) welcomeScreen.style.display = "none";
            if (mainMenu) mainMenu.style.display = "flex";
        });
    }
}

// ==============================================================
// ====================== DOM EVENT LISTENERS ===================
// ==============================================================

document.addEventListener("DOMContentLoaded", () => {

    // Initialize welcome screen
    initWelcomeScreen();

    const legacyButton = document.querySelector('.legacy-button');
    const dailyButton = document.querySelector('.daily-button');
    const customButton = document.querySelector('.custom-button');
    const punchcardScreen = document.getElementById('punchcard-screen');
    const closeButton = document.querySelector('.pc-close');
    const startButton = document.querySelector('.pc-start');

    // ----- Legacy Mode Button -----
    legacyButton.addEventListener('click', () => {
        punchcardMode = "legacy";
        punchcardScreen.classList.add('active');
        generateLegacyConfig();
        updatePunchcardScale();
    });

    // ----- Daily Mode Button (usando SaveManager) -----
    dailyButton.addEventListener('click', () => {
        if (saveManager.isDailyAttemptedToday()) {
            alert("Daily mission already completed today! Come back tomorrow.");
            return;
        }

        punchcardMode = "daily";
        punchcardScreen.classList.add('active');
        generateDailyConfig();
        updatePunchcardScale();
    });

    // ----- Custom Mode Button -----
    customButton.addEventListener("click", () => {
        punchcardMode = "custom";
        punchcardScreen.classList.add('active');
        generateCustomConfig();
        updatePunchcardScale();
    });

    // Legacy character select
    document.getElementById("legacy-character-select")
        .addEventListener("change", (e) => {
            const value = e.target.value;
            if (punchcardMode === "legacy") {
                if (!dailyConfig) return;
                dailyConfig.character = value;
                updatePunchcardTextures(dailyConfig);
            }
        });

    // Start Button (usando SaveManager)
    startButton.addEventListener('click', () => {
        if (!currentConfig) return;
        audioManager.playSFX("grade.mp3", false, 0.5);
        saveManager.saveConfig(currentConfig);  // ✅ usar saveManager
        window.location.href = 'pages/game.html';
    });

    // Custom Mode Select Listeners
    document.getElementById("custom-character-select")
        .addEventListener("change", updateCustomTextures);

    document.getElementById("custom-size-select")
        .addEventListener("change", updateCustomTextures);

    document.getElementById("custom-hazards-select")
        .addEventListener("change", updateCustomTextures);

    document.getElementById("custom-obstacles-select")
        .addEventListener("change", updateCustomTextures);

    document.getElementById("custom-wanted-select")
        .addEventListener("change", updateCustomTextures);

    document.getElementById("custom-zone-select")
        .addEventListener("change", updateCustomTextures);

    // Close Button
    closeButton.addEventListener('click', () => {
        punchcardScreen.classList.remove('active');
    });
});

// ==============================================================
// ======================== MUSIC SYSTEM ========================
// ==============================================================

// Load and prepare menu music
audioManager.playMenuMusic();

// Start music on FIRST user interaction
const startMusicOnce = () => {
    audioManager.startMusic();
    window.removeEventListener("keydown", startMusicOnce);
    window.removeEventListener("click", startMusicOnce);
    window.removeEventListener("touchstart", startMusicOnce);
};
window.addEventListener("keydown", startMusicOnce);
window.addEventListener("click", startMusicOnce);
window.addEventListener("touchstart", startMusicOnce);

// ==============================================================
// ====================== PUNCHCARD SYSTEM ======================
// ==============================================================

// Creates a base configuration object with default values
function createBaseConfig() {
    return {
        mode: null,
        seed: null,
        level: 1,
        character: "chef",
        size: 1,
        hazards: 1,
        obstacles: 1,
        goals: 1,
        zone: "desert"
    };
}

// Updates all punchcard images and UI elements based on config
function updatePunchcardTextures(config) {

    const seedLabel = document.getElementById("pc-seed-label");
    const dateNote = document.getElementById("pc-date-note");
    const legacySelect = document.getElementById("legacy-character-select");

    // Reset base UI state
    seedLabel.style.display = "none";
    legacySelect.style.display = "none";

    /* -------------------- Daily Mode -------------------- */
    if (config.mode === "daily") {
        seedLabel.style.display = "block";
        seedLabel.textContent = "Seed: " + config.seed;
        const today = new Date();
        dateNote.textContent = today.toLocaleDateString();
    }

    /* -------------------- Legacy Mode -------------------- */
    if (config.mode === "legacy") {
        dateNote.textContent = "Lvl " + config.level;
        legacySelect.style.display = "block";
    }

    /* -------------------- Texture Rendering -------------------- */
    document.getElementById("pcCharacter").src = getCharTexture(config.character);

    if (config.mode === "legacy") {
        document.getElementById("pcSize").src = getLegacySizeTexture(config.level);
    } else {
        document.getElementById("pcSize").src = getSizeTexture(config.size);
    }

    document.getElementById("pcHazards").src = getHazardTexture(config.hazards);
    document.getElementById("pcObstacles").src = getObstacleTexture(config.obstacles);
    document.getElementById("pcWanted").src = getGoalsTexture(config.goals);
    document.getElementById("pcZone").src = getZoneTexture(config.zone);

    // Trigger fade animations
    triggerIconFade("pcCharacter");
    triggerIconFade("pcSize");
    triggerIconFade("pcHazards");
    triggerIconFade("pcObstacles");
    triggerIconFade("pcWanted");
    triggerIconFade("pcZone");
}

// ==============================================================
// ======================== LEGACY MODE =========================
// ==============================================================

// Generates legacy mode configuration
function generateLegacyConfig() {

    hideAllSelects();

    document.querySelector(".pct-title").style.display = "none";
    document.querySelector(".pc-title").style.display = "block";

    const config = createBaseConfig();
    config.mode = "legacy";

    // Load saved level from localStorage
    const savedLevel = localStorage.getItem("legacy_level");
    const level = savedLevel ? parseInt(savedLevel) : 1;
    config.level = level;

    config.character = "chef";

    // Legacy scaling is tied to level
    config.size = config.level;
    config.hazards = config.level;
    config.obstacles = config.level;

    dailyConfig = config;
    currentConfig = config;
    updatePunchcardTextures(config);
}

// ==============================================================
// ======================== DAILY MODE ==========================
// ==============================================================

// Generates deterministic seed based on today's date
function generateDailySeed() {
    const today = new Date();
    const dateString =
        today.getFullYear() + "-" +
        (today.getMonth() + 1) + "-" +
        today.getDate();

    let hash = 0;

    for (let i = 0; i < dateString.length; i++) {
        hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
    }

    return Math.abs(hash);
}

// Returns a seeded pseudo-random generator (linear congruential)
function createSeededRandom(seed) {
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

// Returns a random integer within range (min-max inclusive)
function getRandomInRange(random, min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
}

// Generates daily mode configuration with deterministic randomness
function generateDailyConfig() {

    hideAllSelects();

    document.querySelector(".pct-title").style.display = "none";
    document.querySelector(".pc-title").style.display = "block";

    const seed = generateDailySeed();
    const random = createSeededRandom(seed);

    const validSizes = [8, 12, 16, 20, 24];
    const sizeIndex = getRandomInRange(random, 0, validSizes.length - 1);
    const size = validSizes[sizeIndex];

    const config = createBaseConfig();
    config.mode = "daily";
    config.seed = seed;
    config.size = size;

    // Random character selection
    const chars = ["chef", "mosquito", "mommy", "scout"];
    config.character = chars[getRandomInRange(random, 0, 3)];
    config.goals = getRandomInRange(random, 1, 5);

    // Random zone selection
    const zoneNum = getRandomInRange(random, 1, 3);
    const zoneMap = {1: "desert", 2: "snow", 3: "ash"};
    config.zone = zoneMap[zoneNum];

    config.hazards = getRandomInRange(random, 1, size);
    config.obstacles = getRandomInRange(random, 1, size);

    dailyConfig = config;
    currentConfig = config;
    updatePunchcardTextures(config);
}

// ==============================================================
// ======================== CUSTOM MODE =========================
// ==============================================================

// Generates custom mode configuration (shows all selects)
function generateCustomConfig() {

    hideAllSelects();

    document.getElementById("pc-date-note").textContent = "Custom";
    document.getElementById("pc-seed-label").textContent = "idk put something";

    document.querySelector(".pc-title").style.display = "none";
    document.querySelector(".pct-title").style.display = "block";

    // Show custom mode selects
    document.getElementById("legacy-character-select").style.display = "none";
    document.getElementById("custom-character-select").style.display = "block";
    document.getElementById("custom-size-select").style.display = "block";
    document.getElementById("custom-hazards-select").style.display = "block";
    document.getElementById("custom-obstacles-select").style.display = "block";
    document.getElementById("custom-wanted-select").style.display = "block";
    document.getElementById("custom-zone-select").style.display = "block";

    updateCustomTextures();
}

// Rebuilds config from custom selects and renders textures
function updateCustomTextures() {

    const config = createBaseConfig();
    config.mode = "custom";

    config.character = document.getElementById("custom-character-select").value;
    config.size = parseInt(document.getElementById("custom-size-select").value);
    config.hazards = parseInt(document.getElementById("custom-hazards-select").value);
    config.obstacles = parseInt(document.getElementById("custom-obstacles-select").value);
    config.goals = parseInt(document.getElementById("custom-wanted-select").value);
    config.zone = document.getElementById("custom-zone-select").value;

    currentConfig = config;
    updatePunchcardTextures(config);
}

// Hides all select elements (used when switching modes)
function hideAllSelects() {

    document.getElementById("legacy-character-select").style.display = "none";
    document.getElementById("custom-character-select").style.display = "none";
    document.getElementById("custom-size-select").style.display = "none";
    document.getElementById("custom-hazards-select").style.display = "none";
    document.getElementById("custom-obstacles-select").style.display = "none";
    document.getElementById("custom-wanted-select").style.display = "none";
    document.getElementById("custom-zone-select").style.display = "none";
}

// ==============================================================
// ======================== TEXTURES ============================
// ==============================================================

// Returns character texture based on character ID
function getCharTexture(value) {
    if (value === "chef") return "assets/hud/punchcard/character/chefpin.png";
    if (value === "mosquito") return "assets/hud/punchcard/character/mosquitopin.png";
    if (value === "mommy") return "assets/hud/punchcard/character/mommypin.png";
    if (value === "scout") return "assets/hud/punchcard/character/scoutpin.png";
    return "assets/hud/punchcard/character/chefpin.png";
}

// Returns size texture for legacy mode (based on level)
function getLegacySizeTexture(level) {
    if (level <= 4) return "assets/hud/punchcard/size/small.png";
    if (level <= 9) return "assets/hud/punchcard/size/medium.png";
    if (level <= 14) return "assets/hud/punchcard/size/large.png";
    if (level <= 19) return "assets/hud/punchcard/size/xtralarge.png";
    return "assets/hud/punchcard/size/ultralarge.png";
}

// Returns size texture based on numeric value (custom/daily)
function getSizeTexture(value) {
    if (value <= 8) return "assets/hud/punchcard/size/small.png";
    if (value <= 12) return "assets/hud/punchcard/size/medium.png";
    if (value <= 16) return "assets/hud/punchcard/size/large.png";
    if (value <= 20) return "assets/hud/punchcard/size/xtralarge.png";
    if (value <= 24) return "assets/hud/punchcard/size/ultralarge.png";
    return "assets/hud/punchcard/size/ultralarge.png";
}

// Returns hazard texture based on difficulty range
function getHazardTexture(value) {
    if (value <= 4) return "assets/hud/punchcard/hazard/low.png";
    if (value <= 7) return "assets/hud/punchcard/hazard/medium.png";
    if (value <= 11) return "assets/hud/punchcard/hazard/high.png";
    if (value <= 19) return "assets/hud/punchcard/hazard/xtrahigh.png";
    if (value <= 29) return "assets/hud/punchcard/hazard/ultrahigh.png";
    return "assets/hud/punchcard/hazard/nsanlyhigh.png";
}

// Returns obstacle texture based on difficulty range
function getObstacleTexture(value) {
    if (value <= 2) return "assets/hud/punchcard/obstacles/low.png";
    if (value <= 3) return "assets/hud/punchcard/obstacles/medium.png";
    if (value <= 9) return "assets/hud/punchcard/obstacles/high.png";
    if (value <= 14) return "assets/hud/punchcard/obstacles/xtrahigh.png";
    if (value <= 29) return "assets/hud/punchcard/obstacles/ultrahigh.png";
    return "assets/hud/punchcard/obstacles/nsanlyhigh.png";
}

// Returns goal texture based on amount
function getGoalsTexture(value) {
    if (value == 1) return "assets/hud/punchcard/goals/1.png";
    if (value == 2) return "assets/hud/punchcard/goals/2.png";
    if (value == 3) return "assets/hud/punchcard/goals/3.png";
    if (value == 4) return "assets/hud/punchcard/goals/4.png";
    if (value == 5) return "assets/hud/punchcard/goals/5.png";
    return "assets/hud/punchcard/goals/5.png";
}

// Returns zone texture based on biome type
function getZoneTexture(value) {
    if (value === "backyard") return "assets/hud/punchcard/zone/backyard.png"; 
    if (value === "desert") return "assets/hud/punchcard/zone/desert.png";
    if (value === "snow") return "assets/hud/punchcard/zone/snow.png";
    if (value === "ash") return "assets/hud/punchcard/zone/ash.png";
    return "assets/hud/punchcard/zone/desert.png";
}

// ==============================================================
// ======================== UI HELPERS ==========================
// ==============================================================

// Updates punchcard scale based on window size (responsive)
function updatePunchcardScale() {
    const pc = document.querySelector('.punchcard');
    if (!pc || !document.getElementById('punchcard-screen').classList.contains('active')) return;

    // Calculate scale based on available width and height
    // Using 0.95 to leave a small safety margin
    const scaleX = (window.innerWidth * 0.95) / 800;
    const scaleY = (window.innerHeight * 0.95) / 500;

    // Choose the smallest value so nothing gets cut off
    // Math.min(..., 1.2) allows slight growth on large screens but not infinite
    const finalScale = Math.min(scaleX, scaleY, 1.2);

    pc.style.setProperty('--pc-scale', finalScale);
}

// Triggers fade animation on the corresponding icon
function triggerIconFade(imgId) {
    const img = document.getElementById(imgId);
    if (img) {
        img.classList.remove('icon-react');
        void img.offsetWidth; // Reflow trick to restart the animation
        img.classList.add('icon-react');
    }
}

// Update scale when window is resized
window.addEventListener('resize', updatePunchcardScale);
