// ==============================================================
// ====================== HUD MANAGER ============================
// ==============================================================
// Manages all HUD updates (health, flags, coords, support, etc.)

import { PathResolver } from "../../utils/PathResolver.js";

export class HUDManager {
    constructor(game) {
        this.game = game;
        this.localeManager = null;
    }

    setLocaleManager(lm) {
        this.localeManager = lm;
    }

    applyGameLanguage() {
        if (!this.localeManager) return;
        
        const labels = [
            { id: "score-label-rescued", key: "game.scoreboard.rescued" },
            { id: "score-labeled", key: "game.scoreboard.marked" },
            { id: "score-label-difficulty", key: "game.scoreboard.difficulty" },
            { id: "score-label-deaths", key: "game.scoreboard.deaths" },
            { id: "score-label-failed", key: "game.scoreboard.failed" },
            { id: "score-label-damage", key: "game.scoreboard.damage" }
        ];
        
        for (const { id, key } of labels) {
            const el = document.getElementById(id);
            if (el) el.textContent = this.localeManager.get(key);
        }
    }

    update() {
        const player = this.game.getPlayer();
        if (!player) return;

        const renderer = this.game.renderer;
        if (renderer) renderer.setPlayer(player);

        this.updateCharacterIcon(player);
        this.updateHealth(player);
        this.updateFlags(player);
        this.updateRescued(player);
        this.updateRemainingGoals(player);
        this.updateCriticized(player);
        this.updateCurrentTile();
        this.updateHeightometer();
        this.updateGeologicalAlert();
        this.updateFatigue(player);
        this.updateCoordinates();
        this.updateSupport(player);
    }

    updateCharacterIcon(player) {
        const el = document.getElementById("hud-character-icon");
        if (el) {
            el.src = PathResolver.resolveAsset('gameCharacterIcon', `${player.getType()}.png`);
        }
    }

    updateHealth(player) {
        const hp = player.getHp();
        const maxHp = this.getMaxHpByCharacter(player.getType());
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
    }

    updateFlags(player) {
        const el = document.getElementById("hud-flags-text");
        if (el) el.textContent = player.getFlags();
    }

    updateRescued(player) {
        const el = document.getElementById("hud-rescued-text");
        if (el) el.textContent = player.getRescued();
    }

    updateRemainingGoals(player) {
        const el = document.getElementById("hud-goals-text");
        if (el && this.game.charCtrl) {
            el.textContent = this.game.charCtrl.getRemainingGoals();
        }
    }

    updateCriticized(player) {
        const el = document.getElementById("hud-criticized-icon");
        if (el) {
            el.style.display = player.isCriticized() ? "block" : "none";
        }
    }

    updateFatigue(player) {
        const rescued = player.getRescued();
        const force = player.getForce();
        const el = document.getElementById("hud-tired-icon");
        if (el) {
            el.style.display = rescued >= force ? "block" : "none";
        }
    }

    updateCoordinates() {
        const player = this.game.getPlayer();
        if (!player) return;
        
        const board = this.game.getBoard();
        if (!board) return;
        
        const x = player.getPosX();
        const y = player.getPosY();
        
        const coordsText = document.getElementById("coords-text");
        if (coordsText) coordsText.textContent = `[${x},${y}]`;
        
        this.updateHomeCoords(player, board);
        this.updateDestinyCoords(player, board);
    }

    updateHomeCoords(player, board) {
        const wrapper = document.getElementById("coords-home");
        const text = document.getElementById("coords-home-text");
        
        if (!wrapper || !text) return;
        
        if (player.hasKeychain('home')) {
            for (let i = 0; i < board.length; i++) {
                for (let j = 0; j < board.length; j++) {
                    if (board[i][j].isStart()) {
                        text.textContent = `[${i},${j}]`;
                        wrapper.style.display = "flex";
                        return;
                    }
                }
            }
            wrapper.style.display = "none";
        } else {
            wrapper.style.display = "none";
        }
    }

    updateDestinyCoords(player, board) {
        const wrapper = document.getElementById("coords-destiny");
        const text = document.getElementById("coords-destiny-text");
        
        if (!wrapper || !text) return;
        
        if (player.hasKeychain('destiny')) {
            const target = this.game.getDestinyTarget(board);
            if (target) {
                text.textContent = `[${target.x},${target.y}]`;
                wrapper.style.display = "flex";
            } else {
                wrapper.style.display = "none";
            }
        } else {
            wrapper.style.display = "none";
        }
    }

    updateCurrentTile() {
        const board = this.game.getBoard();
        const player = this.game.getPlayer();
        if (!board || !player) return;

        const tileX = player.getPosX();
        const tileY = player.getPosY();
        const tile = board[tileX][tileY];
        const tileIcon = document.getElementById("hud-tile-icon");
        if (!tileIcon) return;

        let textureName = null;
        const zone = this.game.getZone();

        const hazardType = tile.getHazardtype();
        const obstacleType = tile.getObstacletype();
        const hazardCount = tile.getHazardcount();
        const goalType = tile.getGoaltype();
        const pipe = tile.isSmoke();

        if (!pipe) {
            if (hazardType !== "none") {
                textureName = hazardType;
            } else if (obstacleType !== "none") {
                if (obstacleType === "spikes") {
                    const spikeState = tile.getSpikeState();
                    textureName = spikeState === "prepared" ? "spikes_prepared" :
                                 spikeState === "on" ? "spikes_on" : "spikes_off";
                } else {
                    textureName = obstacleType;
                }
            } else if (hazardCount > 0) {
                textureName = hazardCount.toString();
            } else if (goalType !== "none") {
                textureName = goalType;
            } else if (tile.isStart()) {
                textureName = "start";
            }
        }

        if (textureName && obstacleType !== "none" && obstacleType !== "spikes") {
            tileIcon.src = PathResolver.resolveAsset('tiles', zone, `${textureName}.png`);
            tileIcon.style.display = "block";
        } else if (textureName) {
            tileIcon.src = PathResolver.resolveAsset('tiles', `${textureName}.png`);
            tileIcon.style.display = "block";
        } else {
            tileIcon.style.display = "none";
        }
    }

    updateHeightometer() {
        const board = this.game.getBoard();
        const player = this.game.getPlayer();
        if (!board || !player) return;
        
        const tileX = player.getPosX();
        const tileY = player.getPosY();
        const tile = board[tileX][tileY];
        const height = tile.getTileheight();
        
        const el = document.getElementById("hud-heightometer-number");
        if (el) el.textContent = height;
    }

    updateGeologicalAlert() {
        const player = this.game.getPlayer();
        if (!player) {
            return;
        }

        const abilityId = player.getAbilityId ? player.getAbilityId() : player.abilityId;
        
        if (abilityId !== 2) {
            document.getElementById("hud-geohaz-alert").style.display = "none";
            document.getElementById("hud-geoobs-alert").style.display = "none";
            return;
        }
        
        const board = this.game.getBoard();
        const x = player.getPosX();
        const y = player.getPosY();
        const size = board.length;
        
        let hasDamage = false, hasKill = false, hasLive = false;
        let hasRiver = false, hasSpikes = false, hasPit = false;
        
        const directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
        
        for (const [dx, dy] of directions) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
            
            const tile = board[nx][ny];
            const hazardType = tile.getHazardtype();
            const obstacleType = tile.getObstacletype();
            
            if (hazardType === "mine" || hazardType === "spiderMine") hasKill = true;
            else if (hazardType === "cactus" || hazardType === "deadbush" || tile.getDamageratio()) hasDamage = true;
            else if (tile.isHazardlive()) hasLive = true;
            
            if (obstacleType === "river") hasRiver = true;
            else if (obstacleType === "spikes") hasSpikes = true;
            else if (obstacleType === "pit") hasPit = true;
        }

        const alertIcon = document.getElementById("hud-geohaz-alert");
        const alertIcon2 = document.getElementById("hud-geoobs-alert");
        let alertType = null;
        let alertType2 = null;
        
        if (hasLive){
            alertType = "live.png"
        } else if (hasDamage && hasKill) { 
            alertType = "mixed.png";
        } else if (hasKill) { 
            alertType = "kill.png";
        } else if (hasDamage) { 
            alertType = "damage.png";
        }
        
        if (hasRiver && (hasPit || hasSpikes)) { 
            alertType2 = "obsmixed.png"
        } else if (hasRiver) { 
            alertType2 = "obsriver.png"
        } else if (hasPit || hasSpikes) { 
            alertType2 = "obspit.png"
        }

        if (alertType){
            alertIcon.src = PathResolver.resolveAsset('gameStats', alertType);
            alertIcon.style.display = "block";
        } else {
            alertIcon.style.display = "none"
        }
        
        if (alertType2){
            alertIcon2.src = PathResolver.resolveAsset('gameStats', alertType2);
            alertIcon2.style.display = "block";
        } else {
            alertIcon2.style.display = "none"
        }
    }

    updateSupport(player) {
        const slotsContainer = document.getElementById('hud-keychain-slots');
        if (!slotsContainer) return;
        
        const inventory = player.inventory || [];
        const maxSize = player.maxInventorySize || 5;
        
        const filteredInventory = inventory.filter(id => player.isKeychainActive(id));
        const visibleItems = filteredInventory.slice(0, maxSize);
        
        const currentIds = visibleItems.join(',');
        const renderedIds = Array.from(slotsContainer.children)
            .map(child => child.dataset.keychainId)
            .filter(id => id)
            .join(',');
        
        if (currentIds === renderedIds) return;
        
        slotsContainer.innerHTML = '';
        const keychainUI = this.game.keychainUIManager;
        
        for (const keychainId of visibleItems) {
            if (!keychainId) continue;
            
            const slot = document.createElement('div');
            slot.className = 'keychain-slot';
            slot.dataset.keychainId = keychainId;
            
            const img = document.createElement('img');
            img.src = PathResolver.resolveAsset('keychains', `keychain_${keychainId}.png`);
            img.alt = keychainId;
            img.draggable = false;
            
            slot.appendChild(img);
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                if (keychainUI) keychainUI.showKeychainInfo(keychainId);
            });
            
            slotsContainer.appendChild(slot);
        }
    }

    getMaxHpByCharacter(type) {
        const map = { chef: 5, mosquito: 3, mommy: 10, scout: 1, student: 2 };
        return map[type] || 5;
    }
}