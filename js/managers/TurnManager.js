// ==============================================================
// ====================== TURN MANAGER ==========================
// ==============================================================
// Handles turn counting and notifies listeners when a turn occurs.
// Used for Spikes, Foes (1.1.0), and any turn-based mechanics.

export class TurnManager {
    
    constructor() {
        this.turnCounter = 0;
        this.listeners = [];
        this.isPaused = false;
    }
    
    // Increment turn counter and notify listeners
    incrementTurn() {
        if (this.isPaused) return;
        
        this.turnCounter++;
        this.notifyListeners();
        return this.turnCounter;
    }
    
    // Get current turn count
    getTurn() {
        return this.turnCounter;
    }
    
    // Reset turn counter (for new game / level)
    reset() {
        this.turnCounter = 0;
    }
    
    // Pause turn counting (during dialogs, pause menu, etc.)
    pause() {
        this.isPaused = true;
    }
    
    // Resume turn counting
    resume() {
        this.isPaused = false;
    }
    
    // Register a listener to be notified on each turn
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    // Remove a listener
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }
    
    // Notify all listeners
    notifyListeners() {
        for (const callback of this.listeners) {
            callback(this.turnCounter);
        }
    }
}