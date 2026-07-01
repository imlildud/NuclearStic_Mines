// ==============================================================
// ===================== INPUT MANAGER ===========================
// ==============================================================
// Handles keyboard and touch input for movement and flags

export class InputManager {
    constructor(game, renderer, audio) {
        this.game = game;
        this.renderer = renderer;
        this.audio = audio;
        this.setupKeyboard();
        this.setupTouch();
    }

    setupKeyboard() {
        // Flag controls (Arrow keys)
        window.addEventListener("keydown", (e) => {
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
    }
}