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
    1: "desert.png",
    2: "snow.png",
    3: "ash.png"
};

document.body.style.backgroundImage =
    `url("../assets/hud/game/wallpaper/${zoneMap[config.zone]}")`;

// Game engine motor
const game = new GameManager(config);
game.startGame();

// Renderer maded
const canvas = document.getElementById("gameCanvas");
const renderer = new Renderer(canvas, game);

// Loop
function loop() {
    renderer.render();
    requestAnimationFrame(loop);
}
loop();

// Input
window.addEventListener("keydown", (e) => {
    switch (e.key.toLowerCase()) {
        case "w": game.handleInput("Up"); break;
        case "s": game.handleInput("Down"); break;
        case "a": game.handleInput("Left"); break;
        case "d": game.handleInput("Right"); break;
    }
});