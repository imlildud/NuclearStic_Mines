/* ========================================================= */
/* ======================== GAME.js ======================== */
/* ========================================================= */

// This script initializes the game screen based on the configuration
// saved by the menu (index.html). It sets the background according to
// the selected zone and prepares the canvas for future game logic.

import { GameManager } from "./GameManager.js";
import { Renderer } from "./Renderer.js";

const configJSON = localStorage.getItem("gameConfig");

if (!configJSON) {
    document.body.style.background = "#333";
    throw new Error("No configuration found.");
}

const config = JSON.parse(configJSON);
const debug = document.getElementById("debugPanel");

const zoneMap = {
    "desert": "desert.png",
    "snow": "snow.png",
    "ash": "ash.png"
};

document.body.style.backgroundImage =
    `url("../assets/hud/game/wallpaper/${zoneMap[config.zone]}")`;

// Game engine motor
const game = new GameManager(config);
game.startGame();

// Renderer maded
const canvas = document.getElementById("gameCanvas");
const renderer = new Renderer(canvas, game);
window.addEventListener("keydown", (e) => {
    switch (e.key) {
        case "ArrowUp":    game.handleFlagDirection("Up"); break;
        case "ArrowDown":  game.handleFlagDirection("Down"); break;
        case "ArrowLeft":  game.handleFlagDirection("Left"); break;
        case "ArrowRight": game.handleFlagDirection("Right"); break;
    }
});

// ======================================================
// ======================== HUD =========================
// ======================================================

function updateHUD() {
    const player = game.getPlayer();
    if (!player) return;
    
    // Character icon
    const characterIcon = document.getElementById("hud-character-icon");
    if (characterIcon) {
        characterIcon.src = `../assets/hud/game/charactericon/${player.getType()}.png`;
    }

    // Health
    const hp = player.getHp();
    const maxHp = getMaxHpByCharacter(player.getType());
    const healthIcon = document.getElementById("hud-health-icon");
    const healthText = document.getElementById("hud-health-text");

    if (healthText) healthText.textContent = hp;

    if (healthIcon) {
        if (hp === maxHp) {
            healthIcon.src = "../assets/hud/game/stats/fulllife.png";
        } else if (hp >= maxHp / 2) {
            healthIcon.src = "../assets/hud/game/stats/halflife.png";
        } else if (hp > 0) {
            healthIcon.src = "../assets/hud/game/stats/quarterlife.png";
        } else {
            healthIcon.src = "../assets/hud/game/stats/emptylife.png";
        }
    }

    // Flags
    const flagsText = document.getElementById("hud-flags-text");
    if (flagsText) flagsText.textContent = player.getFlags();

    // Rescued children
    const rescuedText = document.getElementById("hud-rescued-text");
    if (rescuedText) rescuedText.textContent = player.getRescued();

    // Remaining goals (necesitas exponerlo en GameManager)
    const goalsText = document.getElementById("hud-goals-text");
    if (goalsText && game.charCtrl) {
        goalsText.textContent = game.charCtrl.getRemainingGoals();
    }

    updateCurrentTile();
    updateGeologicalAlert();
    updateFatigue();  
}

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
        alertIcon.src = `../assets/hud/game/stats/${alertType}`;
        alertIcon.style.display = "block";
    } else {
        alertIcon.style.display = "none";
    }

    if (alertType2) {
        alertIcon2.src = `../assets/hud/game/stats/${alertType2}`;
        alertIcon2.style.display = "block";
    } else {
        alertIcon2.style.display = "none";
    }
}

// Current tile
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

    if (textureName && obstacleType !== "none"){
        tileIcon.src = `../assets/sprites/tiles/${zone}/${textureName}.png`;
        tileIcon.style.display = "block";
    }
    else if (textureName) {
        tileIcon.src = `../assets/sprites/tiles/${textureName}.png`;
        tileIcon.style.display = "block";
    } else {
        tileIcon.style.display = "none";
    }
}

function getMaxHpByCharacter(characterType) {
    switch (characterType) {
        case "chef": return 5;
        case "mosquito": return 3;
        case "mommy": return 10;
        case "scout": return 1;
        default: return 5;
    }
}

const originalRender = renderer.render;
renderer.render = function() {
    originalRender.call(renderer);
    updateHUD();
};

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
    }
    updateHUD();
};

const originalHandleFlag = game.handleFlagDirection.bind(game);
game.handleFlagDirection = function(direction) {
    const oldX = game.getPlayer().getPosX();
    const oldY = game.getPlayer().getPosY();
    const isScout = game.getPlayer().getAbilityId() === 4;
    
    originalHandleFlag(direction);
    
    const newX = game.getPlayer().getPosX();
    const newY = game.getPlayer().getPosY();
    
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

updateHUD();

// Loop
let lastRender = 0;
const FPS_LIMIT = 60; // 30 frames por segundo
const FRAME_TIME = 30 / FPS_LIMIT;

function loop(now) {
    requestAnimationFrame(loop);
    
    if (now - lastRender < FRAME_TIME) return;
    lastRender = now;
    
    renderer.render();
}
requestAnimationFrame(loop);

// Input
window.addEventListener("keydown", (e) => {
    switch (e.key.toLowerCase()) {
        case "w": game.handleInput("Up"); break;
        case "s": game.handleInput("Down"); break;
        case "a": game.handleInput("Left"); break;
        case "d": game.handleInput("Right"); break;
    }
});

// ==================== TOUCH CONTROLS ====================

// Movement buttons
document.querySelectorAll('.touch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const dir = btn.dataset.dir;
        if (dir) game.handleInput(dir);
    });
    
    // Para móvil, también touchstart
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const dir = btn.dataset.dir;
        if (dir) game.handleInput(dir);
    });
});

// Flag buttons
document.querySelectorAll('.flag-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const dir = btn.dataset.flag;
        if (dir) game.handleFlagDirection(dir);
    });
    
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const dir = btn.dataset.flag;
        if (dir) game.handleFlagDirection(dir);
    });
});