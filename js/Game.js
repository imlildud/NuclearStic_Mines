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

    if (textureName) {
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
    originalHandleInput(direction);
    updateHUD();
};

const originalHandleFlag = game.handleFlagDirection.bind(game);
game.handleFlagDirection = function(direction) {
    originalHandleFlag(direction);
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