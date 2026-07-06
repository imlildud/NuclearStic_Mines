/* ========================================================= */
/* ======================== GAME.js ======================== */
/* ========================================================= */
// Main entry point - orchestrates all game modules

import { GameInitializer } from "./modules/GameInitializer.js";
import { HUDManager } from "./modules/HUDManager.js";
import { InputManager } from "./modules/InputManager.js";
import { GameLoop } from "./modules/GameLoop.js";

// ==============================================================
// ==================== INITIALIZATION ==========================
// ==============================================================

const initializer = new GameInitializer();

// Load config
initializer.loadConfig();

// Set background
initializer.setBackground();

// Init locale
await initializer.initLocale();

// Init game and audio
const { game, audio } = initializer.initGame();
game.setLocaleManager(initializer.localeManager);

// Apply volume settings
initializer.applyVolumeSettings();

// Init renderer
const renderer = initializer.initRenderer();

// Play music
initializer.playMusic();

// ==============================================================
// ==================== HUD MANAGER =============================
// ==============================================================

const hudManager = new HUDManager(game);
hudManager.setLocaleManager(initializer.localeManager);
hudManager.applyGameLanguage();

// ==============================================================
// ==================== INPUT MANAGER ===========================
// ==============================================================

const inputManager = new InputManager(game, renderer, audio);

// ==============================================================
// ==================== GAME LOOP ===============================
// ==============================================================

const gameLoop = new GameLoop(renderer, hudManager);

// ==============================================================
// ==================== TOUCH BUTTONS VISIBILITY ================
// ==============================================================

function applyTouchButtonsVisibility() {
    const touchMovement = document.querySelector('.touch-movement');
    const touchFlags = document.querySelector('.touch-flags');
    if (!touchMovement || !touchFlags) return;
    
    const saveManager = initializer.saveManager;
    const touchEnabled = saveManager.getTouchEnabled();
    
    touchMovement.style.display = touchEnabled ? 'grid' : 'none';
    touchFlags.style.display = touchEnabled ? 'grid' : 'none';
}

// ==============================================================
// ==================== PAUSE BUTTON ============================
// ==============================================================

function initPauseButton() {
    const pauseBtn = document.getElementById("pause-btn");
    if (pauseBtn) {
        pauseBtn.addEventListener("click", () => game.pauseGame());
    }
}

// ==============================================================
// ==================== BUTTON SOUND EFFECTS ====================
// ==============================================================

function addGameButtonSounds() {
    const buttons = document.querySelectorAll('.continue-btn, .retry-btn, .home-btn, .random-btn, .pause-btn, .pause-btn-img');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => audio.playHoverSFX());
        btn.addEventListener('click', () => audio.playClickSFX());
    });
}

// ==============================================================
// ==================== MODAL ===================================
// ==============================================================

function initModal() {
    const modal = document.getElementById("modal-dialog");
    const modalText = document.getElementById("modal-text");
    const okBtn = document.getElementById("modal-ok");
    
    if (!modal) return;
    
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
            if (window._modalOnClose) {
                window._modalOnClose();
                window._modalOnClose = null;
            }
        }
    });
    
    window.addEventListener('game:showMessage', (e) => {
        const message = e.detail.message;
        const onClose = e.detail.onClose;
        
        modalText.innerHTML = message.replace(/\n/g, '<br><br>');
        modal.style.display = "flex";
        
        window._modalOnClose = onClose;
        
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        
        newOkBtn.addEventListener("click", () => {
            modal.style.display = "none";
            if (window._modalOnClose) {
                window._modalOnClose();
                window._modalOnClose = null;
            }
        });
    });
}

// ==============================================================
// ==================== STARTUP SEQUENCE ========================
// ==============================================================

async function start() {
    const saveManager = initializer.saveManager;
    const isHardcore = saveManager.isHardcoreEnabled();
    
    if (isHardcore) {
        saveManager.syncOldHardcoreTotalPoints();
    } else {
        saveManager.syncOldTotalPoints();
    }
    
    // Start the game
    await initializer.startGame();
    
    // Initialize tutorial if needed
    await initializer.initTutorial();
    
    // Apply UI settings
    applyTouchButtonsVisibility();
    initPauseButton();
    addGameButtonSounds();
    initModal();
    
    // Start game loop
    gameLoop.start();
    
    // Force resize after game is ready
    setTimeout(() => {
        renderer.resize();
        console.log("[Game] Forced resize after game ready");
    }, 200);
}

// Start the game
start();