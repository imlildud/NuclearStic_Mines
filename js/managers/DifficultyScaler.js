// ==============================================================
// ===================== DIFFICULTY SCALER ======================
// ==============================================================
// Pure calculation functions for difficulty scaling.
// No UI, no generation logic, no side effects.

export class DifficultyScaler {
    
    // ======================= BOARD SIZE =======================
    
    static getBoardSize(level) {
        const startSize = 8;
        const step = 4;
        return startSize + Math.floor(step * (level / 5));
    }
    
    // ======================= HAZARD AMOUNT =======================
    
    static getHazardCount(level) {
        const startHazards = 7;
        const step = 7;
        return startHazards + Math.floor(step * (level / 5));
    }
    
    static getHazardCountBySize(size) {
        const baseSize = 8;
        const baseHazards = 7;
        const step = 4;
        const hazardStep = 7;
        const increment = Math.floor((size - baseSize) / step) * hazardStep;
        return baseHazards + increment;
    }
    
    // ======================= GOAL AMOUNT =======================
    
    static getPalCount(level) {
        const startPals = 1;
        const step = 1;
        return startPals + Math.floor(step * (level / 5));
    }
    
    // ======================= ZONE SELECTION =======================
    
    static getZoneByLevel(level) {
        const lvl = Math.floor(Number(level));
        if (lvl <= 9) return "desert";
        if (lvl <= 19) return "snow";
        return "ash";
    }
    
    // ======================= SCORE BONUSES (para Scoreboard) =======================
    
    static getSizeBonus(size) {
        switch(size) {
            case 8: return 10;
            case 12: return 30;
            case 16: return 50;
            case 20: return 80;
            case 24: return 100;
            default: return 10;
        }
    }
    
    static getHazardsBonus(hazards) {
        switch(hazards) {
            case 1: return 20;
            case 5: return 50;
            case 8: return 100;
            case 12: return 150;
            case 20: return 200;
            case 30: return 300;
            default: return 20;
        }
    }
    
    static getObstaclesBonus(obstacles) {
        switch(obstacles) {
            case 1: return 0;
            case 3: return 20;
            case 5: return 40;
            case 10: return 60;
            case 15: return 80;
            case 30: return 100;
            default: return 0;
        }
    }
}