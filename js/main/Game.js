/* ========================================================= */
/* ======================== GAME.js ======================== */
/* ========================================================= */
// This script initializes the game screen based on the configuration
// saved by the menu (index.html). It sets the background according to
// the selected zone and prepares the canvas for future game logic.

import { GameManager } from "../managers/GameManager.js";
import { Renderer } from "../views/Renderer.js";
import { AudioManager } from "../managers/AudioManager.js";
import { SaveManager } from "../managers/SaveManager.js";
import { LocaleManager } from "../managers/LocaleManager.js";
import { PathResolver } from "../utils/PathResolver.js";

// ==============================================================
// ====================== INITIALIZATION ========================
// ==============================================================

// Load configuration from localStorage
const saveManager = new SaveManager();
let config;
let localeManager = null;

try {
    config = saveManager.loadConfig();
} catch (e) {
    document.body.style.background = "#333";
    throw new Error("No configuration found.");
}

// ==============================================================
// ====================== LOCALE INIT ===========================
// ==============================================================

// Initialize the locale manager and load language files
async function initLocale() {
    localeManager = new LocaleManager();
    await localeManager.init();
    console.log("LocaleManager initialized, language:", localeManager.currentLocale);
    applyGameLanguage();
}

// Apply translated text to all UI elements
function applyGameLanguage() {
    if (!localeManager) return;
    
    // Scoreboard labels
    const rescuedLabel = document.getElementById("score-label-rescued");
    const markedLabel = document.getElementById("score-labeled");
    const difficultyLabel = document.getElementById("score-label-difficulty");
    const deathsLabel = document.getElementById("score-label-deaths");
    const failedLabel = document.getElementById("score-label-failed");
    const damageLabel = document.getElementById("score-label-damage");
    
    if (rescuedLabel) rescuedLabel.textContent = localeManager.get('game.scoreboard.rescued');
    if (markedLabel) markedLabel.textContent = localeManager.get('game.scoreboard.marked');
    if (difficultyLabel) difficultyLabel.textContent = localeManager.get('game.scoreboard.difficulty');
    if (deathsLabel) deathsLabel.textContent = localeManager.get('game.scoreboard.deaths');
    if (failedLabel) failedLabel.textContent = localeManager.get('game.scoreboard.failed');
    if (damageLabel) damageLabel.textContent = localeManager.get('game.scoreboard.damage');
}

// ==============================================================
// ====================== TUTORIAL INIT =========================
// ==============================================================

// Initialize tutorial mode if needed (must run AFTER localeManager is ready)
async function initTutorial() {
    if (config.mode !== "tutorial") return;
    
    console.log("Initializing tutorial with localeManager:", localeManager);
    const { TutorialManager } = await import("../managers/TutorialManager.js");
    const tutorialManager = new TutorialManager(game, audio, localeManager);
    tutorialManager.init();
    game.setTutorialManager(tutorialManager);
}

// ==============================================================
// ====================== REST OF INIT ==========================
// ==============================================================

// Zone to background image mapping
const zoneMap = {
    "backyard": "backyard.png",
    "desert": "desert.png",
    "snow": "snow.png",
    "ash": "ash.png"
};

// Set body background based on selected zone
const bgPath = PathResolver.resolveAsset('gameWallpaper', zoneMap[config.zone]);
document.body.style.backgroundImage = `url("${bgPath}")`;

// Initialize game engine and audio
const game = new GameManager(config);
const audio = new AudioManager();
const saveManagerVolumes = new SaveManager();
audio.setMusicVolume(saveManagerVolumes.getMusicVolume() / 100);
audio.setSFXVolume(saveManagerVolumes.getSFXVolume() / 100);
audio.setSFXEnabled(saveManagerVolumes.isSFXEnabled());

// Apply saved volume settings
audio.setMusicVolume(saveManager.getMusicVolume() / 100);
audio.setSFXVolume(saveManager.getSFXVolume() / 100);
audio.setSFXEnabled(saveManager.isSFXEnabled());

// Play music based on zone
audio.playMusic(config.zone);

// Start music on first user interaction
const startMusicOnce = () => {
    audio.startMusic();
    window.removeEventListener("keydown", startMusicOnce);
    window.removeEventListener("click", startMusicOnce);
    window.removeEventListener("touchstart", startMusicOnce);
};

window.addEventListener("keydown", startMusicOnce);
window.addEventListener("click", startMusicOnce);
window.addEventListener("touchstart", startMusicOnce);

// Initialize renderer
const canvas = document.getElementById("gameCanvas");
const renderer = new Renderer(canvas, game);
game.setRenderer(renderer);

// ==============================================================
// ====================== TOUCH BUTTONS VISIBILITY ==============
// ==============================================================

// Apply touch buttons visibility based on saved setting
function applyTouchButtonsVisibility() {
    const touchMovement = document.querySelector('.touch-movement');
    const touchFlags = document.querySelector('.touch-flags');
    
    if (!touchMovement || !touchFlags) return;
    
    const touchEnabled = saveManager.getTouchEnabled();
    
    if (touchEnabled) {
        touchMovement.style.display = 'grid';
        touchFlags.style.display = 'grid';
    } else {
        touchMovement.style.display = 'none';
        touchFlags.style.display = 'none';
    }
}

// ==============================================================
// ====================== PAUSE BUTTON ==========================
// ==============================================================

// Initialize pause button functionality
function initPauseButton() {
    const pauseBtn = document.getElementById("pause-btn");
    if (pauseBtn) {
        pauseBtn.addEventListener("click", () => {
            game.pauseGame();
        });
    }
}

// ==============================================================
// ======================== HUD SYSTEM ==========================
// ==============================================================

// Main HUD update function
function updateHUD() {
    const player = game.getPlayer();
    if (!player) return;
    
    // Character Icon
    const characterIcon = document.getElementById("hud-character-icon");
    if (characterIcon) {
        characterIcon.src = PathResolver.resolveAsset('gameCharacterIcon', `${player.getType()}.png`);
    }

    // Health Display
    const hp = player.getHp();
    const maxHp = getMaxHpByCharacter(player.getType());
    const healthIcon = document.getElementById("hud-health-icon");
    const healthText = document.getElementById("hud-health-text");

    if (healthText) healthText.textContent = hp;

    if (healthIcon) {
        if (hp === maxHp) {
            healthIcon.src = PathResolver.resolveAsset('gameStats', 'fulllife.png');
        } else if (hp >= maxHp / 2) {
            healthIcon.src = PathResolver.resolveAsset('gameStats', 'halflife.png');
        } else if (hp > 0) {
            healthIcon.src = PathResolver.resolveAsset('gameStats', 'quarterlife.png');
        } else {
            healthIcon.src = PathResolver.resolveAsset('gameStats', 'emptylife.png');
        }
    }

    // Flags Display
    const flagsText = document.getElementById("hud-flags-text");
    if (flagsText) flagsText.textContent = player.getFlags();

    // Rescued Children Display
    const rescuedText = document.getElementById("hud-rescued-text");
    if (rescuedText) rescuedText.textContent = player.getRescued();

    // Remaining Goals Display
    const goalsText = document.getElementById("hud-goals-text");
    if (goalsText && game.charCtrl) {
        goalsText.textContent = game.charCtrl.getRemainingGoals();
    }

    // Update additional UI elements
    updateCurrentTile();
    updateHeightometer();
    updateGeologicalAlert();
    updateFatigue();
}

// Update fatigue/tired icon
function updateFatigue() {
    const player = game.getPlayer();
    const rescued = player.getRescued();
    const force = player.getForce();
    const tiredIcon = document.getElementById("hud-tired-icon");
    
    if (rescued >= force) {
        tiredIcon.style.display = "block";
    } else {
        tiredIcon.style.display = "none";
    }
}

// Update geological hazard/obstacle alerts (Mosquito ability)
function updateGeologicalAlert() {
    if (game.getPlayer().getAbilityId() != 2) {
        document.getElementById("hud-geohaz-alert").style.display = "none";
        document.getElementById("hud-geoobs-alert").style.display = "none";
        return;
    }
    
    const board = game.getBoard();
    const player = game.getPlayer();
    const x = player.getPosX();
    const y = player.getPosY();
    
    let hasDamage = false;
    let hasKill = false;
    let hasLive = false;
    let hasRiver = false;
    let hasPit = false;
    
    const directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    
    for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
            const hazardType = board[nx][ny].getHazardtype();
            const obstacleType = board[nx][ny].getObstacletype();
                
            if (hazardType === "mine" || hazardType === "spiderMine") {
                hasKill = true;
            } else if (hazardType === "cactus" || hazardType === "deadbush" || board[nx][ny].getDamageratio()) {
                hasDamage = true;
            } else if (board[nx][ny].isHazardlive()) {
                hasLive = true;
            }
            
            if (obstacleType === "river") {
                hasRiver = true;
            } else if (obstacleType === "pit") {
                hasPit = true;
            }
        }
    }
    
    const alertIcon = document.getElementById("hud-geohaz-alert");
    const alertIcon2 = document.getElementById("hud-geoobs-alert");
    let alertType = null;
    let alertType2 = null;
    
    if (hasLive) {
        alertType = "live.png";
    } else if (hasDamage && hasKill) {
        alertType = "mixed.png";
    } else if (hasKill) {
        alertType = "kill.png";
    } else if (hasDamage) {
        alertType = "damage.png";
    }

    if (hasRiver) {
        alertType2 = "obsriver.png";
    } else if (hasPit && hasRiver) {
        alertType2 = "obsmixed.png";
    } else if (hasPit) {
        alertType2 = "obspit.png";
    }
    
    if (alertType) {
        alertIcon.src = PathResolver.resolveAsset('gameStats', alertType);
        alertIcon.style.display = "block";
    } else {
        alertIcon.style.display = "none";
    }

    if (alertType2) {
        alertIcon2.src = PathResolver.resolveAsset('gameStats', alertType2);
        alertIcon2.style.display = "block";
    } else {
        alertIcon2.style.display = "none";
    }
}

// Update current tile information display
function updateCurrentTile() {
    const board = game.getBoard();
    const player = game.getPlayer();
    if (!board || !player) return;

    const tileX = player.getPosX();
    const tileY = player.getPosY();
    const tile = board[tileX][tileY];

    const tileIcon = document.getElementById("hud-tile-icon");
    if (!tileIcon) return;

    let textureName = null;
    const zone = game.getZone();

    const hazardType = tile.getHazardtype();
    const obstacleType = tile.getObstacletype();
    const hazardCount = tile.getHazardcount();
    const goalType = tile.getGoaltype();
    const pipe = tile.isSmoke();

    if (!pipe) {
        if (hazardType !== "none") {
            textureName = hazardType;
        } else if (obstacleType !== "none") {
            textureName = obstacleType;
        } else if (hazardCount > 0) {
            textureName = hazardCount.toString();
        } else if (goalType !== "none") {
            textureName = goalType;
        } else if (tile.isStart()) {
            textureName = "start";
        } else {
            textureName = null;
        }
    }

    if (textureName && obstacleType !== "none") {
        tileIcon.src = PathResolver.resolveAsset('tiles', zone, `${textureName}.png`);
        tileIcon.style.display = "block";
    } else if (textureName) {
        tileIcon.src = PathResolver.resolveAsset('tiles', `${textureName}.png`);
        tileIcon.style.display = "block";
    } else {
        tileIcon.style.display = "none";
    }
}

// Update heightometer display
function updateHeightometer() {
    const board = game.getBoard();
    const player = game.getPlayer();
    if (!board || !player) return;
    
    const tileX = player.getPosX();
    const tileY = player.getPosY();
    const tile = board[tileX][tileY];
    const height = tile.getTileheight();
    
    const heightometerNumber = document.getElementById("hud-heightometer-number");
    if (heightometerNumber) {
        heightometerNumber.textContent = height;
    }
}

// Get maximum health points based on character type
function getMaxHpByCharacter(characterType) {
    switch (characterType) {
        case "chef": return 5;
        case "mosquito": return 3;
        case "mommy": return 10;
        case "scout": return 1;
        case "student": return 2;
        default: return 5;
    }
}

// ==============================================================
// ====================== PAUSE ON ESC KEY ======================
// ==============================================================

// Pause game when ESC key is pressed
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        e.preventDefault();
        game.pauseGame();
    }
});

// ==============================================================
// ====================== BUTTON SOUND EFECT ===================
// ==============================================================

function addGameButtonSounds() {
    const buttons = document.querySelectorAll('.continue-btn, .retry-btn, .home-btn, .random-btn, .pause-btn, .pause-btn-img');
    
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            audio.playHoverSFX();
        });
        
        btn.addEventListener('click', () => {
            audio.playClickSFX();
        });
    });
}

// ==============================================================
// ==================== RENDERER EXTENSIONS =====================
// ==============================================================

// Extend renderer to update HUD after each frame
const originalRender = renderer.render;
renderer.render = function() {
    originalRender.call(renderer);
    updateHUD();
};

// ==============================================================
// ==================== INPUT HANDLING =========================
// ==============================================================

// Arrow keys for flag controls
window.addEventListener("keydown", (e) => {
    switch (e.key) {
        case "ArrowUp":    game.handleFlagDirection("Up"); break;
        case "ArrowDown":  game.handleFlagDirection("Down"); break;
        case "ArrowLeft":  game.handleFlagDirection("Left"); break;
        case "ArrowRight": game.handleFlagDirection("Right"); break;
    }
});

// WASD keys for movement
window.addEventListener("keydown", (e) => {
    switch (e.key.toLowerCase()) {
        case "w": game.handleInput("Up"); break;
        case "s": game.handleInput("Down"); break;
        case "a": game.handleInput("Left"); break;
        case "d": game.handleInput("Right"); break;
    }
});

// ===== PAUSE ON ESC KEY =====
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        e.preventDefault();
        game.pauseGame();
    }
});

// Extend movement input to trigger animations and sound
const originalHandleInput = game.handleInput.bind(game);
game.handleInput = function(direction) {
    const oldX = game.getPlayer().getPosX();
    const oldY = game.getPlayer().getPosY();

    originalHandleInput(direction);

    const newX = game.getPlayer().getPosX();
    const newY = game.getPlayer().getPosY();
    
    if (oldX !== newX || oldY !== newY) {
        renderer.justMoved = true;
        renderer.justMovedFrames = 12;
        audio.playMoveSFX();
    }
    updateHUD();
};

// Extend flag input to trigger animations and sound
const originalHandleFlag = game.handleFlagDirection.bind(game);
game.handleFlagDirection = function(direction) {
    const oldX = game.getPlayer().getPosX();
    const oldY = game.getPlayer().getPosY();
    const isScout = game.getPlayer().getAbilityId() === 4;
    
    originalHandleFlag(direction);
    
    const newX = game.getPlayer().getPosX();
    const newY = game.getPlayer().getPosY();
    audio.playFlagSFX();
    
    if (isScout && (oldX !== newX || oldY !== newY)) {
        renderer.justMoved = true;
        renderer.justMovedFrames = 12;
        renderer.isScoutJump = true;
    } else if (oldX !== newX || oldY !== newY) {
        renderer.justMoved = true;
        renderer.justMovedFrames = 10;
        renderer.isScoutJump = false;
    }
    updateHUD();
};

// ==============================================================
// ====================== GAME LOOP ============================
// ==============================================================

// Game render loop with FPS limiting
let lastRender = 0;
const FPS_LIMIT = 60;
const FRAME_TIME = 30 / FPS_LIMIT;

function loop(now) {
    requestAnimationFrame(loop);
    
    if (now - lastRender < FRAME_TIME) return;
    lastRender = now;
    
    renderer.render();
}
requestAnimationFrame(loop);

// ==============================================================
// ====================== TOUCH CONTROLS =======================
// ==============================================================

// Movement buttons (WASD style)
document.querySelectorAll('.touch-btn').forEach(btn => {
    const handleMove = (e) => {
        e.preventDefault();
        const dir = btn.dataset.dir;
        if (dir) {
            // Dispatch custom event for tutorial
            const customEvent = new CustomEvent('touch-move', { detail: { source: "touch", dir: dir } });
            document.dispatchEvent(customEvent);
            game.handleInput(dir);
        }
    };
    
    btn.addEventListener('click', handleMove);
    btn.addEventListener('touchstart', handleMove);
});

// Flag buttons (arrow keys style)
document.querySelectorAll('.flag-btn').forEach(btn => {
    const handleFlag = (e) => {
        e.preventDefault();
        const dir = btn.dataset.flag;
        if (dir) game.handleFlagDirection(dir);
    };
    
    btn.addEventListener('click', handleFlag);
    btn.addEventListener('touchstart', handleFlag);
});

// ==============================================================
// ====================== MODAL MESSAGE =========================
// ==============================================================

function initModal() {
    const modal = document.getElementById("modal-dialog");
    const modalText = document.getElementById("modal-text");
    const okBtn = document.getElementById("modal-ok");
    
    if (!modal) return;
    
    // Close when clicking outside
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
        
        // Store callback
        window._modalOnClose = onClose;
        
        // Setup OK button
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

initModal();

// ==============================================================
// ==================== STARTUP SEQUENCE ========================
// ==============================================================

// Main startup function - ensures correct order of async operations
async function start() {
    saveManager.syncOldTotalPoints();
    await initLocale();      // Load language FIRST
    game.setLocaleManager(localeManager);  // Set locale manager BEFORE starting game
    
    // Start the game ONLY after localeManager is set
    game.startGame();
    
    await initTutorial();    // Then initialize tutorial (needs localeManager)
    updateHUD();             // Finally update HUD
    applyTouchButtonsVisibility();
    initPauseButton();       // Initialize pause button
    addGameButtonSounds();
    
    // Force resize after game is ready
    setTimeout(() => {
        renderer.resize();
        console.log("[Game] Forced resize after game ready");
    }, 200);
}

// Start the game
start();