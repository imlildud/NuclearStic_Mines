// ==============================================================
// =================== GAME INITIALIZER ==========================
// ==============================================================
// Handles game initialization, locale loading, and startup sequence

import { GameManager } from "../../managers/GameManager.js";
import { Renderer } from "../../views/Renderer.js";
import { AudioManager } from "../../managers/AudioManager.js";
import { SaveManager } from "../../managers/SaveManager.js";
import { LocaleManager } from "../../managers/LocaleManager.js";
import { PathResolver } from "../../utils/PathResolver.js";

export class GameInitializer {
    constructor() {
        this.saveManager = new SaveManager();
        this.config = null;
        this.localeManager = null;
        this.game = null;
        this.audio = null;
        this.renderer = null;
        this.canvas = null;
    }

    loadConfig() {
        try {
            this.config = this.saveManager.loadConfig();
            return true;
        } catch (e) {
            document.body.style.background = "#333";
            throw new Error("No configuration found.");
        }
    }

    async initLocale() {
        this.localeManager = new LocaleManager();
        await this.localeManager.init();
        console.log("LocaleManager initialized, language:", this.localeManager.currentLocale);
        return this.localeManager;
    }

    initGame() {
        this.game = new GameManager(this.config);
        this.audio = new AudioManager();
        return { game: this.game, audio: this.audio };
    }

    initRenderer() {
        this.canvas = document.getElementById("gameCanvas");
        this.renderer = new Renderer(this.canvas, this.game);
        this.game.setRenderer(this.renderer);
        return this.renderer;
    }

    applyVolumeSettings() {
        this.audio.setMusicVolume(this.saveManager.getMusicVolume() / 100);
        this.audio.setSFXVolume(this.saveManager.getSFXVolume() / 100);
        this.audio.setSFXEnabled(this.saveManager.isSFXEnabled());
    }

    setBackground() {
        const zoneMap = {
            "backyard": "backyard.png",
            "desert": "desert.png",
            "snow": "snow.png",
            "ash": "ash.png"
        };
        const bgPath = PathResolver.resolveAsset('gameWallpaper', zoneMap[this.config.zone]);
        document.body.style.backgroundImage = `url("${bgPath}")`;
    }

    async startGame() {
        await this.game.startGame();
    }

    async initTutorial() {
        if (this.config.mode !== "tutorial") return;
        console.log("Initializing tutorial with localeManager:", this.localeManager);
        const { TutorialManager } = await import("../../managers/TutorialManager.js");
        const tutorialManager = new TutorialManager(this.game, this.audio, this.localeManager);
        tutorialManager.init();
        this.game.setTutorialManager(tutorialManager);
    }

    playMusic() {
        this.audio.playMusic(this.config.zone);
        
        const startMusicOnce = () => {
            this.audio.startMusic();
            window.removeEventListener("keydown", startMusicOnce);
            window.removeEventListener("click", startMusicOnce);
            window.removeEventListener("touchstart", startMusicOnce);
        };
        
        window.addEventListener("keydown", startMusicOnce);
        window.addEventListener("click", startMusicOnce);
        window.addEventListener("touchstart", startMusicOnce);
    }
}