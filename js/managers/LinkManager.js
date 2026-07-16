// ==============================================================
// ==================== LINK MANAGER =============================
// ==============================================================
// Handles Link curse (voodoo pal)

export class LinkManager {
    
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.linkedPal = null;
    }

    // ===== SET LINKED PAL =====
    setLinkedPal(board) {
        const player = this.gameManager.getPlayer();
        if (!player || !player.hasKeychain('link')) {
            this.linkedPal = null;
            return;
        }
        
        // Find all alive pals (exclude joni)
        const pals = [];
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                const palType = board[i][j].getPalType();
                const palAlive = board[i][j].isPalAlive();
                if (palType !== 'none' && palType !== 'joni' && palAlive) {
                    pals.push({ x: i, y: j, type: palType });
                }
            }
        }
        
        if (pals.length === 0) {
            this.linkedPal = null;
            return;
        }
        
        const random = pals[Math.floor(Math.random() * pals.length)];
        this.linkedPal = random;
        console.log('[Link] Linked to pal at', random.x, random.y, 'type:', random.type);
    }

    getLinkedPal() {
        return this.linkedPal;
    }

    // ===== ON PLAYER DAMAGE =====
    onPlayerDamage() {
        const player = this.gameManager.getPlayer();
        if (!player || !player.hasKeychain('link')) return;
        if (!this.linkedPal) return;
        
        const board = this.gameManager.getBoard();
        if (!board) return;
        
        const tile = board[this.linkedPal.x][this.linkedPal.y];
        if (!tile || tile.getPalType() === 'none' || !tile.isPalAlive()) {
            this.linkedPal = null;
            return;
        }
        
        // Kill the pal
        tile.setPalAlive(false);
        
        if (player) {
            player.incrementDeadPals();
        }
        
        // Update remaining pals
        const charCtrl = this.gameManager.charCtrl;
        if (charCtrl) {
            charCtrl.remainingPals--;
            console.log('[Link] Remaining pals:', charCtrl.remainingPals);
        }
        
        console.log('[Link] Pal died at', this.linkedPal.x, this.linkedPal.y);
        
        // Select new linked pal
        this.setLinkedPal(board);
    }
}