// js/main/modules/WelcomePanel.js
// ==============================================================
// ====================== WELCOME PANEL =========================
// ==============================================================
// Handles ID Card display, avatar selection, name editing, 
// tutorial prompt, and welcome screen panel management.

import { SaveManager } from "../../managers/SaveManager.js";
import { AudioManager } from "../../managers/AudioManager.js";
import { RankManager } from "./RankManager.js";
import { PathResolver } from "../../utils/PathResolver.js";

// ==================== INSTANCES ====================

const saveManager = new SaveManager();
const audioManager = new AudioManager();

// ==================== STATE ====================

let selectedAvatar = 1;
let localeManager = null;

// ==================== PRIVATE HELPERS ====================

function getLegacyBadge(level) {
    if (level <= 3) return "paper.png";
    if (level <= 7) return "cardboard.png";
    if (level <= 11) return "telegram.png";
    if (level <= 15) return "bronze.png";
    if (level <= 19) return "silver.png";
    if (level <= 23) return "gold.png";
    return "platinum.png";
}

function getDailyFireImage(streak) {
    if (streak <= 0) return "fire0.png";
    if (streak <= 6) return "fire1.png";
    if (streak <= 13) return "fire2.png";
    if (streak <= 29) return "fire3.png";
    if (streak <= 179) return "fire4.png";
    return "fire5.png";
}

function isHardcoreEnabled() {
    return saveManager.isHardcoreEnabled();
}

// ==================== NAME EDITOR ====================

function showNameEditor(currentName) {
    const overlay = document.createElement('div');
    overlay.id = 'name-edit-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 100000;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: 'Shampoos';
    `;
    
    const modalBox = document.createElement('div');
    modalBox.style.cssText = `
        background: #2a2a2a;
        border: 3px solid #6a4a2a;
        border-radius: 20px;
        padding: 4vmin 6vmin;
        text-align: center;
        min-width: 250px;
    `;
    
    const promptText = localeManager ? localeManager.get('menu.editName') : "Enter your new name:";
    
    modalBox.innerHTML = `
        <div style="margin-bottom: 3vmin; font-size: 4vmin; color: #ffd78c;">${promptText}</div>
        <input type="text" id="name-edit-input" value="${currentName}" maxlength="20" style="font-family: 'Shampoos'; font-size: 4vmin; padding: 1.5vmin; text-align: center; width: 80%; border-radius: 12px; border: 2px solid #6a4a2a; outline: none;">
        <div style="display: flex; gap: 3vmin; justify-content: center; margin-top: 3vmin;">
            <button id="name-edit-save" style="padding: 1vmin 3vmin; font-family: 'Shampoos'; font-size: 3vmin; background: #4a7c59; color: white; border: none; border-radius: 8px; cursor: pointer;">Save</button>
            <button id="name-edit-cancel" style="padding: 1vmin 3vmin; font-family: 'Shampoos'; font-size: 3vmin; background: #7c4a4a; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
        </div>
    `;
    
    overlay.appendChild(modalBox);
    document.body.appendChild(overlay);
    
    const input = document.getElementById('name-edit-input');
    const saveBtn = document.getElementById('name-edit-save');
    const cancelBtn = document.getElementById('name-edit-cancel');
    
    input.focus();
    input.select();
    
    saveBtn.onclick = () => {
        const newName = input.value.trim();
        if (newName) {
            saveManager.setUsername(newName);
            const avatarId = saveManager.getAvatar();
            WelcomePanel.showWelcomePanel(newName, avatarId);
        }
        overlay.remove();
    };
    
    cancelBtn.onclick = () => {
        overlay.remove();
    };
    
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            const newName = input.value.trim();
            if (newName) {
                saveManager.setUsername(newName);
                const avatarId = saveManager.getAvatar();
                WelcomePanel.showWelcomePanel(newName, avatarId);
            }
            overlay.remove();
        }
    };
    
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    };
}

// ==================== AVATAR SELECTOR ====================

function showAvatarSelector(fromNameFlow = true) {
    const promptEl = document.getElementById("avatar-prompt");
    const confirmBtn = document.getElementById("avatar-confirm");
    
    if (promptEl) {
        promptEl.textContent = localeManager ? localeManager.get('menu.selectAvatar') : "Choose your profile picture:";
    }
    
    if (confirmBtn) {
        confirmBtn.textContent = localeManager ? localeManager.get('menu.confirm') : "Confirm";
    }
    
    const options = document.querySelectorAll('.avatar-option');
    options.forEach((opt) => {
        const avatarNum = parseInt(opt.dataset.avatar);
        if (avatarNum === selectedAvatar) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
        
        opt.onclick = () => {
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedAvatar = parseInt(opt.dataset.avatar);
        };
    });
    
    confirmBtn.onclick = () => {
        saveManager.setAvatar(selectedAvatar);
        
        if (fromNameFlow) {
            WelcomePanel.showTutorialPrompt();
            document.getElementById("avatar-panel").style.display = "none";
            document.getElementById("tutorial-panel").style.display = "flex";
        } else {
            const username = saveManager.getUsername();
            WelcomePanel.showWelcomePanel(username, selectedAvatar);
            document.getElementById("avatar-panel").style.display = "none";
            document.getElementById("welcome-panel").style.display = "flex";
        }
    };
}

// ==================== NAME PROMPT ====================

function showNamePrompt() {
    const promptEl = document.getElementById("name-prompt");
    const inputEl = document.getElementById("username-input");
    const continueBtn = document.getElementById("name-continue");
    
    if (promptEl) {
        promptEl.textContent = localeManager ? localeManager.get('menu.enterName') : "Enter your name, rescuer:";
    }
    if (inputEl) {
        inputEl.placeholder = localeManager ? localeManager.get('menu.namePlaceholder') : "Your name";
        inputEl.value = "";
        inputEl.onkeypress = (e) => {
            if (e.key === 'Enter') {
                const name = inputEl.value.trim();
                if (name) {
                    saveManager.setUsername(name);
                    showAvatarSelector(true);
                    document.getElementById("name-panel").style.display = "none";
                    document.getElementById("avatar-panel").style.display = "flex";
                }
            }
        };
    }
    if (continueBtn) {
        continueBtn.textContent = localeManager ? localeManager.get('menu.continue') : "Continue";
        continueBtn.onclick = () => {
            const name = inputEl.value.trim();
            if (name) {
                saveManager.setUsername(name);
                showAvatarSelector(true);
                document.getElementById("name-panel").style.display = "none";
                document.getElementById("avatar-panel").style.display = "flex";
            }
        };
    }
}

// ==================== TUTORIAL PROMPT ====================

function showTutorialPrompt() {
    const questionEl = document.getElementById("tutorial-question");
    const yesBtn = document.getElementById("welcome-yes");
    const noBtn = document.getElementById("welcome-no");
    
    if (questionEl) {
        questionEl.innerHTML = (localeManager ? localeManager.get('menu.tutorialQuestion') : "Would you like to play the tutorial?").replace(/\n/g, '<br><br>');
    }
    
    if (yesBtn) {
        yesBtn.textContent = localeManager ? localeManager.get('menu.yes') : "Yep";
        yesBtn.onclick = () => {
            saveManager.setTutorialCompleted(false);
            const config = {
                mode: "tutorial",
                seed: null,
                level: 1,
                character: "student",
                size: 5,
                hazards: 1,
                obstacles: 1,
                goals: 1,
                zone: "backyard"
            };
            saveManager.saveConfig(config);
            PathResolver.goToGame();
        };
    }
    
    if (noBtn) {
        noBtn.textContent = localeManager ? localeManager.get('menu.no') : "No ty";
        noBtn.onclick = () => {
            saveManager.setTutorialCompleted(true);
            const username = saveManager.getUsername();
            const avatarId = saveManager.getAvatar();
            WelcomePanel.showWelcomePanel(username, avatarId);
            document.getElementById("tutorial-panel").style.display = "none";
            document.getElementById("welcome-panel").style.display = "flex";
            
            const idCardToggle = document.getElementById("id-card-toggle-btn");
            if (idCardToggle) idCardToggle.style.display = "block";
        };
    }
}

// ==================== ID CARD TOGGLE ====================

function initIdCardToggle() {
    const toggleBtn = document.getElementById("id-card-toggle-btn");
    const welcomeScreen = document.getElementById("welcome-screen");
    
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            if (welcomeScreen) {
                if (welcomeScreen.style.display === "flex") {
                    welcomeScreen.style.display = "none";
                } else {
                    welcomeScreen.style.display = "flex";
                    
                    // Get old total points (saved before game started)
                    const oldTotalPoints = saveManager.getOldTotalPoints();
                    
                    // Refresh ID card content (skip animation on load)
                    const username = saveManager.getUsername();
                    const avatarId = saveManager.getAvatar();
                    WelcomePanel.showWelcomePanel(username, avatarId, true);
                    
                    // Get current total points (after game)
                    const newTotalPoints = saveManager.getTotalPoints();
                    
                    // Only animate if points changed
                    if (oldTotalPoints !== newTotalPoints) {
                        RankManager.animateTotalPoints(oldTotalPoints, newTotalPoints, isHardcoreEnabled());
                    }
                }
            }
        });
    }
}

// ==================== WELCOME SCREEN INIT ====================

function initWelcomeScreen() {
    const welcomeScreen = document.getElementById("welcome-screen");
    const mainMenu = document.querySelector(".overlay");
    const idCardToggle = document.getElementById("id-card-toggle-btn");
    
    const welcomePanel = document.getElementById("welcome-panel");
    const namePanel = document.getElementById("name-panel");
    const avatarPanel = document.getElementById("avatar-panel");
    const tutorialPanel = document.getElementById("tutorial-panel");
    
    // Hide all panels first
    if (welcomePanel) welcomePanel.style.display = "none";
    if (namePanel) namePanel.style.display = "none";
    if (avatarPanel) avatarPanel.style.display = "none";
    if (tutorialPanel) tutorialPanel.style.display = "none";
    
    const tutorialCompleted = saveManager.isTutorialCompleted();
    const username = saveManager.getUsername();
    const avatarId = saveManager.getAvatar();
    
    // Update avatar selection in UI
    selectedAvatar = avatarId;
    
    // Existing player - show welcome panel with ID card
    if (tutorialCompleted && username) {
        // Store old total points BEFORE showing the ID card
        const oldTotalPoints = saveManager.getOldTotalPoints();
        const newTotalPoints = saveManager.getTotalPoints();
        
        // Show ID card with skipAnimation = true (static display first)
        WelcomePanel.showWelcomePanel(username, avatarId, true);
        
        if (welcomePanel) welcomePanel.style.display = "flex";
        if (welcomeScreen) welcomeScreen.style.display = "flex";
        if (mainMenu) mainMenu.style.display = "none";
        if (idCardToggle) idCardToggle.style.display = "block";
        
        // Animate if points changed (coming back from a game)
        if (oldTotalPoints !== newTotalPoints && newTotalPoints > 0) {
            // Animate: first the badge, then the bar, then sync
            RankManager.animateTotalPoints(oldTotalPoints, newTotalPoints, isHardcoreEnabled(), () => {
                // After animation completes, sync old total points to current
                saveManager.syncOldTotalPoints();
                console.log("[WelcomePanel] Animation complete, synced oldTotalPoints to:", newTotalPoints);
            });
        } else {
            // No animation needed, just sync to be safe
            saveManager.syncOldTotalPoints();
        }
    }
    // Has name but not completed tutorial - go to avatar selection
    else if (username && username !== "") {
        showAvatarSelector(true);
        if (avatarPanel) avatarPanel.style.display = "flex";
        if (welcomeScreen) welcomeScreen.style.display = "flex";
        if (mainMenu) mainMenu.style.display = "none";
    }
    // First time - ask for name
    else {
        showNamePrompt();
        if (namePanel) namePanel.style.display = "flex";
        if (welcomeScreen) welcomeScreen.style.display = "flex";
        if (mainMenu) mainMenu.style.display = "none";
    }
}

// ==================== EXPORTED MODULE ====================

export const WelcomePanel = {
    // Methods
    showWelcomePanel(username, avatarId, skipAnimation = false) {
        const greetingEl = document.getElementById("welcome-greeting");
        const playBtn = document.getElementById("welcome-play");
        const deleteBtn = document.getElementById("welcome-delete");
        const avatarImg = document.getElementById("id-card-avatar-img");
        const nameEl = document.getElementById("id-card-name");
        const levelEl = document.getElementById("id-card-level");
        const legacyBadgeImg = document.getElementById("id-card-legacy-badge");
        const recordNumberEl = document.getElementById("id-card-record-number");
        const hardcoreNumberEl = document.getElementById("id-card-hardcore-number");
        const streakNumber = document.getElementById("id-card-streak-number");
        const streakFire = document.getElementById("id-card-streak-fire");
        const editBtn = document.getElementById("id-card-edit-btn");
        
        const legacyLevel = saveManager.getLegacyLevel();
        const legacyHighScore = saveManager.getLegacyHighScore();
        const dailyStreak = saveManager.getDailyStreak();
        const hardcoreHighScore = saveManager.getHardcoreHighScore();
        const totalPoints = RankManager.getTotalPoints();
        const rankData = RankManager.getRankData(totalPoints);
        const isHardcore = isHardcoreEnabled();
        
        // Set avatar image
        if (avatarImg) {
            avatarImg.src = `assets/hud/menu/icons/icon${avatarId}.png`;
        }
        
        // Set name with edit capability
        if (nameEl) {
            nameEl.textContent = username;
            nameEl.style.cursor = "pointer";
            nameEl.title = localeManager ? localeManager.get('menu.clickToEdit') : "Click to edit name";
            
            const newNameEl = nameEl.cloneNode(true);
            nameEl.parentNode.replaceChild(newNameEl, nameEl);
            
            newNameEl.addEventListener("click", (e) => {
                e.stopPropagation();
                showNameEditor(newNameEl.textContent);
            });
        }
        
        // Set legacy badge
        if (legacyBadgeImg) {
                const badgeFile = getLegacyBadge(legacyHighScore);
                legacyBadgeImg.src = `assets/hud/badges/${badgeFile}`;
        }

        // Set legacy record
        if (recordNumberEl) {
            recordNumberEl.textContent = `${legacyHighScore}`;
        }

        // Set hardcore record
        if (hardcoreNumberEl) {
            hardcoreNumberEl.textContent = hardcoreHighScore;
        }
        
        // Set streak
        if (streakNumber) {
            streakNumber.textContent = dailyStreak;
        }
        if (streakFire) {
            const fireFile = getDailyFireImage(dailyStreak);
            streakFire.src = `assets/hud/badges/${fireFile}`;
        }

        // Update rank display (always update, skipAnimation just means no counting animation)
        const rankBadge = document.getElementById("rank-badge");
        const rankBarFill = document.getElementById("rank-bar-fill");
        const rankText = document.getElementById("rank-text");
        
        if (rankBadge) {
            // Always update badge image based on current rank
            rankBadge.src = `assets/hud/badges/rank_${rankData.rank.toLowerCase()}.png`;
            
            // Calculate progress percentage within current rank (0% to 100%)
            const progressInRank = totalPoints - rankData.min;
            const rankRange = rankData.max - rankData.min;
            let percent = 0;
            
            if (rankRange > 0) {
                percent = (progressInRank / rankRange) * 100;
            } else {
                percent = 100; // Max rank (S+ has no upper bound)
            }
            
            rankBarFill.style.width = `${Math.min(percent, 100)}%`;
            
            // Update rank text showing current points and max of current rank
            rankText.textContent = `${totalPoints.toLocaleString()} / ${rankData.max.toLocaleString()}`;
            
            // Apply styling based on hardcore mode
            if (isHardcore) {
                rankBarFill.style.background = "linear-gradient(90deg, #8b0000, #4a0000)";
            } else {
                rankBarFill.style.background = "linear-gradient(90deg, #4a7c59, #2a4a35)";
            }
        }

        const welcomeBg = document.querySelector('.welcome-bg');
        if (welcomeBg) {
            welcomeBg.style.opacity = '0';
            welcomeBg.style.visibility = 'hidden';
        }
        
        // Hide greeting text (no longer needed)
        if (greetingEl) {
            greetingEl.style.display = "none";
        }
        
        // Edit button handler
        if (editBtn) {
            editBtn.onclick = () => {
                const welcomePanel = document.getElementById("welcome-panel");
                const avatarPanel = document.getElementById("avatar-panel");
                const welcomeBg = document.querySelector('.welcome-bg');
                
                if (welcomePanel) welcomePanel.style.display = "none";
                if (avatarPanel) avatarPanel.style.display = "flex";
                
                if (welcomeBg) {
                    welcomeBg.style.opacity = '1';
                    welcomeBg.style.visibility = 'visible';
                }
                
                selectedAvatar = saveManager.getAvatar();
                showAvatarSelector(false);
            };
        }
        
        // Play button handler
        if (playBtn) {
            playBtn.textContent = localeManager ? localeManager.get('menu.play') : "Play";
            playBtn.onclick = () => {
                const welcomeScreen = document.getElementById("welcome-screen");
                const mainMenu = document.querySelector(".overlay");
                if (welcomeScreen) welcomeScreen.style.display = "none";
                if (mainMenu) mainMenu.style.display = "flex";
            };
        }

        // Delete button handler
        if (deleteBtn) {
            deleteBtn.textContent = localeManager ? localeManager.get('menu.deleteData') : "Delete Save";
            
            deleteBtn.onclick = () => {
                const confirmMsg = localeManager 
                    ? localeManager.get('menu.confirmDelete')
                    : "WARNING: This will delete ALL your game data (progress, settings, everything).\n\nThis cannot be undone!\n\nAre you sure?";
                
                if (confirm(confirmMsg)) {
                    saveManager.clearAllGameData(true);
                    window.location.reload();
                }
            };
        }
    },

    showTutorialPrompt() {
        showTutorialPrompt();
    },

    initWelcomeScreen() {
        initWelcomeScreen();
    },

    initIdCardToggle() {
        initIdCardToggle();
    },

    setLocaleManager(lm) {
        localeManager = lm;
    }
};