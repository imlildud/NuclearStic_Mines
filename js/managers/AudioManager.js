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
        
        // Track all active audio elements for real-time volume control
        this.activeAudio = [];
        
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
        if (!enabled) {
            this.stopAllSFX();
        }
    }
    
    // Set SFX volume (0.0 to 1.0) - Updates all currently playing SFX
    setSFXVolume(volume) {
        this.sfxVolume = Math.min(1, Math.max(0, volume));
        // Update all currently playing audio (SFX and music)
        for (const audio of this.activeAudio) {
            if (audio && !audio.ended) {
                audio.volume = this.sfxVolume;
            }
        }
    }
    
    // Set music volume (0.0 to 1.0) - Updates current music in real time
    setMusicVolume(volume) {
        this.musicVolume = Math.min(1, Math.max(0, volume));
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }
    }
    
    // Track an audio element for volume control
    trackAudio(audio, isMusic = false) {
        if (!audio) return;
        
        // Set volume based on type
        if (isMusic) {
            audio.volume = this.musicVolume;
        } else {
            audio.volume = this.sfxVolume;
        }
        
        this.activeAudio.push(audio);
        
        // Remove from tracking when finished
        const cleanup = () => {
            const index = this.activeAudio.indexOf(audio);
            if (index > -1) this.activeAudio.splice(index, 1);
            audio.removeEventListener('ended', cleanup);
            audio.removeEventListener('pause', cleanup);
        };
        
        audio.addEventListener('ended', cleanup);
        audio.addEventListener('pause', cleanup);
    }
    
    // Play a sound effect (optional loop)
    playSFX(soundFile, loop = false, volume = null) {
        if (!this.sfxEnabled) return null;
        
        const vol = volume !== null ? volume : this.sfxVolume;
        const audio = new Audio(`../../assets/audio/sfx/${soundFile}`);
        audio.loop = loop;
        audio.volume = vol;
        
        this.trackAudio(audio, false);
        
        audio.play().catch(e => console.log("SFX failed:", soundFile, e));
        return audio;
    }
    
    // Stop all currently playing SFX (but not music)
    stopAllSFX() {
        for (const audio of this.activeAudio) {
            if (audio && !audio.ended && audio !== this.currentMusic) {
                audio.pause();
                audio.currentTime = 0;
            }
        }
        this.activeAudio = this.activeAudio.filter(a => a === this.currentMusic);
    }
    
    // Stop all audio including music
    stopAllAudio() {
        for (const audio of this.activeAudio) {
            if (audio && !audio.ended) {
                audio.pause();
                audio.currentTime = 0;
            }
        }
        this.activeAudio = [];
        this.currentMusic = null;
        this.musicStarted = false;
    }
    
    // Play movement sound (prevents spam)
    playMoveSFX() {
        if (this.moveAudio && !this.moveAudio.ended) {
            // Still playing, don't spam
            return;
        }
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
            const index = this.activeAudio.indexOf(this.scoreAudio);
            if (index > -1) this.activeAudio.splice(index, 1);
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
            const index = this.activeAudio.indexOf(this.textAudio);
            if (index > -1) this.activeAudio.splice(index, 1);
            this.textAudio = null;
        }
        this.isWriteAnimating = false;
    }
    
    // ======================= MUSIC METHODS =======================
    
    // Load and play music based on zone
    playMusic(zone, autoStart = false) {
        // Stop current music if playing
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            const index = this.activeAudio.indexOf(this.currentMusic);
            if (index > -1) this.activeAudio.splice(index, 1);
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
        
        this.trackAudio(this.currentMusic, true);
        
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
        // Stop current music if playing
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            const index = this.activeAudio.indexOf(this.currentMusic);
            if (index > -1) this.activeAudio.splice(index, 1);
        }
        
        this.currentMusic = new Audio("../../assets/audio/music/menu.mp3");
        this.currentMusic.loop = true;
        this.currentMusic.volume = this.musicVolume;
        
        this.trackAudio(this.currentMusic, true);
        
        if (autoStart) {
            this.startMusic();
        }
    }
    
    // ======================= UTILITY =======================
    
    // Check if music is currently playing
    isMusicPlaying() {
        return this.musicStarted && this.currentMusic && !this.currentMusic.paused;
    }
    
    // Force update all volumes (useful after loading settings)
    updateAllVolumes() {
        for (const audio of this.activeAudio) {
            if (audio && !audio.ended) {
                if (audio === this.currentMusic) {
                    audio.volume = this.musicVolume;
                } else {
                    audio.volume = this.sfxVolume;
                }
            }
        }
    }
}