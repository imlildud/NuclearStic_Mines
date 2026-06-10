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

let selectedAvatar = 1;
let isEditingAvatar = false;

// Initialize welcome screen with multi-panel flow
function initWelcomeScreen() {
    const welcomeScreen = document.getElementById("welcome-screen");
    const mainMenu = document.querySelector(".overlay");
    const idCardToggle = document.getElementById("id-card-toggle-btn");
    
    const welcomePanel = document.getElementById("welcome-panel");
    const namePanel = document.getElementById("name-panel");
    const avatarPanel = document.getElementById("avatar-panel");
    const tutorialPanel = document.getElementById("tutorial-panel");
    
    // Hide all panels first
    if (welcomePanel) welcomePanel.style.display = "none";
    if (namePanel) namePanel.style.display = "none";
    if (avatarPanel) avatarPanel.style.display = "none";
    if (tutorialPanel) tutorialPanel.style.display = "none";
    
    const tutorialCompleted = saveManager.isTutorialCompleted();
    const username = saveManager.getUsername();
    const avatarId = saveManager.getAvatar();
    
    // Update avatar selection in UI
    selectedAvatar = avatarId;
    
    // Existing player - show welcome panel with ID card
    if (tutorialCompleted && username) {
        showWelcomePanel(username, avatarId);
        if (welcomePanel) welcomePanel.style.display = "flex";
        if (welcomeScreen) welcomeScreen.style.display = "flex";
        if (mainMenu) mainMenu.style.display = "none";
        if (idCardToggle) idCardToggle.style.display = "block";
    }
    // Has name but not completed tutorial - go to avatar selection
    else if (username && username !== "") {
        showAvatarSelector(true); // true = from name flow
        if (avatarPanel) avatarPanel.style.display = "flex";
        if (welcomeScreen) welcomeScreen.style.display = "flex";
        if (mainMenu) mainMenu.style.display = "none";
    }
    // First time - ask for name
    else {
        showNamePrompt();
        if (namePanel) namePanel.style.display = "flex";
        if (welcomeScreen) welcomeScreen.style.display = "flex";
        if (mainMenu) mainMenu.style.display = "none";
    }
}

// Show ID Card panel with user stats
function showWelcomePanel(username, avatarId) {
    const greetingEl = document.getElementById("welcome-greeting");
    const playBtn = document.getElementById("welcome-play");
    const deleteBtn = document.getElementById("welcome-delete");
    const avatarImg = document.getElementById("id-card-avatar-img");
    const nameEl = document.getElementById("id-card-name");
    const levelEl = document.getElementById("id-card-level");
    const legacyBadgeImg = document.getElementById("id-card-legacy-badge");
    const recordNumberEl = document.getElementById("id-card-record-number");
    const hardcoreNumberEl = document.getElementById("id-card-hardcore-number");
    const streakNumber = document.getElementById("id-card-streak-number");
    const streakFire = document.getElementById("id-card-streak-fire");
    const editBtn = document.getElementById("id-card-edit-btn");
    
    const legacyLevel = saveManager.getLegacyLevel();
    const legacyHighScore = saveManager.getLegacyHighScore();
    const dailyStreak = saveManager.getDailyStreak();
    const hardcoreHighScore = saveManager.getHardcoreHighScore();
    
    // Set avatar image
    if (avatarImg) {
        avatarImg.src = `assets/hud/menu/icons/icon${avatarId}.png`;
    }
    
    // Set name with edit capability
    if (nameEl) {
        nameEl.textContent = username;
        nameEl.style.cursor = "pointer";
        nameEl.title = localeManager ? localeManager.get('menu.clickToEdit') : "Click to edit name";
        
        // Remove previous listener to avoid duplicates
        const newNameEl = nameEl.cloneNode(true);
        nameEl.parentNode.replaceChild(newNameEl, nameEl);
        
        newNameEl.addEventListener("click", (e) => {
            e.stopPropagation();
            showNameEditor(newNameEl.textContent);
        });
    }
    
    // Set level text
    if (levelEl) {
        const currentLevelText = localeManager ? localeManager.get('menu.currentLevel') : "Current Level";
        levelEl.textContent = `${currentLevelText}: ${legacyLevel}`;
    }
    
    // Set legacy badge
    if (legacyBadgeImg) {
        const badgeFile = getLegacyBadge(legacyHighScore);
        legacyBadgeImg.src = `assets/hud/badges/${badgeFile}`;
    }

    // Set legacy record
    if (recordNumberEl) {
        const recordText = localeManager ? localeManager.get('menu.record') : "Record";
        recordNumberEl.textContent = `${legacyHighScore}`;
    }

    // Set hardcore record
    if (hardcoreNumberEl) {
        hardcoreNumberEl.textContent = hardcoreHighScore;
    }
    
    // Set streak
    if (streakNumber) {
        streakNumber.textContent = dailyStreak;
    }
    if (streakFire) {
        const fireFile = getDailyFireImage(dailyStreak);
        streakFire.src = `assets/hud/badges/${fireFile}`;
    }

    const welcomeBg = document.querySelector('.welcome-bg');
    if (welcomeBg) {
        welcomeBg.style.opacity = '0';
        welcomeBg.style.visibility = 'hidden';
    }
    
    // Hide greeting text (no longer needed)
    if (greetingEl) {
        greetingEl.style.display = "none";
    }
    
    // Edit button handler
    if (editBtn) {
        editBtn.onclick = () => {
            // Hide welcome panel
            const welcomePanel = document.getElementById("welcome-panel");
            const avatarPanel = document.getElementById("avatar-panel");
            const welcomeBg = document.querySelector('.welcome-bg');
            
            if (welcomePanel) welcomePanel.style.display = "none";
            if (avatarPanel) avatarPanel.style.display = "flex";
            
            // Restore background
            if (welcomeBg) {
                welcomeBg.style.opacity = '1';
                welcomeBg.style.visibility = 'visible';
            }
            
            // Reset selected avatar to current one
            selectedAvatar = saveManager.getAvatar();
            
            // Refresh avatar selector UI
            showAvatarSelector(false);
        };
    }
    
    // Play button handler
    if (playBtn) {
        playBtn.textContent = localeManager ? localeManager.get('menu.play') : "Play";
        playBtn.onclick = () => {
            const welcomeScreen = document.getElementById("welcome-screen");
            const mainMenu = document.querySelector(".overlay");
            if (welcomeScreen) welcomeScreen.style.display = "none";
            if (mainMenu) mainMenu.style.display = "flex";
        };
    }

    // Delete button handler
    if (deleteBtn) {
        deleteBtn.textContent = localeManager ? localeManager.get('menu.deleteData') : "Delete Save";
        
        deleteBtn.onclick = () => {
            const confirmMsg = localeManager 
                ? localeManager.get('menu.confirmDelete')
                : "WARNING: This will delete ALL your game data (progress, settings, everything).\n\nThis cannot be undone!\n\nAre you sure?";
            
            if (confirm(confirmMsg)) {
                saveManager.clearAllGameData(true);
                // Reload the page to reset everything
                window.location.reload();
            }
        };
    }
}

// Show name editor modal
function showNameEditor(currentName) {
    // Create modal overlay for name editing
    const overlay = document.createElement('div');
    overlay.id = 'name-edit-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 100000;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: 'Shampoos';
    `;
    
    const modalBox = document.createElement('div');
    modalBox.style.cssText = `
        background: #2a2a2a;
        border: 3px solid #6a4a2a;
        border-radius: 20px;
        padding: 4vmin 6vmin;
        text-align: center;
        min-width: 250px;
    `;
    
    const promptText = localeManager ? localeManager.get('menu.editName') : "Enter your new name:";
    
    modalBox.innerHTML = `
        <div style="margin-bottom: 3vmin; font-size: 4vmin; color: #ffd78c;">${promptText}</div>
        <input type="text" id="name-edit-input" value="${currentName}" maxlength="20" style="font-family: 'Shampoos'; font-size: 4vmin; padding: 1.5vmin; text-align: center; width: 80%; border-radius: 12px; border: 2px solid #6a4a2a; outline: none;">
        <div style="display: flex; gap: 3vmin; justify-content: center; margin-top: 3vmin;">
            <button id="name-edit-save" style="padding: 1vmin 3vmin; font-family: 'Shampoos'; font-size: 3vmin; background: #4a7c59; color: white; border: none; border-radius: 8px; cursor: pointer;">Save</button>
            <button id="name-edit-cancel" style="padding: 1vmin 3vmin; font-family: 'Shampoos'; font-size: 3vmin; background: #7c4a4a; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
        </div>
    `;
    
    overlay.appendChild(modalBox);
    document.body.appendChild(overlay);
    
    const input = document.getElementById('name-edit-input');
    const saveBtn = document.getElementById('name-edit-save');
    const cancelBtn = document.getElementById('name-edit-cancel');
    
    // Focus and select input
    input.focus();
    input.select();
    
    // Save handler
    saveBtn.onclick = () => {
        const newName = input.value.trim();
        if (newName) {
            saveManager.setUsername(newName);
            // Refresh ID card
            const avatarId = saveManager.getAvatar();
            showWelcomePanel(newName, avatarId);
        }
        overlay.remove();
    };
    
    // Cancel handler
    cancelBtn.onclick = () => {
        overlay.remove();
    };
    
    // Enter key handler
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            const newName = input.value.trim();
            if (newName) {
                saveManager.setUsername(newName);
                const avatarId = saveManager.getAvatar();
                showWelcomePanel(newName, avatarId);
            }
            overlay.remove();
        }
    };
    
    // Close when clicking outside
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    };
}

// Show avatar selection grid
function showAvatarSelector(fromNameFlow = true) {
    const promptEl = document.getElementById("avatar-prompt");
    const confirmBtn = document.getElementById("avatar-confirm");
    const avatarGrid = document.getElementById("avatar-grid");
    
    // Set prompt text
    if (promptEl) {
        promptEl.textContent = localeManager ? localeManager.get('menu.selectAvatar') : "Choose your profile picture:";
    }
    
    // Set confirm button text
    if (confirmBtn) {
        confirmBtn.textContent = localeManager ? localeManager.get('menu.confirm') : "Confirm";
    }
    
    // Highlight selected avatar
    const options = document.querySelectorAll('.avatar-option');
    options.forEach((opt, index) => {
        const avatarNum = parseInt(opt.dataset.avatar);
        if (avatarNum === selectedAvatar) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
        
        // Click handler
        opt.onclick = () => {
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedAvatar = parseInt(opt.dataset.avatar);
        };
    });
    
    // Confirm button handler
    confirmBtn.onclick = () => {
        saveManager.setAvatar(selectedAvatar);
        
        if (fromNameFlow) {
            // After avatar selection, show tutorial prompt
            showTutorialPrompt();
            document.getElementById("avatar-panel").style.display = "none";
            document.getElementById("tutorial-panel").style.display = "flex";
        } else {
            // From edit button - just update the ID card and close avatar selector
            const username = saveManager.getUsername();
            showWelcomePanel(username, selectedAvatar);
            document.getElementById("avatar-panel").style.display = "none";
            document.getElementById("welcome-panel").style.display = "flex";
        }
    };
}

// Show name input panel (first time player)
function showNamePrompt() {
    const promptEl = document.getElementById("name-prompt");
    const inputEl = document.getElementById("username-input");
    const continueBtn = document.getElementById("name-continue");
    
    if (promptEl) {
        promptEl.textContent = localeManager ? localeManager.get('menu.enterName') : "Enter your name, rescuer:";
    }
    if (inputEl) {
        inputEl.placeholder = localeManager ? localeManager.get('menu.namePlaceholder') : "Your name";
        inputEl.value = "";
        inputEl.onkeypress = (e) => {
            if (e.key === 'Enter') {
                const name = inputEl.value.trim();
                if (name) {
                    saveManager.setUsername(name);
                    showAvatarSelector(true);
                    document.getElementById("name-panel").style.display = "none";
                    document.getElementById("avatar-panel").style.display = "flex";
                }
            }
        };
    }
    if (continueBtn) {
        continueBtn.textContent = localeManager ? localeManager.get('menu.continue') : "Continue";
        continueBtn.onclick = () => {
            const name = inputEl.value.trim();
            if (name) {
                saveManager.setUsername(name);
                showAvatarSelector(true);
                document.getElementById("name-panel").style.display = "none";
                document.getElementById("avatar-panel").style.display = "flex";
            }
        };
    }
}

// Show tutorial prompt panel
function showTutorialPrompt() {
    const questionEl = document.getElementById("tutorial-question");
    const yesBtn = document.getElementById("welcome-yes");
    const noBtn = document.getElementById("welcome-no");
    
    if (questionEl) {
        questionEl.innerHTML = (localeManager ? localeManager.get('menu.tutorialQuestion') : "Would you like to play the tutorial?").replace(/\n/g, '<br><br>');
    }
    
    if (yesBtn) {
        yesBtn.textContent = localeManager ? localeManager.get('menu.yes') : "Yep";
        yesBtn.onclick = () => {
            saveManager.setTutorialCompleted(false);
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
            saveManager.saveConfig(config);
            window.location.href = 'pages/game.html';
        };
    }
    
    if (noBtn) {
        noBtn.textContent = localeManager ? localeManager.get('menu.no') : "No ty";
        noBtn.onclick = () => {
            saveManager.setTutorialCompleted(true);
            // After tutorial skip, show ID card panel
            const username = saveManager.getUsername();
            const avatarId = saveManager.getAvatar();
            showWelcomePanel(username, avatarId);
            document.getElementById("tutorial-panel").style.display = "none";
            document.getElementById("welcome-panel").style.display = "flex";
            
            // Show ID card toggle button
            const idCardToggle = document.getElementById("id-card-toggle-btn");
            if (idCardToggle) idCardToggle.style.display = "block";
        };
    }
}

// ==============================================================
// ==================== ID CARD TOGGLE =========================
// ==============================================================

function initIdCardToggle() {
    const toggleBtn = document.getElementById("id-card-toggle-btn");
    const welcomeScreen = document.getElementById("welcome-screen");
    
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            if (welcomeScreen) {
                if (welcomeScreen.style.display === "flex") {
                    welcomeScreen.style.display = "none";
                } else {
                    welcomeScreen.style.display = "flex";
                    // Refresh ID card content
                    const username = saveManager.getUsername();
                    const avatarId = saveManager.getAvatar();
                    showWelcomePanel(username, avatarId);
                }
            }
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
        
        // Clear existing options except default
        while (zoneOptions.length > 0) {
            zoneOptions[0].remove();
        }
        
        // Define available zones
        const allZones = ['backyard', 'desert', 'snow', 'ash'];
        const backyardUnlocked = saveManager.isSecretCodeActivated('back2school');
        
        // Add zones based on unlock status
        for (const zone of allZones) {
            if (zone === 'backyard' && !backyardUnlocked) continue;
            
            const option = document.createElement('option');
            option.value = zone;
            option.textContent = localeManager.get(`menu.punchcard.${zone}`);
            zoneSelect.appendChild(option);
        }
        
        // Set default value if current zone is not available
        const currentZone = document.getElementById("custom-zone-select").getAttribute('data-current') || 'desert';
        if (zoneSelect.querySelector(`option[value="${currentZone}"]`)) {
            zoneSelect.value = currentZone;
        } else {
            zoneSelect.value = 'desert';
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
// ====================== BUTTON SOUND EFECT ===================
// ==============================================================

function addButtonSounds() {
    const buttons = document.querySelectorAll('button, .daily-button, .custom-button, .legacy-button, .option-button, .diary-button, .pc-start, .pc-close, .welcome-btn, .avatar-option, .config-button, .save-btn-prop, .action-btn-side, .lang-btn-prop, .toggle-switch');
    
    buttons.forEach(btn => {
        // Hover sound
        btn.addEventListener('mouseenter', () => {
            audioManager.playHoverSFX();
        });
        
        // Click sound
        btn.addEventListener('click', () => {
            audioManager.playClickSFX();
        });
    });
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

    updateDailyButtonVisibility();
    updatePunchcardBackground();
    
    localeManager.onChange(async () => {
        await initWelcomeScreen();
        applyMenuLanguage();
        updatePunchcardTextures(currentConfig);
    });

    initIdCardToggle();
    const legacyButton = document.querySelector('.legacy-button');
    const dailyButton = document.querySelector('.daily-button');
    const customButton = document.querySelector('.custom-button');
    const punchcardScreen = document.getElementById('punchcard-screen');
    const closeButton = document.querySelector('.pc-close');
    const startButton = document.querySelector('.pc-start');
    addButtonSounds();

    // ----- Legacy Mode Button -----
    legacyButton.addEventListener('click', () => {
        punchcardMode = "legacy";
        punchcardScreen.classList.add('active');
        generateLegacyConfig();
        updatePunchcardScale();
        updateBadges();
        updatePunchcardBackground();
        updateDailyButtonVisibility();

        const startButton = document.querySelector('.pc-start');
        if (startButton) startButton.style.display = "block";
    });

    // ----- Daily Mode Button -----
    dailyButton.addEventListener('click', () => {
        if (saveManager.isDailyAttemptedToday()) {
            const message = localeManager 
                ? localeManager.get('menu.dailyCompleted')
                : "Daily mission already completed today! Come back tomorrow.";
            showModal(message);
        }

        punchcardMode = "daily";
        punchcardScreen.classList.add('active');
        generateDailyConfig();
        updatePunchcardScale();
        updateBadges();
        updatePunchcardBackground();
        
    });

    // ----- Custom Mode Button -----
    customButton.addEventListener("click", () => {
        punchcardMode = "custom";
        punchcardScreen.classList.add('active');
        generateCustomConfig();
        updatePunchcardScale();
        updateBadges();
        updatePunchcardBackground();

        const startButton = document.querySelector('.pc-start');
        if (startButton) startButton.style.display = "block";
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

    // Seed button (set seed) - only for custom mode
    const seedBtn = document.getElementById("pc-seed-btn");
    if (seedBtn) {
        seedBtn.addEventListener("click", () => {
            if (punchcardMode === "custom" && currentConfig) {
                showSeedInputModal(currentConfig.seed, (newSeed) => {
                    currentConfig.seed = newSeed;
                    updateSeedDisplay(newSeed);
                    // Also update the config seed for game generation
                    if (currentConfig) {
                        currentConfig.seed = newSeed;
                    }
                });
            }
        });
    }

    // Dice button (randomize custom selectors)
    const diceBtn = document.getElementById("custom-dice-btn");
    if (diceBtn) {
        diceBtn.addEventListener("click", () => {
            if (punchcardMode === "custom") {
                randomizeCustomSelectors();
                // Generate new random seed
                if (currentConfig) {
                    currentConfig.seed = generateRandomSeed();
                    updateSeedDisplay(currentConfig.seed);
                }
            }
        });
    }
    
    // Seed label click - copy to clipboard
    const seedLabel = document.getElementById("pc-seed-label");
    if (seedLabel) {
        seedLabel.addEventListener("click", () => {
            if (currentConfig && currentConfig.seed) {
                const seedText = currentConfig.seed.toString();
                const copiedText = localeManager ? localeManager.get('menu.punchcard.copied') : "Copied!";
                
                // Try modern clipboard API
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(seedText).then(() => {
                        const originalText = seedLabel.textContent;
                        seedLabel.textContent = `✓ ${copiedText}`;
                        setTimeout(() => {
                            updateSeedDisplay(currentConfig.seed);
                        }, 1500);
                    }).catch(() => {
                        fallbackCopy(seedText, copiedText);
                    });
                } else {
                    fallbackCopy(seedText, copiedText);
                }
            }
        });
    }

    // Fallback copy method (works on older browsers and Cordova)
    function fallbackCopy(text, copiedText) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        // Show feedback
        const seedLabel = document.getElementById("pc-seed-label");
        if (seedLabel) {
            seedLabel.textContent = `✓ ${copiedText}`;
            setTimeout(() => {
                if (currentConfig && currentConfig.seed) {
                    updateSeedDisplay(currentConfig.seed);
                }
            }, 1500);
        }
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

function updatePunchcardBackground() {
    const pcBase = document.querySelector('.pc-base');
    if (!pcBase) return;
    
    const isHardcore = isHardcoreEnabled();
    const isLegacyMode = (punchcardMode === "legacy");
    
    if (isHardcore) {
        pcBase.src = "assets/hud/punchcard/hardcard.png";
    } else {
        pcBase.src = "assets/hud/punchcard/punchcard.png";
    }
}

// Updates all punchcard images and UI elements based on config
function updatePunchcardTextures(config) {

    const seedLabel = document.getElementById("pc-seed-label");
    const dateNote = document.getElementById("pc-date-note");
    const legacySelect = document.getElementById("legacy-character-select");

    // Reset base UI state
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

    // ===== HARDCORE MODE =====
    if (isHardcore) {
        config.goals = 5;
        config.size = 12 + level;
        config.hazards = 5 + level;
        config.obstacles = 10 + level;
        config.zone = "ash";
        
        console.log(`[Hardcore] Level ${level} - Size: ${config.size}, Hazards: ${config.hazards}, Obstacles: ${config.obstacles}, Goals: ${config.goals}`);
        
    } else {
        // SOFTCORE
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
    
    // Hide custom-only elements
    updateCustomElementsVisibility(false);
}

function getZoneByLevel(level) {
    const lvl = Math.floor(Number(level));
    if (lvl <= 9) return "desert";
    if (lvl <= 19) return "snow";
    return "ash";
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
    
    // Update seed display for daily
    updateSeedDisplay(seed);

    const startButton = document.querySelector('.pc-start');
    if (startButton) {
        if (saveManager.isDailyAttemptedToday()) {
            startButton.style.display = "none";
        } else {
            startButton.style.display = "block";
        }
    }
    
    // Hide custom-only elements
    updateCustomElementsVisibility(false);
}

// ==============================================================
// ======================== CUSTOM MODE =========================
// ==============================================================

// Generates custom mode configuration (shows all selects)
function generateCustomConfig() {
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
    
    // Hide legacy and daily badges
    const legacyContainer = document.getElementById("legacy-badge-container");
    const dailyContainer = document.getElementById("daily-badge-container");
    if (legacyContainer) legacyContainer.style.display = "none";
    if (dailyContainer) dailyContainer.style.display = "none";
    updatePunchcardLabelsColor();
    
    // Show custom-only elements
    updateCustomElementsVisibility(true);

    updateCustomTextures();
}

// Rebuilds config from custom selects and renders textures
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
// ======================= SEED SYSTEM ==========================
// ==============================================================

// Generate random seed (1 - 999999999)
function generateRandomSeed() {
    return Math.floor(Math.random() * 999999999) + 1;
}

// Update seed label display (top center)
function updateSeedDisplay(seed) {
    const seedLabel = document.getElementById("pc-seed-label");
    if (seedLabel && localeManager) {
        seedLabel.textContent = `${localeManager.get('menu.punchcard.seed')}${seed}`;
    } else if (seedLabel) {
        seedLabel.textContent = `Seed: ${seed}`;
    }
}

// Show seed input modal
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

// Randomize all custom selectors
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

// Update visibility of custom-only elements
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
    const hardcoreHighScore = saveManager.getHardcoreHighScore();
    const badgeImg = document.getElementById("legacy-record-badge");
    const badgeLabel = document.getElementById("legacy-record-label");
    const isHardcore = isHardcoreEnabled();
    
    if (punchcardMode === "legacy") {
        if (legacyContainer) legacyContainer.style.display = "flex";
        if (dailyContainer) dailyContainer.style.display = "none";
        
        if (badgeImg) {
            if (isHardcore) {
                badgeImg.src = `assets/hud/menu/hardcore.png`;
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
// ====================== DAILY BUTTON VISIBILITY ===============
// ==============================================================

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

// Hardcore verifier
function isHardcoreEnabled() {
    return saveManager.isHardcoreEnabled();
}

// Update scale when window is resized
window.addEventListener('resize', updatePunchcardScale);