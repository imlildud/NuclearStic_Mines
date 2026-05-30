// ==============================================================
// ======================= TILE MODEL ===========================
// ==============================================================
// Manages the state and properties of a single tile in the game grid

export class TileModel {
    
    // ======================= CONSTRUCTOR =======================
    // Initializes all tile properties with default values
    
    constructor() {
        // ========== VIEW STATUS ==========
        this.hide = true;               // Hide the content of the tile (undiscovered)
        
        // ========== START & GOAL TILES ==========
        this.start = false;             // Define if the tile is the starting position
        this.goaltype = "none";         // Define if the tile is a goal (rescue target)
        this.goallive = false;          // Define if the goal is still active (not lost)
        
        // ========== MAP CONDITIONS ==========
        this.secure = false;            // Define if the tile is a secure area
        this.securehidden = false;      // Define if the tile is a secure hidden area
        this.flagged = false;           // Define if the tile has a flag marker
        this.jumpflagged = false;       // Define if the tile has a jump flag marker
        this.marked = false;            // Define if the tile is marked as a hazard
        
        // ========== TILE HEIGHT ==========
        this.height = 0;                // 0 = default height (terrain elevation)
        
        // ========== OBSTACLE ==========
        this.obstacletype = "none";     // Define the type of obstacle on the tile
        
        // ========== HAZARD PROPERTIES ==========
        this.hazardcount = 0;           // Number of hazards adjacent to the tile
        this.smoke = false;             // Flag for smoke presence
        this.damageratio = false;       // Flag for damage radius presence
        this.detectionratio = false;    // Flag for detection radius presence
        this.hazardtype = "none";       // Type of hazard on the tile
        this.hazardlive = false;        // Flag indicating if hazard is active
    }
    
    // ======================= HIDE GETTERS & SETTERS =======================
    
    isHide() { return this.hide; }
    setHide(v) { this.hide = v; }
    
    // ======================= START GETTERS & SETTERS =======================
    
    isStart() { return this.start; }
    setStart(v) { this.start = v; }
    
    // ======================= GOAL GETTERS & SETTERS =======================
    
    getGoaltype() { return this.goaltype; }
    setGoaltype(v) { this.goaltype = v; }
    
    isGoallive() { return this.goallive; }
    setGoallive(v) { this.goallive = v; }
    
    // ======================= SECURE GETTERS & SETTERS =======================
    
    isSecure() { return this.secure; }
    setSecure(v) { this.secure = v; }
    
    isSecurehidden() { return this.securehidden; }
    setSecurehidden(v) { this.securehidden = v; }
    
    // ======================= FLAGGED GETTERS & SETTERS =======================
    
    isFlagged() { return this.flagged; }
    setFlagged(v) { this.flagged = v; }
    
    isJumpflagged() { return this.jumpflagged; }
    setJumpflagged(v) { this.jumpflagged = v; }
    
    // ======================= MARKED GETTERS & SETTERS =======================
    
    isMarked() { return this.marked; }
    setMarked(v) { this.marked = v; }
    
    // ======================= HEIGHT GETTERS & SETTERS =======================
    
    getTileheight() { return this.height; }
    setTileheight(v) { this.height = v; }
    
    // ======================= OBSTACLE GETTERS & SETTERS =======================
    
    getObstacletype() { return this.obstacletype; }
    setObstacletype(v) { this.obstacletype = v; }
    
    // ======================= HAZARD COUNT GETTERS & SETTERS =======================
    
    getHazardcount() { return this.hazardcount; }
    incrementHazardcount() { this.hazardcount++; }
    setHazardcount(v) { this.hazardcount = v; }

    // ======================= SMOKE GETTERS & SETTERS =======================
    
    isSmoke() { return this.smoke; }
    setSmoke(v) { this.smoke = v; }
    
    
    // ======================= DAMAGE RATIO GETTERS & SETTERS =======================
    
    getDamageratio() { return this.damageratio; }
    setDamageratio(v) { this.damageratio = v; }
    
    // ======================= DETECTION RATIO GETTERS & SETTERS =======================
    
    getDetectionratio() { return this.detectionratio; }
    setDetectionratio(v) { this.detectionratio = v; }
    
    // ======================= HAZARD TYPE GETTERS & SETTERS =======================
    
    getHazardtype() { return this.hazardtype; }
    setHazardtype(v) { this.hazardtype = v; }
    
    // ======================= HAZARD LIVE GETTERS & SETTERS =======================
    
    isHazardlive() { return this.hazardlive; }
    setHazardlive(v) { this.hazardlive = v; }
}