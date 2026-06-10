// ==============================================================
// ===================== PATH RESOLVER ==========================
// ==============================================================
// Handles dynamic path resolution for assets.
// Works both in local development, itch.io, GameJolt, and Cordova.

export class PathResolver {
    
    // ======================= BASE PATH DETECTION =======================
    
    // Detects the current environment and returns the appropriate base path
    static getBasePath() {
        // Detect Cordova / Android WebView
        const isCordova = window.cordova || window.Cordova || (typeof cordova !== 'undefined');
        
        // Check if we're running on itch.io
        const isItch = window.location.hostname.includes('itch.io') || 
                       window.location.pathname.includes('/itch/');
        
        // Check if we're running on GameJolt
        const isGameJolt = window.location.hostname.includes('gamejolt') || 
                           window.location.pathname.includes('/gamejolt/');
        
        // Check if we're in a subdirectory (like /pages/ during local development)
        const isInPages = window.location.pathname.includes('/pages/');
        
        // Cordova: everything is relative to the root of the APK
        if (isCordova) {
            return '';
        }
        
        // itch.io or GameJolt: root directory serving
        if (isItch || isGameJolt) {
            return '';
        }
        
        // Local development from /pages/ subdirectory
        if (isInPages) {
            return '../';
        }
        
        // Local development from root
        return '';
    }
    
    // ======================= PATH RESOLUTION =======================
    
    // Resolves a relative path with the base path
    static resolve(path) {
        return this.getBasePath() + path;
    }
    
    // ======================= ASSET RESOLUTION =======================
    
    // Resolves asset paths based on type and segments
    static resolveAsset(type, ...segments) {
        const assetPaths = {
            // Locales (language files)
            locales: 'assets/locales/',
            
            // Audio files
            audio: 'assets/audio/',
            music: 'assets/audio/music/',
            sfx: 'assets/audio/sfx/',
            
            // Sprites and tile textures
            sprites: 'assets/sprites/',
            characters: 'assets/sprites/characters/',
            tiles: 'assets/sprites/tiles/',
            
            // HUD - General UI elements
            hud: 'assets/hud/',
            badges: 'assets/hud/badges/',
            punchcard: 'assets/hud/punchcard/',
            menu: 'assets/hud/menu/',
            
            // HUD - In-game UI elements
            gameHud: 'assets/hud/game/',
            gameStats: 'assets/hud/game/stats/',
            gameControl: 'assets/hud/game/control/',
            gameCharacterIcon: 'assets/hud/game/charactericon/',
            gameWallpaper: 'assets/hud/game/wallpaper/',
            gameGameover: 'assets/hud/game/gameover/',
            gameRadio: 'assets/hud/game/radio/',
            
            // HUD - Configuration panel elements
            configHud: 'assets/hud/options/'
        };
        
        const base = assetPaths[type];
        
        // Unknown asset type, fallback to simple path resolution
        if (!base) {
            console.warn(`[PathResolver] Unknown asset type: ${type}`);
            return this.resolve(segments.join('/'));
        }
        
        return this.resolve(base + segments.join('/'));
    }
    
    // ======================= NAVIGATION METHODS =======================
    
    // Returns the correct path to the root directory
    static getPathToRoot() {
        const isInPages = window.location.pathname.includes('/pages/');
        if (isInPages) {
            return '../';
        }
        return '';
    }
    
    // Navigate to the main menu (index.html)
    static goToIndex() {
        const path = this.getPathToRoot() + 'index.html';
        console.log(`[PathResolver] Navigating to: ${path}`);
        window.location.href = path;
    }
    
    // Navigate to the game screen
    static goToGame() {
        const path = this.getPathToRoot() + 'pages/game.html';
        console.log(`[PathResolver] Navigating to: ${path}`);
        window.location.href = path;
    }
    
    // Navigate to the configuration screen
    static goToConfig() {
        const path = this.getPathToRoot() + 'pages/configuration.html';
        console.log(`[PathResolver] Navigating to: ${path}`);
        window.location.href = path;
    }
}