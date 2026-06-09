// ==============================================================
// ===================== PATH RESOLVER ==========================
// ==============================================================
// Handles dynamic path resolution for assets and navigation.
// Works both in local development and on itch.io / GameJolt.

export class PathResolver {
    
    static getBasePath() {
        // Check if we're running on itch.io or GameJolt
        const isItch = window.location.hostname.includes('itch.io') || 
                       window.location.pathname.includes('/itch/');
        const isGameJolt = window.location.hostname.includes('gamejolt') || 
                           window.location.pathname.includes('/gamejolt/');
        
        // Check if we're in a subdirectory (like /pages/)
        const isInPages = window.location.pathname.includes('/pages/');
        
        if (isItch || isGameJolt) {
            // On itch.io/GameJolt, everything is relative to root
            return '';
        } else if (isInPages) {
            // In local development from pages/ subdirectory
            return '../';
        } else {
            // In local development from root
            return '';
        }
    }
    
    static resolve(path) {
        return this.getBasePath() + path;
    }
    
    static resolveAsset(type, ...segments) {
        const assetPaths = {
            // Locales
            locales: 'assets/locales/',
            
            // Audio
            audio: 'assets/audio/',
            music: 'assets/audio/music/',
            sfx: 'assets/audio/sfx/',
            
            // Sprites
            sprites: 'assets/sprites/',
            characters: 'assets/sprites/characters/',
            tiles: 'assets/sprites/tiles/',
            
            // HUD - General
            hud: 'assets/hud/',
            badges: 'assets/hud/badges/',
            punchcard: 'assets/hud/punchcard/',
            menu: 'assets/hud/menu/',
            
            // HUD - Game
            gameHud: 'assets/hud/game/',
            gameStats: 'assets/hud/game/stats/',
            gameControl: 'assets/hud/game/control/',
            gameCharacterIcon: 'assets/hud/game/charactericon/',
            gameWallpaper: 'assets/hud/game/wallpaper/',
            gameGameover: 'assets/hud/game/gameover/',
            gameRadio: 'assets/hud/game/radio/',
            
            // HUD - Config/Options
            configHud: 'assets/hud/options/'
        };
        
        const base = assetPaths[type];
        if (!base) {
            console.warn(`[PathResolver] Unknown asset type: ${type}`);
            return this.resolve(segments.join('/'));
        }
        
        return this.resolve(base + segments.join('/'));
    }
    
    // ======================= NAVIGATION METHODS =======================
    
    static getPathToRoot() {
        const isInPages = window.location.pathname.includes('/pages/');
        if (isInPages) {
            return '../';
        }
        return '';
    }
    
    static goToIndex() {
        const path = this.getPathToRoot() + 'index.html';
        window.location.href = path;
    }
    
    static goToGame() {
        const path = this.getPathToRoot() + 'pages/game.html';
        window.location.href = path;
    }
    
    static goToConfig() {
        const path = this.getPathToRoot() + 'pages/configuration.html';
        window.location.href = path;
    }
}