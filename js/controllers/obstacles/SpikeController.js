// ==============================================================
// ===================== SPIKE CONTROLLER =======================
// ==============================================================
// Manages spike tiles: states (OFF, PREPARED, ON), turn-based cycling,
// and damage application when stepped on.

export class SpikeController {
    
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.spikeTiles = [];      // Array de {x, y, state}
        this.turnListener = null;
    }
    
    // Register all spike tiles from the board
    registerSpikes(board) {
        this.spikeTiles = [];
        
        for (let x = 0; x < board.length; x++) {
            for (let y = 0; y < board.length; y++) {
                const tile = board[x][y];
                if (tile.getObstacletype() === "spikes") {
                    this.spikeTiles.push({
                        x: x,
                        y: y,
                        state: "off",      // "off" | "prepared" | "on"
                        tile: tile
                    });
                    // Start all spikes in OFF state
                    tile.setSpikeState("off");
                }
            }
        }
        
        // Register turn listener if spikes exist
        if (this.spikeTiles.length > 0 && this.gameManager.turnManager) {
            this.turnListener = (turn) => this.updateSpikes(turn);
            this.gameManager.turnManager.addListener(this.turnListener);
        }
        
        return this.spikeTiles.length;
    }
    
    // Update all spike states based on turn counter
    updateSpikes(turn) {
        const cycle = turn % 5;
        
        // Cycle: 0→OFF, 1→PREPARED, 2→ON, 3→ON, 4→OFF
        let state;
        if (cycle === 0) state = "off";
        else if (cycle === 1 || cycle === 2) state = "prepared";
        else if (cycle === 3 || cycle === 4) state = "on";
        else state = "off";
        
        for (const spike of this.spikeTiles) {
            spike.state = state;
            spike.tile.setSpikeState(state);
        }
    }
    
    // Check if a tile has an active spike (ON state)
    isActiveAt(x, y) {
        const spike = this.spikeTiles.find(s => s.x === x && s.y === y);
        return spike ? spike.state === "on" : false;
    }
    
    // Check if a tile has a spike (any state)
    hasSpikeAt(x, y) {
        return this.spikeTiles.some(s => s.x === x && s.y === y);
    }
    
    // Get spike state at a specific tile
    getStateAt(x, y) {
        const spike = this.spikeTiles.find(s => s.x === x && s.y === y);
        return spike ? spike.state : null;
    }
    
    // Clean up listeners
    destroy() {
        if (this.turnListener && this.gameManager.turnManager) {
            this.gameManager.turnManager.removeListener(this.turnListener);
        }
        this.spikeTiles = [];
    }
}