// ==============================================================
// ====================== UI MANAGER ============================
// ==============================================================
// Handles all UI modals (pause, level start, gameover)

import { PathResolver } from "../utils/PathResolver.js";

export class UIManager {
    
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    getText(key) {
        return this.gameManager.getText ? this.gameManager.getText(key) : key;
    }

    async showPauseModal(charCtrl, config, board, gm) {
        return new Promise((resolve) => {
            const modal = document.getElementById("pause-modal");
            const titleEl = document.getElementById("pause-title");
            const seedEl = document.getElementById("pause-seed");
            const statsEl = document.getElementById("pause-stats");
            const childrenContainer = document.getElementById("pause-children");
            const continueBtn = document.getElementById("pause-continue");
            const exitBtn = document.getElementById("pause-exit");
            
            if (!modal) {
                resolve();
                return;
            }
            
            childrenContainer.innerHTML = "";
            titleEl.textContent = this.getText('game.paused');
            
            if (seedEl) {
                const seedText = config.seed ? `Seed: ${config.seed}` : 'Seed: ---';
                seedEl.textContent = seedText;
            }
            
            const totalGoals = charCtrl.getTotalGoals();
            const remainingGoals = charCtrl.getRemainingGoals();
            const statsText = `${this.getText('game.wanted')}: ${totalGoals} | ${this.getText('game.remaining')}: ${remainingGoals}`;
            statsEl.textContent = statsText;
            
            const childTypes = this.getChildTypesFromBoard(board);
            childTypes.forEach(childType => {
                const childDiv = document.createElement("div");
                childDiv.className = "pause-child";
                
                const img = document.createElement("img");
                img.className = "pause-child-img";
                img.src = PathResolver.resolveAsset('characters', `${childType}.png`);
                img.alt = childType;
                
                const name = document.createElement("span");
                name.className = "pause-child-name";
                name.textContent = this.getText(`game.children.${childType}`) || childType;
                
                childDiv.appendChild(img);
                childDiv.appendChild(name);
                childrenContainer.appendChild(childDiv);
            });
            
            modal.style.display = "flex";
            
            const newContinueBtn = continueBtn.cloneNode(true);
            continueBtn.parentNode.replaceChild(newContinueBtn, continueBtn);
            newContinueBtn.addEventListener("click", () => {
                modal.style.display = "none";
                if (gm) {
                    gm.setGameInputLocked(false);
                }
                resolve();
            });
            
            const newExitBtn = exitBtn.cloneNode(true);
            exitBtn.parentNode.replaceChild(newExitBtn, exitBtn);
            newExitBtn.addEventListener("click", () => {
                modal.style.display = "none";
                if (gm) {
                    gm.setGameInputLocked(false);
                }
                PathResolver.goToIndex();
            });
        });
    }

    async showLevelStartModal(charCtrl, config, board) {
        return new Promise((resolve) => {
            const modal = document.getElementById("level-start-modal");
            const titleEl = document.getElementById("level-start-title");
            const seedEl = document.getElementById("level-start-seed");
            const infoEl = document.getElementById("level-start-info");
            const childrenContainer = document.getElementById("level-start-children");
            
            if (!modal) {
                resolve();
                return;
            }
            
            childrenContainer.innerHTML = "";
            
            let title = "", seedText = "", info = "";
            
            if (config.mode === "legacy") {
                title = `${this.getText('game.level')} ${this.gameManager.currentLevel}`;
                seedText = `${this.getText('menu.punchcard.seed')}${config.seed || '---'}`;
                info = `${this.getText('game.wanted')}: ${charCtrl.getTotalGoals()}`;
            } else if (config.mode === "daily") {
                const today = new Date();
                title = today.toLocaleDateString();
                seedText = `${this.getText('menu.punchcard.seed')}${config.seed || '---'}`;
                info = `${this.getText('game.wanted')}: ${charCtrl.getTotalGoals()}`;
            } else {
                title = this.getText('game.customMission');
                seedText = `${this.getText('menu.punchcard.seed')}${config.seed || '---'}`;
                info = `${this.getText('game.wanted')}: ${charCtrl.getTotalGoals()}`;
            }
            
            titleEl.textContent = title;
            if (seedEl) seedEl.textContent = seedText;
            infoEl.textContent = info;
            
            const childTypes = this.getChildTypesFromBoard(board);
            childTypes.forEach(childType => {
                const childDiv = document.createElement("div");
                childDiv.className = "level-start-child";
                
                const img = document.createElement("img");
                img.className = "level-start-child-img";
                img.src = PathResolver.resolveAsset('characters', `${childType}.png`);
                img.alt = childType;
                
                const name = document.createElement("span");
                name.className = "level-start-child-name";
                name.textContent = this.getText(`game.children.${childType}`) || childType;
                
                childDiv.appendChild(img);
                childDiv.appendChild(name);
                childrenContainer.appendChild(childDiv);
            });
            
            const cleanModal = () => {
                modal.classList.remove("show");
                document.removeEventListener("click", onUserInput);
                document.removeEventListener("keydown", onUserInput);
                document.removeEventListener("touchstart", onUserInput);
            };
            
            modal.style.display = "flex";
            setTimeout(() => {
                modal.classList.add("show");
            }, 10);
            
            const closeModal = () => {
                cleanModal();
                setTimeout(() => {
                    modal.style.display = "none";
                    resolve();
                }, 500);
            };
            
            const onUserInput = () => closeModal();
            setTimeout(() => {
                document.addEventListener("click", onUserInput, { once: true });
                document.addEventListener("keydown", onUserInput, { once: true });
                document.addEventListener("touchstart", onUserInput, { once: true });
            }, 100);
        });
    }

    getChildTypesFromBoard(board) {
        const childTypes = new Set();
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                const goalType = board[i][j].getGoaltype();
                if (goalType !== "none") childTypes.add(goalType);
            }
        }
        return Array.from(childTypes);
    }
}