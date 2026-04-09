export class TileModel {
    constructor() {
        // Initialization of the view status
        this.hide = true; // Hide the content of the tile

        // Initialization of the start and finish tiles
        this.start = false; // Define if the tile is the start
        this.goaltype = "none"; // Define if the tile is a goal
        this.goallive = false; // Define if the goal is lost

        // Initialization of the conditions for tile mapping
        this.secure = false; // Define if the tile is a secure area
        this.securehidden = false; // Define if the tile is a secure hidden area
        this.flagged = false; // Define if the tile is a flagged tile
        this.marked = false; // Define if the tile is a flagged hazard

        // Initialization of tile height
        this.height = 0; // 0 default height

        // Initialization of obstacle tile
        this.obstacletype = "none"; // Define the type of obstacle

        // Hazard initialization
        this.hazardcount = 0; // Define how many hazards are around the tile
        this.damageratio = false; // Define a damage radius
        this.detectionratio = false; // Define a detection radius
        this.hazardtype = "none"; // Define the type of hazard
        this.hazardlive = false; // Define if the hazard is live
    }

    // Getter & Setter Hide
    isHide() { return this.hide; }
    setHide(v) { this.hide = v; }

    // Getter & Setter Start
    isStart() { return this.start; }
    setStart(v) { this.start = v; }

    // Getter & Setter Goal
    getGoaltype() { return this.goaltype; }
    setGoaltype(v) { this.goaltype = v; }

    // Getter & Setter Goal Status
    isGoallive() { return this.goallive; }
    setGoallive(v) { this.goallive = v; }

    // Getter & Setter Secure
    isSecure() { return this.secure; }
    setSecure(v) { this.secure = v; }

    // Getter & Setter Secure hidden
    isSecurehidden() { return this.securehidden; }
    setSecurehidden(v) { this.securehidden = v; }

    // Getter & Setter Flagged
    isFlagged() { return this.flagged; }
    setFlagged(v) { this.flagged = v; }

    // Getter & Setter Marked
    isMarked() { return this.marked; }
    setMarked(v) { this.marked = v; }

    // Getter & Setter Height
    getTileheight() { return this.height; }
    setTileheight(v) { this.height = v; }

    // Getter & Setter Obstacle Type
    getObstacletype() { return this.obstacletype; }
    setObstacletype(v) { this.obstacletype = v; }

    // Getter & Increment Hazard Count
    getHazardcount() { return this.hazardcount; }
    incrementHazardcount() { this.hazardcount++; }
    setHazardcount(v) { this.hazardcount = v; }

    // Getter & Setter Damage Ratio
    getDamageratio() { return this.damageratio; }
    setDamageratio(v) { this.damageratio = v; }

    // Getter & Setter Detection Ratio
    getDetectionratio() { return this.detectionratio; }
    setDetectionratio(v) { this.detectionratio = v; }

    // Getter & Setter Hazard Type
    getHazardtype() { return this.hazardtype; }
    setHazardtype(v) { this.hazardtype = v; }

    // Getter & Setter Hazard Live
    isHazardlive() { return this.hazardlive; }
    setHazardlive(v) { this.hazardlive = v; }
}