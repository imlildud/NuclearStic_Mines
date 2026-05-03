/* ========================================================= */
/* ========================= MENU ========================== */
/* ========================================================= */

// Current punchcard mode state
let punchcardMode = null;

// Shared config reference (used by legacy & daily)
let dailyConfig = null;

// Current game config
let currentConfig = null; 

document.addEventListener("DOMContentLoaded", () => {

    const legacyButton = document.querySelector('.legacy-button');
    const dailyButton = document.querySelector('.daily-button');
    const customButton = document.querySelector('.custom-button');
    const punchcardScreen = document.getElementById('punchcard-screen');
    const closeButton = document.querySelector('.pc-close');
    const startButton = document.querySelector('.pc-start'); 

    /* -------------------- Mode Buttons -------------------- */

    // Legacy Mode Button
    legacyButton.addEventListener('click', () => {
        punchcardMode = "legacy";
        punchcardScreen.classList.add('active');
        generateLegacyConfig();
    });

    // Daily Mode Button
    dailyButton.addEventListener('click', () => {
        const today = new Date().toDateString();
        const alreadyPlayed = localStorage.getItem(`daily_completed_${today}`);
    
        if (alreadyPlayed) {
            alert("Daily mission already completed today! Come back tomorrow.");
        return;
        }

        punchcardMode = "daily";
        punchcardScreen.classList.add('active');
        generateDailyConfig();
    });

    // Custom Mode Button
    customButton.addEventListener("click", () => {
        punchcardMode = "custom";
        punchcardScreen.classList.add('active');
        generateCustomConfig();
    });

    /* -------------------- Select Listeners -------------------- */

    // Character select behaves differently depending on current mode
    document.getElementById("legacy-character-select")
    .addEventListener("change", (e) => {

        const value = e.target.value;

        // Legacy Mode updates stored config
        if (punchcardMode === "legacy") {
            if (!dailyConfig) return;
            dailyConfig.character = value;
            updatePunchcardTextures(dailyConfig);
        }
    });

    /* -------------------- Start Button -------------------- */
    startButton.addEventListener('click', () => {
        if (!currentConfig) return;            
        localStorage.setItem('gameConfig', JSON.stringify(currentConfig));
        window.location.href = 'pages/game.html';
    });

    // Custom-only selects
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

    /* -------------------- Close Button -------------------- */

    // Close punchcard overlay
    closeButton.addEventListener('click', () => {
        punchcardScreen.classList.remove('active');
    });
});


/* ========================================================= */
/* ======================= PUNCHCARD ======================= */
/* ========================================================= */

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

// Updates all punchcard images and UI elements
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

        dateNote.textContent = "Lvl_" + config.level;
        legacySelect.style.display = "block";
    }

    /* -------------------- Texture Rendering -------------------- */

    document.getElementById("pcCharacter").src =
        getCharTexture(config.character);

    document.getElementById("pcSize").src =
        getSizeTexture(config.size);

    document.getElementById("pcHazards").src =
        getHazardTexture(config.hazards);

    document.getElementById("pcObstacles").src =
        getObstacleTexture(config.obstacles);

    document.getElementById("pcWanted").src =
        getGoalsTexture(config.goals);

    document.getElementById("pcZone").src =
        getZoneTexture(config.zone);

    triggerIconFade("pcCharacter");
    triggerIconFade("pcSize");
    triggerIconFade("pcHazards");
    triggerIconFade("pcObstacles");
    triggerIconFade("pcWanted");
    triggerIconFade("pcZone");
}


/* ========================================================= */
/* ======================== LEGACY ========================= */
/* ========================================================= */

// Generates legacy mode configuration
function generateLegacyConfig() {

    hideAllSelects();

    document.querySelector(".pct-title").style.display = "none";
    document.querySelector(".pc-title").style.display = "block";

    const config = createBaseConfig();

    config.mode = "legacy";
    config.level = 1;
    config.character = "chef";

    // Legacy scaling is tied to level
    config.size = config.level;
    config.hazards = config.level;
    config.obstacles = config.level;

    dailyConfig = config;
    currentConfig = config;   
    updatePunchcardTextures(config);
}


/* ========================================================= */
/* ========================= DAILY ========================= */
/* ========================================================= */

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

// Returns a seeded pseudo-random generator
function createSeededRandom(seed) {
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

// Returns a random integer within range
function getRandomInRange(random, min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
}

// Generates daily mode configuration
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
    const chars = ["chef", "mosquito", "mommy", "scout"];
    config.character = chars[getRandomInRange(random, 0, 3)];
    config.goals = getRandomInRange(random, 1, 5);
    const zoneNum = getRandomInRange(random, 1, 3);
    const zoneMap = {1: "desert", 2: "snow", 3: "ash"};
    config.zone = zoneMap[zoneNum];
    config.hazards = getRandomInRange(random, 1, size);
    config.obstacles = getRandomInRange(random, 1, size);

    dailyConfig = config;
    currentConfig = config;   
    updatePunchcardTextures(config);
}


/* ========================================================= */
/* ========================= CUSTOM ======================== */
/* ========================================================= */

// Generates custom mode configuration
function generateCustomConfig() {

    hideAllSelects();
    
    document.getElementById("pc-date-note").textContent = "Custom";
    document.getElementById("pc-seed-label").textContent = "idk put something";

    document.querySelector(".pc-title").style.display = "none";
    document.querySelector(".pct-title").style.display = "block";
    
    document.getElementById("legacy-character-select").style.display= "none";
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
    config.zone = (document.getElementById("custom-zone-select").value);

    currentConfig = config;
    updatePunchcardTextures(config);
}

// Hides all select elements
function hideAllSelects() {

    document.getElementById("legacy-character-select").style.display = "none";
    document.getElementById("custom-character-select").style.display = "none";
    document.getElementById("custom-size-select").style.display = "none";
    document.getElementById("custom-hazards-select").style.display = "none";
    document.getElementById("custom-obstacles-select").style.display = "none";
    document.getElementById("custom-wanted-select").style.display = "none";
    document.getElementById("custom-zone-select").style.display = "none";
}


/* ========================================================= */
/* ======================= TEXTURES ======================== */
/* ========================================================= */

// Returns character texture based on ID
function getCharTexture(value) {
    if (value === "chef") return "assets/hud/punchcard/character/chefpin.png";
    if (value === "mosquito") return "assets/hud/punchcard/character/mosquitopin.png";
    if (value === "mommy") return "assets/hud/punchcard/character/mommypin.png";
    if (value === "scout") return "assets/hud/punchcard/character/scoutpin.png";
    return "assets/hud/punchcard/character/chefpin.png";
}

// Returns size texture based on numeric range
function getSizeTexture(value) {
    if (value <= 8) return "assets/hud/punchcard/size/small.png";
    if (value <= 12) return "assets/hud/punchcard/size/medium.png";
    if (value <= 16) return "assets/hud/punchcard/size/large.png";
    if (value <= 20) return "assets/hud/punchcard/size/xtralarge.png";
    if (value <= 24) return "assets/hud/punchcard/size/ultralarge.png";
    return "assets/hud/punchcard/size/ultralarge.png";
}

// Hazard texture by difficulty range
function getHazardTexture(value) {
    if (value <= 4) return "assets/hud/punchcard/hazard/low.png";
    if (value <= 7) return "assets/hud/punchcard/hazard/medium.png";
    if (value <= 11) return "assets/hud/punchcard/hazard/high.png";
    if (value <= 19) return "assets/hud/punchcard/hazard/xtrahigh.png";
    if (value <= 29) return "assets/hud/punchcard/hazard/ultrahigh.png";
    return "assets/hud/punchcard/hazard/nsanlyhigh.png";
}

// Obstacle texture by difficulty range
function getObstacleTexture(value) {
    if (value <= 2) return "assets/hud/punchcard/obstacles/low.png";
    if (value <= 3) return "assets/hud/punchcard/obstacles/medium.png";
    if (value <= 9) return "assets/hud/punchcard/obstacles/high.png";
    if (value <= 14) return "assets/hud/punchcard/obstacles/xtrahigh.png";
    if (value <= 29) return "assets/hud/punchcard/obstacles/ultrahigh.png";
    return "assets/hud/punchcard/obstacles/nsanlyhigh.png";
}

// Goal texture based on amount range
function getGoalsTexture(value) {
    if (value == 1) return "assets/hud/punchcard/goals/1.png";
    if (value == 2) return "assets/hud/punchcard/goals/2.png";
    if (value == 3) return "assets/hud/punchcard/goals/3.png";
    if (value == 4) return "assets/hud/punchcard/goals/4.png";
    if (value == 5) return "assets/hud/punchcard/goals/5.png";
    return "assets/hud/punchcard/goals/5.png";
}

// Zone texture based on biome ID
function getZoneTexture(value) {
    if (value === "desert") return "assets/hud/punchcard/zone/desert.png";
    if (value === "snow") return "assets/hud/punchcard/zone/snow.png";
    if (value === "ash") return "assets/hud/punchcard/zone/ash.png";
    return "assets/hud/punchcard/zone/desert.png";
}

// Updates punchcard scale based on window size
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

// Call this function every time you open the punchcard and on resize
window.addEventListener('resize', updatePunchcardScale);