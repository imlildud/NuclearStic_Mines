/* ========================================================= */
/* ========================= MENU ========================== */
/* ========================================================= */
// Main menu controller. Handles mode selection (Legacy/Daily/Custom),
// punchcard configuration, music/sfx, and game launch.

import { SaveManager } from "../managers/SaveManager.js";
import { AudioManager } from "../managers/AudioManager.js";
import { LocaleManager } from "../managers/LocaleManager.js";

// ==============================================================
// ====================== GLOBAL STATE ==========================
// ==============================================================

let punchcardMode = null;
let dailyConfig = null;
let currentConfig = null;
let localeManager = null;

// ==================== MANAGERS ====================
const saveManager = new SaveManager();
const audioManager = new AudioManager();
const saveManagerVolumes = new SaveManager();
audioManager.setMusicVolume(saveManagerVolumes.getMusicVolume() / 100);
audioManager.setSFXVolume(saveManagerVolumes.getSFXVolume() / 100);
audioManager.setSFXEnabled(saveManagerVolumes.isSFXEnabled());


// ==============================================================
// ==================== WELCOME SCREEN LOGIC ====================
// ==============================================================

function initWelcomeScreen() {
    const welcomeScreen = document.getElementById("welcome-screen");
    const mainMenu = document.querySelector(".overlay");
    const yesBtn = document.getElementById("welcome-yes");
    const noBtn = document.getElementById("welcome-no");
    
    // Check if tutorial was already completed
    const tutorialCompleted = saveManager.isTutorialCompleted();
    
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
// ======================= MENU LANGUAGES =======================
// ==============================================================

function applyMenuLanguage() {
    if (!localeManager) return;
    
    // Welcome screen
    const welcomeText = document.getElementById("welcome-text");
    const yesBtn = document.getElementById("welcome-yes");
    const noBtn = document.getElementById("welcome-no");
    
    if (welcomeText) welcomeText.innerHTML = localeManager.get('menu.welcome').replace(/\n/g, '<br><br>');
    if (yesBtn) yesBtn.textContent = localeManager.get('menu.yes');
    if (noBtn) noBtn.textContent = localeManager.get('menu.no');
    
    // Mode buttons
    const dailyBtn = document.getElementById("daily-button");
    const customBtn = document.getElementById("custom-button");
    if (dailyBtn) dailyBtn.textContent = localeManager.get('menu.daily');
    if (customBtn) customBtn.textContent = localeManager.get('menu.custom');
    
    // Punchcard labels
    const charLabel = document.getElementById("pc-label-character");
    const sizeLabel = document.getElementById("pc-label-size");
    const hazardsLabel = document.getElementById("pc-label-hazards");
    const obstaclesLabel = document.getElementById("pc-label-obstacles");
    const wantedLabel = document.getElementById("pc-label-wanted");
    const zoneLabel = document.getElementById("pc-label-zone");
    
    if (charLabel) charLabel.textContent = localeManager.get('menu.punchcard.character');
    if (sizeLabel) sizeLabel.textContent = localeManager.get('menu.punchcard.size');
    if (hazardsLabel) hazardsLabel.textContent = localeManager.get('menu.punchcard.hazards');
    if (obstaclesLabel) obstaclesLabel.textContent = localeManager.get('menu.punchcard.obstacles');
    if (wantedLabel) wantedLabel.textContent = localeManager.get('menu.punchcard.wanted');
    if (zoneLabel) zoneLabel.textContent = localeManager.get('menu.punchcard.zone');
    
    // Punchcard select options
    updateSelectOptions();
}

function updateSelectOptions() {
    if (!localeManager) return;
    
    // Size select options
    const sizeSelect = document.getElementById("custom-size-select");
    if (sizeSelect) {
        const sizeOptions = sizeSelect.options;
        const sizeTexts = ['small', 'medium', 'large', 'xtraLarge', 'ultraLarge'];
        for (let i = 0; i < sizeOptions.length && i < sizeTexts.length; i++) {
            sizeOptions[i].text = localeManager.get(`menu.punchcard.${sizeTexts[i]}`);
        }
    }
    
    // Hazards select options
    const hazardsSelect = document.getElementById("custom-hazards-select");
    if (hazardsSelect) {
        const hazardOptions = hazardsSelect.options;
        const hazardTexts = ['low', 'medium', 'high', 'xtraHigh', 'ultraHigh', 'nsanelyHigh'];
        for (let i = 0; i < hazardOptions.length && i < hazardTexts.length; i++) {
            hazardOptions[i].text = localeManager.get(`menu.punchcard.${hazardTexts[i]}`);
        }
    }
    
    // Obstacles select options
    const obstaclesSelect = document.getElementById("custom-obstacles-select");
    if (obstaclesSelect) {
        const obstacleOptions = obstaclesSelect.options;
        const obstacleTexts = ['low', 'medium', 'high', 'xtraHigh', 'ultraHigh', 'nsanelyHigh'];
        for (let i = 0; i < obstacleOptions.length && i < obstacleTexts.length; i++) {
            obstacleOptions[i].text = localeManager.get(`menu.punchcard.${obstacleTexts[i]}`);
        }
    }
    
    // Zone select options
    const zoneSelect = document.getElementById("custom-zone-select");
    if (zoneSelect) {
        const zoneOptions = zoneSelect.options;
        const zoneTexts = ['backyard', 'desert', 'snow', 'ash'];
        for (let i = 0; i < zoneOptions.length && i < zoneTexts.length; i++) {
            zoneOptions[i].text = localeManager.get(`menu.punchcard.${zoneTexts[i]}`);
        }
    }
    
    // Character select options (legacy and custom)
    const charSelects = ["legacy-character-select", "custom-character-select"];
    for (const selectId of charSelects) {
        const charSelect = document.getElementById(selectId);
        if (charSelect) {
            const charOptions = charSelect.options;
            const charTexts = ['chef', 'mosquito', 'mommy', 'scout'];
            for (let i = 0; i < charOptions.length && i < charTexts.length; i++) {
                charOptions[i].text = localeManager.get(`menu.punchcard.${charTexts[i]}`);
            }
        }
    }
}

// ==============================================================
// ====================== DOM EVENT LISTENERS ===================
// ==============================================================

document.addEventListener("DOMContentLoaded", async () => {
    
    // Initialize LocaleManager
    localeManager = new LocaleManager();
    await localeManager.init();
    
    await initWelcomeScreen();
    applyMenuLanguage();
    
    localeManager.onChange(async () => {
        await initWelcomeScreen();
        applyMenuLanguage();
        updatePunchcardTextures(currentConfig);
    });

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
        updateBadges();
    });

    // ----- Daily Mode Button -----
    dailyButton.addEventListener('click', () => {
        if (saveManager.isDailyAttemptedToday()) {
            const message = localeManager 
                ? localeManager.get('menu.dailyCompleted')
                : "Daily mission already completed today! Come back tomorrow.";
            showModal(message);
            const startButton = document.querySelector('.pc-start');
            if (startButton) startButton.style.display = "none";
        }

        punchcardMode = "daily";
        punchcardScreen.classList.add('active');
        generateDailyConfig();
        updatePunchcardScale();
        updateBadges();
        
    });

    // ----- Custom Mode Button -----
    customButton.addEventListener("click", () => {
        punchcardMode = "custom";
        punchcardScreen.classList.add('active');
        generateCustomConfig();
        updatePunchcardScale();
        updateBadges();
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

    startButton.addEventListener('click', () => {
        if (!currentConfig) return;
        audioManager.playSFX("grade.mp3", false, 0.5);
        saveManager.saveConfig(currentConfig);
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

    // Options Button
    const optionButton = document.querySelector('.option-button');
    if (optionButton) {
        optionButton.addEventListener('click', () => {
            window.location.href = 'pages/configuration.html';
        });
    }
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
// ====================== MODAL DIALOG ==========================
// ==============================================================

function showModal(message, onOk = null) {
    const modal = document.getElementById("modal-dialog");
    const modalText = document.getElementById("modal-text");
    const okBtn = document.getElementById("modal-ok");
    
    if (!modal || !modalText) return;
    
    modalText.innerHTML = message.replace(/\n/g, '<br><br>');
    modal.style.display = "flex";
    
    // Remove previous event listener to avoid duplicates
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    
    newOkBtn.addEventListener("click", () => {
        modal.style.display = "none";
        if (onOk) onOk();
    });
}

function initModal() {
    const modal = document.getElementById("modal-dialog");
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        });
    }
}

// ==============================================================
// ======================= BADGES SYSTEM ========================
// ==============================================================

function getLegacyBadge(level) {
    if (level <= 3) return "paper.png";
    if (level <= 7) return "cardboard.png";
    if (level <= 11) return "telegram.png";
    if (level <= 15) return "bronze.png";
    if (level <= 19) return "silver.png";
    if (level <= 23) return "gold.png";
    return "platinum.png";
}

function updateBadges() {
    const legacyContainer = document.querySelector('.legacy-badge-container');
    const dailyContainer = document.getElementById('daily-badge-container');
    const legacyHighScore = saveManager.getLegacyHighScore();
    const badgeImg = document.getElementById("legacy-record-badge");
    const badgeLabel = document.getElementById("legacy-record-label");
    
    if (punchcardMode === "legacy") {
        if (legacyContainer) legacyContainer.style.display = "flex";
        if (dailyContainer) dailyContainer.style.display = "none";
        
        if (badgeImg) {
            const badgeFile = getLegacyBadge(legacyHighScore);
            badgeImg.src = `assets/hud/badges/${badgeFile}`;
        }
        if (badgeLabel) {
            badgeLabel.textContent = `Record: ${legacyHighScore}`;
        }
    } 
    else if (punchcardMode === "daily") {
        if (legacyContainer) legacyContainer.style.display = "none";
        if (dailyContainer) dailyContainer.style.display = "flex";
        updateDailyBadge();
    }
    else {
        if (legacyContainer) legacyContainer.style.display = "none";
        if (dailyContainer) dailyContainer.style.display = "none";
    }
}

// ======================= DAILY STREAK BADGE =======================

function getDailyFireImage(streak) {
    if (streak <= 0) return "fire0.png";
    if (streak <= 6) return "fire1.png";
    if (streak <= 13) return "fire2.png";
    if (streak <= 29) return "fire3.png";
    if (streak <= 179) return "fire4.png";
    return "fire5.png";
}

function updateDailyBadge() {
    const dailyContainer = document.getElementById("daily-badge-container");
    const streakLabel = document.getElementById("daily-streak-label");
    const streakNumber = document.getElementById("daily-streak-number");
    const fireImg = document.getElementById("daily-streak-fire");
    
    if (!dailyContainer) return;
    
    const streak = saveManager.getDailyStreak();
    const fireFile = getDailyFireImage(streak);
    
    if (streakLabel) streakLabel.textContent = `Streak: ${streak}`;
    if (streakNumber) streakNumber.textContent = streak;
    if (fireImg) fireImg.src = `assets/hud/badges/${fireFile}`;
}

// ==============================================================
// ======================== UI HELPERS ==========================
// ==============================================================

function updatePunchcardScale() {
    const pc = document.querySelector('.punchcard');
    if (!pc || !document.getElementById('punchcard-screen').classList.contains('active')) return;

    const scaleX = (window.innerWidth * 0.95) / 900;
    const scaleY = (window.innerHeight * 0.95) / 500;

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
