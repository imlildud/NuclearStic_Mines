// ==============================================================
// ====================== AUDIO MANAGER =========================
// ==============================================================
// Handles all sound effects and music playback.
// Provides volume control, looping, and prevents audio spam.

export class AudioManager {
    
    // ======================= CONSTRUCTOR =======================
    
    constructor() {
        // Sound effects
        this.sfxEnabled = true;
        this.moveAudio = null;
        this.flagAudio = null;
        this.scoreAudio = null;
        this.textAudio = null;
        
        // Music
        this.currentMusic = null;
        this.musicStarted = false;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.3;
        
        // Animation flag for score sound
        this.isScoreAnimating = false;

        // Animation flag for text sound
        this.isWriteAnimating = false;
    }
    
    // ======================= SFX METHODS =======================
    
    // Enable or disable all sound effects
    setSFXEnabled(enabled) {
        this.sfxEnabled = enabled;
    }
    
    // Set SFX volume (0.0 to 1.0)
    setSFXVolume(volume) {
        this.sfxVolume = Math.min(1, Math.max(0, volume));
    }
    
    // Play a sound effect (optional loop)
    playSFX(soundFile, loop = false, volume = null) {
        if (!this.sfxEnabled) return null;
        
        const vol = volume !== null ? volume : this.sfxVolume;
        const audio = new Audio(`../../assets/audio/sfx/${soundFile}`);
        audio.loop = loop;
        audio.volume = vol;
        audio.play().catch(e => console.log("SFX failed:", soundFile, e));
        return audio;
    }
    
    // Play movement sound (prevents spam)
    playMoveSFX() {
        if (this.moveAudio && !this.moveAudio.ended) return;
        this.moveAudio = this.playSFX("move.mp3", false, 0.5);
    }
    
    // Play flag placement sound
    playFlagSFX() {
        this.flagAudio = this.playSFX("flag.mp3", false, 0.5);
    }
    
    // Play death sound
    playDeathSFX() {
        this.playSFX("death.mp3", false, 0.5);
    }
    
    // Play grade reveal sound
    playGradeSFX() {
        this.playSFX("grade.mp3", false, 0.5);
    }
    
    // Start looping score animation sound
    startScoreAnimationSFX() {
        if (this.isScoreAnimating) return;
        this.isScoreAnimating = true;
        this.scoreAudio = this.playSFX("score.mp3", true, 0.3);
    }
    
    // Stop score animation sound
    stopScoreAnimationSFX() {
        if (this.scoreAudio) {
            this.scoreAudio.pause();
            this.scoreAudio.currentTime = 0;
            this.scoreAudio = null;
        }
        this.isScoreAnimating = false;
    }

    // Start looping text animation sound
    startWriteAnimationSFX() {
        if (this.isWriteAnimating) return;
        this.isWriteAnimating = true;
        this.textAudio = this.playSFX("writing.mp3", true, 0.3);
    }

    // Stop text animation sound
    stopWriteAnimationSFX() {
        if (this.isWriteAnimating) {
            this.textAudio.pause();
            this.textAudio.currentTime = 0;
            this.textAudio = null;
        }
        this.isWriteAnimating = false;
    }


    
    // ======================= MUSIC METHODS =======================
    
    // Set music volume (0.0 to 1.0)
    setMusicVolume(volume) {
        this.musicVolume = Math.min(1, Math.max(0, volume));
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }
    }
    
    // Load and play music based on zone
    playMusic(zone, autoStart = false) {
        // Stop current music if playing
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
        }
        
        let musicFile = "";
        switch (zone) {
            case "desert":
                musicFile = "../../assets/audio/music/desert.mp3";
                break;
            case "snow":
                musicFile = "../../assets/audio/music/snow.mp3";
                break;
            case "ash":
                musicFile = "../../assets/audio/music/ash.mp3";
                break;
            case "backyard":
                musicFile = "../../assets/audio/music/backyard.mp3";
                break;
            default:
                return;
        }
        
        this.currentMusic = new Audio(musicFile);
        this.currentMusic.loop = true;
        this.currentMusic.volume = this.musicVolume;
        
        if (autoStart) {
            this.startMusic();
        }
    }
    
    // Start playing current music (requires user interaction first)
    startMusic() {
        if (this.musicStarted) return;
        if (this.currentMusic) {
            this.currentMusic.play().catch(e => console.log("Music play failed:", e));
            this.musicStarted = true;
        }
    }
    
    // Stop music
    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
        }
        this.musicStarted = false;
    }
    
    // Pause music without resetting
    pauseMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
        }
    }
    
    // Resume paused music
    resumeMusic() {
        if (this.currentMusic && this.musicStarted) {
            this.currentMusic.play().catch(e => console.log("Music resume failed:", e));
        }
    }
    
    // ======================= MENU MUSIC =======================
    
    // Load menu music
    playMenuMusic(autoStart = false) {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
        }
        
        this.currentMusic = new Audio("../../assets/audio/music/menu.mp3");
        this.currentMusic.loop = true;
        this.currentMusic.volume = this.musicVolume;
        
        if (autoStart) {
            this.startMusic();
        }
    }
    
    // ======================= UTILITY =======================
    
    // Check if music is currently playing
    isMusicPlaying() {
        return this.musicStarted && this.currentMusic && !this.currentMusic.paused;
    }
}
