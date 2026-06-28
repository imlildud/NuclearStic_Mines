// ==============================================================
// ===================== PUNCHCARD PANEL ========================
// ==============================================================
// Handles punchcard display, mode selection (Legacy/Daily/Custom),
// configuration generation, texture mapping, seed system, and badges.

import { SaveManager } from "../../managers/SaveManager.js";
import { AudioManager } from "../../managers/AudioManager.js";
import { PathResolver } from "../../utils/PathResolver.js";

// ==================== INSTANCES ====================

const saveManager = new SaveManager();
const audioManager = new AudioManager();

// ==================== STATE ====================

let punchcardMode = null;
let dailyConfig = null;
let currentConfig = null;
let localeManager = null;

// ==================== PRIVATE HELPERS ====================

function isHardcoreEnabled() {
    return saveManager.isHardcoreEnabled();
}

function getZoneByLevel(level) {
    const lvl = Math.floor(Number(level));
    if (lvl <= 9) return "desert";
    if (lvl <= 19) return "snow";
    return "ash";
}

function createSeededRandom(seed) {
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

function getRandomInRange(random, min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
}

// ==================== TEXTURE GETTERS ====================

function getCharTexture(value) {
    if (value === "chef") return "assets/hud/punchcard/character/chefpin.png";
    if (value === "mosquito") return "assets/hud/punchcard/character/mosquitopin.png";
    if (value === "mommy") return "assets/hud/punchcard/character/mommypin.png";
    if (value === "scout") return "assets/hud/punchcard/character/scoutpin.png";
    return "assets/hud/punchcard/character/chefpin.png";
}

function getLegacySizeTexture(level) {
    if (level <= 4) return "assets/hud/punchcard/size/small.png";
    if (level <= 9) return "assets/hud/punchcard/size/medium.png";
    if (level <= 14) return "assets/hud/punchcard/size/large.png";
    if (level <= 19) return "assets/hud/punchcard/size/xtralarge.png";
    return "assets/hud/punchcard/size/ultralarge.png";
}

function getSizeTexture(value) {
    if (value <= 8) return "assets/hud/punchcard/size/small.png";
    if (value <= 12) return "assets/hud/punchcard/size/medium.png";
    if (value <= 16) return "assets/hud/punchcard/size/large.png";
    if (value <= 20) return "assets/hud/punchcard/size/xtralarge.png";
    if (value <= 24) return "assets/hud/punchcard/size/ultralarge.png";
    return "assets/hud/punchcard/size/ultralarge.png";
}

function getHazardTexture(value) {
    if (value <= 2) return "assets/hud/punchcard/hazard/low.png";
    if (value <= 7) return "assets/hud/punchcard/hazard/medium.png";
    if (value <= 11) return "assets/hud/punchcard/hazard/high.png";
    if (value <= 17) return "assets/hud/punchcard/hazard/xtrahigh.png";
    if (value <= 20) return "assets/hud/punchcard/hazard/ultrahigh.png";
    return "assets/hud/punchcard/hazard/nsanlyhigh.png";
}

function getObstacleTexture(value) {
    if (value <= 2) return "assets/hud/punchcard/obstacles/low.png";
    if (value <= 4) return "assets/hud/punchcard/obstacles/medium.png";
    if (value <= 9) return "assets/hud/punchcard/obstacles/high.png";
    if (value <= 14) return "assets/hud/punchcard/obstacles/xtrahigh.png";
    if (value <= 19) return "assets/hud/punchcard/obstacles/ultrahigh.png";
    return "assets/hud/punchcard/obstacles/nsanlyhigh.png";
}

function getGoalsTexture(value) {
    if (value == 1) return "assets/hud/punchcard/goals/1.png";
    if (value == 2) return "assets/hud/punchcard/goals/2.png";
    if (value == 3) return "assets/hud/punchcard/goals/3.png";
    if (value == 4) return "assets/hud/punchcard/goals/4.png";
    if (value == 5) return "assets/hud/punchcard/goals/5.png";
    return "assets/hud/punchcard/goals/5.png";
}

function getZoneTexture(value) {
    if (value === "backyard") return "assets/hud/punchcard/zone/backyard.png"; 
    if (value === "desert") return "assets/hud/punchcard/zone/desert.png";
    if (value === "snow") return "assets/hud/punchcard/zone/snow.png";
    if (value === "ash") return "assets/hud/punchcard/zone/ash.png";
    return "assets/hud/punchcard/zone/desert.png";
}

// ==================== LEGACY BADGES ====================

function getLegacyBadge(level) {
    if (level <= 5) return "paper.png";
    if (level <= 10) return "cardboard.png";
    if (level <= 20) return "telegram.png";
    if (level <= 30) return "bronze.png";
    if (level <= 40) return "silver.png";
    if (level <= 50) return "gold.png";
    return "platinum.png";
}

function getDailyFireImage(streak) {
    if (streak <= 0) return "fire0.png";
    if (streak <= 6) return "fire1.png";
    if (streak <= 13) return "fire2.png";
    if (streak <= 29) return "fire3.png";
    if (streak <= 179) return "fire4.png";
    return "fire5.png";
}

// ==================== BADGE UPDATES ====================

function updateBadges() {
    const legacyContainer = document.querySelector('.legacy-badge-container');
    const dailyContainer = document.getElementById('daily-badge-container');
    const legacyHighScore = saveManager.getLegacyHighScore();
    const hardcoreHighScore = saveManager.getHardcoreHighScore();
    const badgeImg = document.getElementById("legacy-record-badge");
    const badgeLabel = document.getElementById("legacy-record-label");
    const isHardcore = isHardcoreEnabled();
    
    if (punchcardMode === "legacy") {
        if (legacyContainer) legacyContainer.style.display = "flex";
        if (dailyContainer) dailyContainer.style.display = "none";
        
        if (badgeImg) {
            if (isHardcore) {
                badgeImg.src = "assets/hud/menu/hardcore.png";
                badgeImg.style.display = "block";
            } else {
                const badgeFile = getLegacyBadge(legacyHighScore);
                badgeImg.src = `assets/hud/badges/${badgeFile}`;
                badgeImg.style.display = "block";
            }
        }
        if (badgeLabel) {
            if (isHardcore) {
                badgeLabel.textContent = `Record: ${hardcoreHighScore}`;
                badgeLabel.style.display = "block";
            } else {
                badgeLabel.textContent = `Record: ${legacyHighScore}`;
                badgeLabel.style.display = "block";
            }
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
    updatePunchcardLabelsColor();
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

// ==================== UI UPDATES ====================

function updatePunchcardLabelsColor() {
    const labels = document.querySelectorAll('.pc-label');
    const isHardcore = isHardcoreEnabled();
    
    if (isHardcore) {
        labels.forEach(label => {
            label.style.color = "#ffffff";
            label.style.textShadow = "2px 2px 0 #000000";
        });
    } else {
        labels.forEach(label => {
            label.style.color = "";
            label.style.textShadow = "";
        });
    }
}

function updatePunchcardBackground() {
    const pcBase = document.querySelector('.pc-base');
    if (!pcBase) return;
    
    const isHardcore = isHardcoreEnabled();
    const isLegacyMode = (punchcardMode === "legacy");
    
    if (isLegacyMode && isHardcore) {
        pcBase.src = "assets/hud/punchcard/hardcard.png";
    } else {
        pcBase.src = "assets/hud/punchcard/punchcard.png";
    }
}

function updatePunchcardTextures(config) {
    const seedLabel = document.getElementById("pc-seed-label");
    const dateNote = document.getElementById("pc-date-note");
    const legacySelect = document.getElementById("legacy-character-select");

    seedLabel.style.display = "none";
    legacySelect.style.display = "none";

    if (seedLabel) {
        seedLabel.style.display = "block";
        const seedPrefix = localeManager ? localeManager.get('menu.punchcard.seed') : "Seed: ";
        if (config.seed) {
            seedLabel.textContent = `${seedPrefix}${config.seed}`;
        } else {
            seedLabel.textContent = `${seedPrefix}---`;
        }
    }

    if (config.mode === "daily") {
        seedLabel.style.display = "block";
        seedLabel.textContent = "Seed: " + config.seed;
        const today = new Date();
        dateNote.textContent = today.toLocaleDateString();
    }

    if (config.mode === "legacy") {
        dateNote.textContent = "Lvl " + config.level;
        legacySelect.style.display = "block";
    }

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

    triggerIconFade("pcCharacter");
    triggerIconFade("pcSize");
    triggerIconFade("pcHazards");
    triggerIconFade("pcObstacles");
    triggerIconFade("pcWanted");
    triggerIconFade("pcZone");
}

function triggerIconFade(imgId) {
    const img = document.getElementById(imgId);
    if (img) {
        img.classList.remove('icon-react');
        void img.offsetWidth;
        img.classList.add('icon-react');
    }
}

function updatePunchcardScale() {
    const pc = document.querySelector('.punchcard');
    if (!pc || !document.getElementById('punchcard-screen').classList.contains('active')) return;

    const scaleX = (window.innerWidth * 0.95) / 900;
    const scaleY = (window.innerHeight * 0.95) / 500;
    const finalScale = Math.min(scaleX, scaleY, 1.2);
    pc.style.setProperty('--pc-scale', finalScale);
}

function updateDailyButtonVisibility() {
    const dailyButton = document.getElementById('daily-button');
    const customButton = document.getElementById('custom-button');
    if (!dailyButton) return;
    
    const isHardcore = isHardcoreEnabled();
    
    if (isHardcore) {
        dailyButton.style.display = "none";
        customButton.style.display = "none";
    } else {
        dailyButton.style.display = "flex";
        customButton.style.display = "flex";
    }
}

function updateCustomElementsVisibility(isCustom) {
    const seedButtonContainer = document.getElementById("pc-seed-button-container");
    const diceContainer = document.getElementById("custom-dice-container");
    
    if (isCustom) {
        if (seedButtonContainer) seedButtonContainer.style.display = "block";
        if (diceContainer) diceContainer.style.display = "flex";
    } else {
        if (seedButtonContainer) seedButtonContainer.style.display = "none";
        if (diceContainer) diceContainer.style.display = "none";
    }
}

// ==================== SEED SYSTEM ====================

function generateRandomSeed() {
    return Math.floor(Math.random() * 999999999) + 1;
}

function updateSeedDisplay(seed) {
    const seedLabel = document.getElementById("pc-seed-label");
    if (seedLabel && localeManager) {
        seedLabel.textContent = `${localeManager.get('menu.punchcard.seed')}${seed}`;
    } else if (seedLabel) {
        seedLabel.textContent = `Seed: ${seed}`;
    }
}

function showSeedInputModal(currentSeed, onConfirm) {
    const modal = document.getElementById("modal-dialog");
    const modalText = document.getElementById("modal-text");
    const okBtn = document.getElementById("modal-ok");
    
    if (!modal || !modalText) return;
    
    const enterSeedText = localeManager 
        ? localeManager.get('menu.punchcard.enterSeed')
        : "Enter seed number:";
    
    modalText.innerHTML = `
        <div style="margin-bottom: 2vmin;">${enterSeedText}</div>
        <input type="number" id="seed-input" value="${currentSeed}" style="font-family: 'Shampoos'; font-size: 4vmin; padding: 1vmin; text-align: center; width: 80%;">
    `;
    modal.style.display = "flex";
    
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    
    newOkBtn.addEventListener("click", () => {
        const input = document.getElementById("seed-input");
        const newSeed = parseInt(input.value) || generateRandomSeed();
        modal.style.display = "none";
        if (onConfirm) onConfirm(newSeed);
    });
}

// ==================== MODE GENERATORS ====================

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

function hideAllSelects() {
    document.getElementById("legacy-character-select").style.display = "none";
    document.getElementById("custom-character-select").style.display = "none";
    document.getElementById("custom-size-select").style.display = "none";
    document.getElementById("custom-hazards-select").style.display = "none";
    document.getElementById("custom-obstacles-select").style.display = "none";
    document.getElementById("custom-wanted-select").style.display = "none";
    document.getElementById("custom-zone-select").style.display = "none";
}

function generateLegacyConfig() {
    punchcardMode = "legacy";
    hideAllSelects();

    document.querySelector(".pct-title").style.display = "none";
    document.querySelector(".pc-title").style.display = "block";

    const backyardUnlocked = saveManager.isSecretCodeActivated('back2school');
    const zoneSelect = document.getElementById("custom-zone-select");
    if (!backyardUnlocked && zoneSelect.value === 'backyard') {
        zoneSelect.value = 'desert';
    }

    const config = createBaseConfig();
    config.mode = "legacy";
    
    config.seed = generateRandomSeed();
    updateSeedDisplay(config.seed);

    const isHardcore = isHardcoreEnabled();
    let savedLevel;
    if (isHardcore) {
        savedLevel = saveManager.getHardcoreLevel();
    } else {
        savedLevel = saveManager.getLegacyLevel();
    }
    const level = savedLevel ? parseInt(savedLevel) : 1;
    config.level = level;

    if (isHardcore) {
        config.goals = 5;
        config.size = 12 + level;
        config.hazards = 5 + level;
        config.obstacles = 10 + level;
        config.zone = "ash";
        
        console.log(`[Hardcore] Level ${level} - Size: ${config.size}, Hazards: ${config.hazards}, Obstacles: ${config.obstacles}, Goals: ${config.goals}`);
    } else {
        let goals = 1;
        if (level >= 5) goals = 2;
        if (level >= 10) goals = 3;
        if (level >= 15) goals = 4;
        if (level >= 20) goals = 5;
        
        config.goals = goals;
        config.size = level;
        config.hazards = level;
        config.obstacles = level;
        config.zone = getZoneByLevel(level);
    }

    dailyConfig = config;
    currentConfig = config;
    updatePunchcardTextures(config);
    updatePunchcardBackground();
    updatePunchcardLabelsColor();
    
    updateCustomElementsVisibility(false);
}

function generateDailySeed() {
    punchcardMode = "daily";
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

function generateDailyConfig() {
    saveManager.cleanupOldDailyEntries(7);
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
    
    updateSeedDisplay(seed);

    const startButton = document.querySelector('.pc-start');
    if (startButton) {
        if (saveManager.isDailyAttemptedToday()) {
            startButton.style.display = "none";
        } else {
            startButton.style.display = "block";
        }
    }
    
    updateCustomElementsVisibility(false);
}

function generateCustomConfig() {
    punchcardMode = "custom";
    hideAllSelects();

    document.getElementById("pc-date-note").textContent = "Custom";
    
    if (!currentConfig || !currentConfig.seed) {
        currentConfig = createBaseConfig();
        currentConfig.seed = generateRandomSeed();
    }
    updateSeedDisplay(currentConfig.seed);

    document.querySelector(".pc-title").style.display = "none";
    document.querySelector(".pct-title").style.display = "block";

    document.getElementById("legacy-character-select").style.display = "none";
    document.getElementById("custom-character-select").style.display = "block";
    document.getElementById("custom-size-select").style.display = "block";
    document.getElementById("custom-hazards-select").style.display = "block";
    document.getElementById("custom-obstacles-select").style.display = "block";
    document.getElementById("custom-wanted-select").style.display = "block";
    document.getElementById("custom-zone-select").style.display = "block";

    const backyardUnlocked = saveManager.isSecretCodeActivated('back2school');
    const zoneSelect = document.getElementById("custom-zone-select");
    if (!backyardUnlocked && zoneSelect.value === 'backyard') {
        zoneSelect.value = 'desert';
    }
    
    const legacyContainer = document.getElementById("legacy-badge-container");
    const dailyContainer = document.getElementById("daily-badge-container");
    if (legacyContainer) legacyContainer.style.display = "none";
    if (dailyContainer) dailyContainer.style.display = "none";
    updatePunchcardLabelsColor();
    
    updateCustomElementsVisibility(true);

    updateCustomTextures();
}

function updateCustomTextures() {
    const config = createBaseConfig();
    config.mode = "custom";

    if (currentConfig && currentConfig.seed) {
        config.seed = currentConfig.seed;
    } else {
        config.seed = generateRandomSeed();
    }

    config.character = document.getElementById("custom-character-select").value;
    config.size = parseInt(document.getElementById("custom-size-select").value);
    config.hazards = parseInt(document.getElementById("custom-hazards-select").value);
    config.obstacles = parseInt(document.getElementById("custom-obstacles-select").value);
    config.goals = parseInt(document.getElementById("custom-wanted-select").value);
    config.zone = document.getElementById("custom-zone-select").value;

    currentConfig = config;
    updatePunchcardTextures(config);
}

function randomizeCustomSelectors() {
    const random = createSeededRandom(generateRandomSeed());
    
    const chars = ["chef", "mosquito", "mommy", "scout"];
    const character = chars[getRandomInRange(random, 0, 3)];
    document.getElementById("custom-character-select").value = character;
    
    const sizes = ["8", "12", "16", "20", "24"];
    const size = sizes[getRandomInRange(random, 0, 4)];
    document.getElementById("custom-size-select").value = size;
    
    const hazards = ["1", "5", "8", "12", "20", "30"];
    const hazard = hazards[getRandomInRange(random, 0, 5)];
    document.getElementById("custom-hazards-select").value = hazard;
    
    const obstacles = ["1", "3", "5", "10", "15", "30"];
    const obstacle = obstacles[getRandomInRange(random, 0, 5)];
    document.getElementById("custom-obstacles-select").value = obstacle;
    
    const wanted = getRandomInRange(random, 1, 5).toString();
    document.getElementById("custom-wanted-select").value = wanted;
    
    const allZones = ["backyard", "desert", "snow", "ash"];
    const backyardUnlocked = saveManager.isSecretCodeActivated('back2school');
    const availableZones = backyardUnlocked ? allZones : allZones.filter(z => z !== 'backyard');
    const zone = availableZones[getRandomInRange(random, 0, availableZones.length - 1)];
    document.getElementById("custom-zone-select").value = zone;
    
    updateCustomTextures();
}

// ==================== MODAL ====================

function showModal(message, onOk = null) {
    const modal = document.getElementById("modal-dialog");
    const modalText = document.getElementById("modal-text");
    const okBtn = document.getElementById("modal-ok");
    
    if (!modal || !modalText) return;
    
    modalText.innerHTML = message.replace(/\n/g, '<br><br>');
    modal.style.display = "flex";
    
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    
    newOkBtn.addEventListener("click", () => {
        modal.style.display = "none";
        if (onOk) onOk();
    });
}

// ==================== EXPORTED MODULE ====================

export const PunchcardPanel = {
    // State getters
    getCurrentConfig() {
        return currentConfig;
    },
    
    getPunchcardMode() {
        return punchcardMode;
    },
    
    // Mode generators
    generateLegacyConfig() {
        generateLegacyConfig();
    },
    
    generateDailyConfig() {
        generateDailyConfig();
    },
    
    generateCustomConfig() {
        generateCustomConfig();
    },
    
    // UI updates
    updatePunchcardTextures(config) {
        updatePunchcardTextures(config);
    },
    
    updatePunchcardBackground() {
        updatePunchcardBackground();
    },
    
    updatePunchcardScale() {
        updatePunchcardScale();
    },
    
    updateBadges() {
        updateBadges();
    },
    
    updateDailyButtonVisibility() {
        updateDailyButtonVisibility();
    },
    
    updatePunchcardLabelsColor() {
        updatePunchcardLabelsColor();
    },
    
    // Seed system
    generateRandomSeed() {
        return generateRandomSeed();
    },
    
    updateSeedDisplay(seed) {
        updateSeedDisplay(seed);
    },
    
    showSeedInputModal(currentSeed, onConfirm) {
        showSeedInputModal(currentSeed, onConfirm);
    },
    
    // Custom mode
    updateCustomTextures() {
        updateCustomTextures();
    },
    
    randomizeCustomSelectors() {
        randomizeCustomSelectors();
    },
    
    // Modal
    showModal(message, onOk) {
        showModal(message, onOk);
    },
    
    // Locale
    setLocaleManager(lm) {
        localeManager = lm;
    },
    
    // Add Backyard zone (secret code)
    addBackyardToZoneSelect() {
        const zoneSelect = document.getElementById("custom-zone-select");
        if (!zoneSelect) return;
        
        let hasBackyard = false;
        for (let i = 0; i < zoneSelect.options.length; i++) {
            if (zoneSelect.options[i].value === 'backyard') {
                hasBackyard = true;
                break;
            }
        }
        
        if (!hasBackyard) {
            const option = document.createElement('option');
            option.value = 'backyard';
            option.textContent = localeManager ? localeManager.get('menu.punchcard.backyard') : 'Backyard';
            zoneSelect.appendChild(option);
            
            // Refresh select options
            const event = new Event('change');
            zoneSelect.dispatchEvent(event);
        }
    }
};