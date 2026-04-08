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