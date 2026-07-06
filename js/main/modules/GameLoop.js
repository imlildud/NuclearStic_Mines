// ==============================================================
// ====================== GAME LOOP =============================
// ==============================================================
// Handles the main game loop with FPS limiting

export class GameLoop {
    constructor(renderer, hudManager) {
        this.renderer = renderer;
        this.hudManager = hudManager;
        this.lastRender = 0;
        this.FPS_LIMIT = 60;
        this.FRAME_TIME = 30 / this.FPS_LIMIT;
        this.running = false;
    }

    start() {
        this.running = true;
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    stop() {
        this.running = false;
    }

    loop(now) {
        if (!this.running) return;
        requestAnimationFrame(this.loop);
        
        if (now - this.lastRender < this.FRAME_TIME) return;
        this.lastRender = now;
        
        this.renderer.render();
        this.hudManager.update();
    }
}