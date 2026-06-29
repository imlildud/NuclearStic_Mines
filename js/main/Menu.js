/* ========================================================= */
/* ========================= MENU ========================== */
/* ========================================================= */
// Main menu entry point - orchestrates all UI modules

import { SaveManager } from "../managers/SaveManager.js";
import { AudioManager } from "../managers/AudioManager.js";
import { LocaleManager } from "../managers/LocaleManager.js";
import { RankManager } from "./modules/RankManager.js";
import { WelcomePanel } from "./modules/WelcomePanel.js";
import { PunchcardPanel } from "./modules/PunchcardPanel.js";
import { KeychainSelector } from "./modules/KeychainSelector.js";
import { PathResolver } from "../utils/PathResolver.js";

// ==================== INSTANCES ====================

const saveManager = new SaveManager();
const audioManager = new AudioManager();
let localeManager = null;

// ==================== INITIALIZATION ====================

// Apply saved volume settings
const savedMusicVol = saveManager.getMusicVolume();
const savedSfxVol = saveManager.getSFXVolume();
audioManager.setMusicVolume(savedMusicVol / 100);
audioManager.setSFXVolume(savedSfxVol / 100);
audioManager.setSFXEnabled(saveManager.isSFXEnabled());

// Add button hover/click sounds
function addButtonSounds() {
    const buttons = document.querySelectorAll('button, .daily-button, .custom-button, .legacy-button, .option-button, .diary-button, .pc-start, .pc-close, .welcome-btn, .avatar-option, .config-button, .save-btn-prop, .action-btn-side, .lang-btn-prop, .toggle-switch');
    
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => audioManager.playHoverSFX());
        btn.addEventListener('click', () => audioManager.playClickSFX());
    });
}

// Apply menu language
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
}

// ==================== DOM EVENT LISTENERS ====================

document.addEventListener("DOMContentLoaded", async () => {
    // Initialize LocaleManager
    localeManager = new LocaleManager();
    await localeManager.init();
    
    // Set locale managers to modules
    WelcomePanel.setLocaleManager(localeManager);
    PunchcardPanel.setLocaleManager(localeManager);
    
    // Initialize welcome screen
    await WelcomePanel.initWelcomeScreen();
    applyMenuLanguage();
    
    // Update UI based on hardcore state
    PunchcardPanel.updateDailyButtonVisibility();
    PunchcardPanel.updatePunchcardBackground();
    
    // Handle locale changes
    localeManager.onChange(async () => {
        await WelcomePanel.initWelcomeScreen();
        applyMenuLanguage();
        PunchcardPanel.updatePunchcardTextures(PunchcardPanel.getCurrentConfig());
    });
    
    // Initialize ID card toggle
    WelcomePanel.initIdCardToggle();
    addButtonSounds();
    
    // DOM elements
    const legacyButton = document.querySelector('.legacy-button');
    const dailyButton = document.querySelector('.daily-button');
    const customButton = document.querySelector('.custom-button');
    const punchcardScreen = document.getElementById('punchcard-screen');
    const closeButton = document.querySelector('.pc-close');
    const startButton = document.querySelector('.pc-start');
    
    // ----- Legacy Mode Button -----
    legacyButton.addEventListener('click', () => {
        punchcardScreen.classList.add('active');
        PunchcardPanel.generateLegacyConfig();
        PunchcardPanel.updatePunchcardScale();
        PunchcardPanel.updateBadges();
        PunchcardPanel.updatePunchcardBackground();
        PunchcardPanel.updateDailyButtonVisibility();
        
        const startBtn = document.querySelector('.pc-start');
        if (startBtn) startBtn.style.display = "block";
    });
    
    // ----- Daily Mode Button -----
    dailyButton.addEventListener('click', () => {
        if (saveManager.isDailyAttemptedToday()) {
            const message = localeManager 
                ? localeManager.get('menu.dailyCompleted')
                : "Daily mission already completed today! Come back tomorrow.";
            PunchcardPanel.showModal(message);
            return;
        }
        
        punchcardScreen.classList.add('active');
        PunchcardPanel.generateDailyConfig();
        PunchcardPanel.updatePunchcardScale();
        PunchcardPanel.updateBadges();
        PunchcardPanel.updatePunchcardBackground();
    });
    
    // ----- Custom Mode Button -----
    customButton.addEventListener("click", () => {
        punchcardScreen.classList.add('active');
        PunchcardPanel.generateCustomConfig();
        PunchcardPanel.updatePunchcardScale();
        PunchcardPanel.updateBadges();
        PunchcardPanel.updatePunchcardBackground();
        
        const startBtn = document.querySelector('.pc-start');
        if (startBtn) startBtn.style.display = "block";
    });
    
    // Legacy character select
    document.getElementById("legacy-character-select")
        .addEventListener("change", (e) => {
            const value = e.target.value;
            const config = PunchcardPanel.getCurrentConfig();
            if (config && config.mode === "legacy") {
                config.character = value;
                PunchcardPanel.updatePunchcardTextures(config);
            }
        });
    
    // Start button
    startButton.addEventListener('click', () => {
        const config = PunchcardPanel.getCurrentConfig();
        if (!config) return;
        audioManager.playSFX("grade.mp3", false, 0.5);
        saveManager.saveConfig(config);
        PathResolver.goToGame();
    });
    
    // Custom mode select listeners
    document.getElementById("custom-character-select")
        .addEventListener("change", () => PunchcardPanel.updateCustomTextures());
    document.getElementById("custom-size-select")
        .addEventListener("change", () => PunchcardPanel.updateCustomTextures());
    document.getElementById("custom-hazards-select")
        .addEventListener("change", () => PunchcardPanel.updateCustomTextures());
    document.getElementById("custom-obstacles-select")
        .addEventListener("change", () => PunchcardPanel.updateCustomTextures());
    document.getElementById("custom-wanted-select")
        .addEventListener("change", () => PunchcardPanel.updateCustomTextures());
    document.getElementById("custom-zone-select")
        .addEventListener("change", () => PunchcardPanel.updateCustomTextures());
    
    // Close button
    closeButton.addEventListener('click', () => {
        punchcardScreen.classList.remove('active');
    });
    
    // Options button
    const optionButton = document.querySelector('.option-button');
    if (optionButton) {
        optionButton.addEventListener('click', () => {
            PathResolver.goToConfig();
        });
    }
    
    // Seed button (custom mode only)
    const seedBtn = document.getElementById("pc-seed-btn");
    if (seedBtn) {
        seedBtn.addEventListener("click", () => {
            const config = PunchcardPanel.getCurrentConfig();
            if (config && config.mode === "custom") {
                PunchcardPanel.showSeedInputModal(config.seed, (newSeed) => {
                    config.seed = newSeed;
                    PunchcardPanel.updateSeedDisplay(newSeed);
                });
            }
        });
    }

    // Keychain button (custom mode only)
    const keychainBtn = document.getElementById("pc-keychain-btn");
    if (keychainBtn) {
        KeychainSelector.setLocaleManager(localeManager);
        
        keychainBtn.addEventListener("click", () => {
            const config = PunchcardPanel.getCurrentConfig();
            if (config && config.mode === "custom") {
                // Obtener keychains actuales
                const currentKeychains = PunchcardPanel.getCustomKeychains();
                
                KeychainSelector.show(currentKeychains, (selected) => {
                    PunchcardPanel.setCustomKeychains(selected);
                    console.log("[Menu] Keychains selected:", selected);
                });
            }
        });
    }
    
    // Dice button (randomize custom selectors)
    const diceBtn = document.getElementById("custom-dice-btn");
    if (diceBtn) {
        diceBtn.addEventListener("click", () => {
            const config = PunchcardPanel.getCurrentConfig();
            if (config && config.mode === "custom") {
                PunchcardPanel.randomizeCustomSelectors();
                config.seed = PunchcardPanel.generateRandomSeed();
                PunchcardPanel.updateSeedDisplay(config.seed);
            }
        });
    }
    
    // Seed label click - copy to clipboard
    const seedLabel = document.getElementById("pc-seed-label");
    if (seedLabel) {
        seedLabel.addEventListener("click", () => {
            const config = PunchcardPanel.getCurrentConfig();
            if (config && config.seed) {
                const seedText = config.seed.toString();
                const copiedText = localeManager ? localeManager.get('menu.punchcard.copied') : "Copied!";
                
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(seedText).then(() => {
                        seedLabel.textContent = `✓ ${copiedText}`;
                        setTimeout(() => {
                            PunchcardPanel.updateSeedDisplay(config.seed);
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
        
        const seedLabel = document.getElementById("pc-seed-label");
        if (seedLabel) {
            seedLabel.textContent = `✓ ${copiedText}`;
            setTimeout(() => {
                const config = PunchcardPanel.getCurrentConfig();
                if (config && config.seed) {
                    PunchcardPanel.updateSeedDisplay(config.seed);
                }
            }, 1500);
        }
    }
});

// ==============================================================
// ======================== MUSIC SYSTEM ========================
// ==============================================================

audioManager.playMenuMusic();

const startMusicOnce = () => {
    audioManager.startMusic();
    window.removeEventListener("keydown", startMusicOnce);
    window.removeEventListener("click", startMusicOnce);
    window.removeEventListener("touchstart", startMusicOnce);
};

window.addEventListener("keydown", startMusicOnce);
window.addEventListener("click", startMusicOnce);
window.addEventListener("touchstart", startMusicOnce);

window.addEventListener('resize', () => PunchcardPanel.updatePunchcardScale());