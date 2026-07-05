// ==============================================================
// ===================== INPUT MANAGER ===========================
// ==============================================================
// Handles keyboard and touch input for movement and flags

export class InputManager {
    constructor(game, renderer, audio) {
        this.game = game;
        this.renderer = renderer;
        this.audio = audio;

        this.lastFlagTime = 0;
        this.FLAG_DELAY = 200;
        this.lastSwampTime = 0;
        this.SWAMP_DELAY = 300;

        this.setupKeyboard();
        this.setupTouch();
    }

    canActFlag() {
        const now = Date.now();
        if (now - this.lastFlagTime < this.FLAG_DELAY) return false;
        this.lastFlagTime = now;
        return true;
    }

    canActSwamp() {
        const now = Date.now();
        if (now - this.lastSwampTime < this.SWAMP_DELAY) return false;
        this.lastSwampTime = now;
        return true;
    }

    setupKeyboard() {
        // Flag controls (Arrow keys)
        window.addEventListener("keydown", (e) => {
            if (!this.canActFlag()) return;

            switch (e.key) {
                case "ArrowUp":    this.game.handleFlagDirection("Up"); break;
                case "ArrowDown":  this.game.handleFlagDirection("Down"); break;
                case "ArrowLeft":  this.game.handleFlagDirection("Left"); break;
                case "ArrowRight": this.game.handleFlagDirection("Right"); break;
                case "Escape":     this.game.pauseGame(); break;
            }
        });

        // Movement controls (WASD)
        window.addEventListener("keydown", (e) => {
            const key = e.key.toLowerCase();
            if (["w", "a", "s", "d"].includes(key)) {
                this.handleMovement(key);
            }
        });

        // Extend game movement with animations
        this.extendGameMovement();
        this.extendGameFlag();

        // Swamp mode toggle (F key)
        window.addEventListener("keydown", (e) => {
            if (e.key === "f" || e.key === "F") {
                e.preventDefault();
                if (this.canActSwamp()) {
                    this.toggleSwampMode();
                }
            }
        });

        // Reversion shortcut (R key)
        window.addEventListener("keydown", (e) => {
            if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                this.game.reversionManager.activate();
            }
        });
    }

    handleMovement(key) {
        const dirMap = { w: "Up", s: "Down", a: "Left", d: "Right" };
        const direction = dirMap[key];
        if (!direction) return;

        const oldX = this.game.getPlayer().getPosX();
        const oldY = this.game.getPlayer().getPosY();

        this.game.handleInput(direction);

        const newX = this.game.getPlayer().getPosX();
        const newY = this.game.getPlayer().getPosY();
        
        if (oldX !== newX || oldY !== newY) {
            this.renderer.justMoved = true;
            this.renderer.justMovedFrames = 12;
            this.audio.playMoveSFX();
        }
    }

    extendGameMovement() {
        const originalHandleInput = this.game.handleInput.bind(this.game);
        const self = this;
        
        this.game.handleInput = function(direction) {
            const oldX = self.game.getPlayer().getPosX();
            const oldY = self.game.getPlayer().getPosY();

            originalHandleInput(direction);

            const newX = self.game.getPlayer().getPosX();
            const newY = self.game.getPlayer().getPosY();
            
            if (oldX !== newX || oldY !== newY) {
                self.renderer.justMoved = true;
                self.renderer.justMovedFrames = 12;
                self.audio.playMoveSFX();
            }
        };
    }

    extendGameFlag() {
        const originalHandleFlag = this.game.handleFlagDirection.bind(this.game);
        const self = this;
        
        this.game.handleFlagDirection = function(direction) {
            const oldX = self.game.getPlayer().getPosX();
            const oldY = self.game.getPlayer().getPosY();
            const isScout = self.game.getPlayer().getAbilityId() === 4;
            
            originalHandleFlag(direction);
            
            const newX = self.game.getPlayer().getPosX();
            const newY = self.game.getPlayer().getPosY();
            self.audio.playFlagSFX();
            
            if (isScout && (oldX !== newX || oldY !== newY)) {
                self.renderer.justMoved = true;
                self.renderer.justMovedFrames = 12;
                self.renderer.isScoutJump = true;
            } else if (oldX !== newX || oldY !== newY) {
                self.renderer.justMoved = true;
                self.renderer.justMovedFrames = 10;
                self.renderer.isScoutJump = false;
            }
        };
    }

    setupTouch() {
        // Movement buttons
        document.querySelectorAll('.touch-btn').forEach(btn => {
            const handleMove = (e) => {
                e.preventDefault();
                const dir = btn.dataset.dir;
                if (dir) {
                    const customEvent = new CustomEvent('touch-move', { detail: { source: "touch", dir: dir } });
                    document.dispatchEvent(customEvent);
                    this.game.handleInput(dir);
                }
            };
            btn.addEventListener('click', handleMove);
            btn.addEventListener('touchstart', handleMove);
        });

        // Flag buttons
        document.querySelectorAll('.flag-btn').forEach(btn => {
            const handleFlag = (e) => {
                e.preventDefault();
                const dir = btn.dataset.flag;
                if (dir) this.game.handleFlagDirection(dir);
            };
            btn.addEventListener('click', handleFlag);
            btn.addEventListener('touchstart', handleFlag);
        });

        // Swamp button
        const swampBtn = document.getElementById("swamp-btn");
        if (swampBtn) {
            swampBtn.addEventListener("click", () => {
                this.toggleSwampMode();
            });
        }

        // Rewind button
        const restartBtn = document.getElementById("restart-btn");
        if (restartBtn) {
            restartBtn.addEventListener("click", () => {
                this.game.reversionManager.activate();
            });
            restartBtn.addEventListener("touchstart", (e) => {
                e.preventDefault();
                this.game.reversionManager.activate();
            });
        }
    }

    toggleSwampMode() {
        const game = this.game;
        const player = game.getPlayer();
        
        // Check if player has any flag-mode keychain
        const available = game.getAvailableFlagModes();
        if (available.length === 0) {
            return;
        }
        
        // Cycle to next mode
        game.cycleFlagMode();

        if (this.audio) {
            this.audio.playRescueSFX();
        }
    }
}