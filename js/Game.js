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

debug.innerHTML = `
Character: ${config.character}<br>
Size: ${config.size}<br>
Hazards: ${config.hazards}<br>
Obstacles: ${config.obstacles}<br>
Goals: ${config.goals}<br>
Zone: ${config.zone}
`;

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
        case "w": game.handleInput("Left"); break;
        case "s": game.handleInput("Right"); break;
        case "a": game.handleInput("Up"); break;
        case "d": game.handleInput("Down"); break;
    }
});