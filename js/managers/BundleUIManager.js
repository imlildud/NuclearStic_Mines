// ==============================================================
// ==================== BUNDLE UI MANAGER =======================
// ==============================================================
// Handles bundle popup display, keychain selection, and animations.

import { PathResolver } from "../utils/PathResolver.js";

export class BundleUIManager {
    
    constructor(gameManager, bundleManager, audioManager) {
        this.gameManager = gameManager;
        this.bundleManager = bundleManager;
        this.audioManager = audioManager;
        this.localeManager = null;
        this.isOpen = false;
        this.currentBundle = null;
        this.currentKeychains = [];
        this.selectedCount = 0;
        this.totalKeychains = 0;
    }
    
    setLocaleManager(lm) {
        this.localeManager = lm;
    }
    
    getText(key) {
        return this.localeManager ? this.localeManager.get(key) : key;
    }
    
    showBundlePopup(tileX, tileY) {
        if (this.isOpen) return;
        
        const tierKey = this.bundleManager.getTier();
        const tier = this.bundleManager.bundleTiers[tierKey];
        const keychains = this.bundleManager.getBundleKeychains(tierKey);
        
        this.currentBundle = { tierKey, tier, keychains };
        this.currentKeychains = keychains;
        this.isOpen = true;
        this.selectedCount = 0;
        this.totalKeychains = keychains.length;
        
        this.gameManager.setGameInputLocked(true);
        this.createPopup(tierKey, keychains);
    }
    
    createPopup(tierKey, keychains) {
        this.removePopup();
        
        const overlay = document.createElement('div');
        overlay.id = 'bundle-popup-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 90000;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        `;
        
        const popup = document.createElement('div');
        popup.id = 'bundle-popup';
        popup.style.cssText = `
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4vmin;
            color: white;
            font-family: 'Shampoos';
            max-width: 95vw;
            max-height: 95vh;
        `;
        
        const bundleImg = document.createElement('img');
        bundleImg.id = 'bundle-img';
        bundleImg.src = PathResolver.resolveAsset('bundles', `${tierKey}.png`);
        bundleImg.style.cssText = `
            width: 50vmin;
            max-width: 300px;
            height: auto;
            cursor: pointer;
            transition: transform 0.2s ease, filter 0.2s ease;
            image-rendering: pixelated;
            margin: 2vmin auto;
            display: block;
        `;
        bundleImg.alt = 'Bundle';
        
        bundleImg.addEventListener('click', () => {
            this.openBundle(bundleImg, keychains);
        });
        
        bundleImg.addEventListener('mouseenter', () => {
            bundleImg.style.transform = 'scale(1.05)';
            bundleImg.style.filter = 'brightness(1.25) drop-shadow(0 0 8px rgba(255,255,200,0.7))';
            if (this.audioManager) this.audioManager.playHoverSFX();
        });
        bundleImg.addEventListener('mouseleave', () => {
            bundleImg.style.transform = 'scale(1)';
            bundleImg.style.filter = 'none';
        });
        bundleImg.addEventListener('mousedown', () => {
            bundleImg.style.transform = 'scale(0.95)';
            bundleImg.style.filter = 'brightness(0.75)';
        });
        bundleImg.addEventListener('mouseup', () => {
            bundleImg.style.transform = 'scale(1.05)';
            bundleImg.style.filter = 'brightness(1.25) drop-shadow(0 0 8px rgba(255,255,200,0.7))';
        });
        
        popup.appendChild(bundleImg);
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        this.addStyles();
    }
    
    openBundle(bundleImg, keychains) {
        const tierKey = this.currentBundle.tierKey;
        bundleImg.src = PathResolver.resolveAsset('bundles', `${tierKey}_open.png`);
        
        if (this.audioManager) this.audioManager.playClickSFX();
        
        setTimeout(() => {
            bundleImg.style.display = 'none';
            this.showKeychains(bundleImg.parentElement, keychains);
        }, 300);
    }
    
    showKeychains(container, keychains) {
        const count = keychains.length;
        
        // Determine grid layout
        let gridTemplate = '';
        let itemSize = '22vmin';
        let iconSize = '18vmin';
        let nameSize = '4.2vmin';
        let rarezaSize = '3.6vmin';
        let gap = '3vmin';
        
        if (count === 1) {
            gridTemplate = '1fr';
        } else if (count === 2) {
            gridTemplate = '1fr 1fr';
        } else if (count === 3) {
            gridTemplate = '1fr 1fr';
        } else if (count >= 4) {
            gridTemplate = '1fr 1fr';
            itemSize = '19vmin';
            iconSize = '15vmin';
            nameSize = '2.8vmin';
            rarezaSize = '2.3vmin';
            gap = '2vmin';
        }
        
        const keychainContainer = document.createElement('div');
        keychainContainer.style.cssText = `
            display: grid;
            grid-template-columns: ${gridTemplate};
            gap: ${gap};
            justify-content: center;
            align-items: center;
            margin-top: 2vmin;
            padding: 2vmin;
            width: 100%;
            max-width: 80vmin;
        `;
        
        // Handle 3 items: first two on top row, third centered below
        if (count === 3) {
            keychainContainer.style.gridTemplateColumns = '1fr 1fr';
            keychainContainer.style.gridTemplateRows = 'auto auto';
        }
        
        const rarezaMap = {
            'typical': { bg: 'typical', color: '#8B7355' },
            'abnormal': { bg: 'abnormal', color: '#E8762D' },
            'extravagant': { bg: 'extravagant', color: '#9B59B6' },
            'unheard': { bg: 'outrageous', color: '#C0392B' },
            'cursed': { bg: 'cursed', color: '#1A1A1A' }
        };
        
        keychains.forEach((keychain, index) => {
            const item = document.createElement('div');
            item.className = 'keychain-item';
            
            let gridPosition = '';
            if (count === 3 && index === 2) {
                gridPosition = 'grid-column: 1 / -1; justify-self: center;';
            }
            
            item.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 1.5vmin 1.5vmin;
                cursor: pointer;
                transition: transform 0.15s ease, filter 0.15s ease, opacity 0.3s ease;
                animation: keychainItemAppear 0.3s ease-out;
                animation-delay: ${index * 0.08}s;
                opacity: 0;
                animation-fill-mode: forwards;
                background: transparent;
                border: none;
                ${gridPosition}
            `;
            
            // Hover effect
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'scale(1.08)';
                item.style.filter = 'brightness(1.25) drop-shadow(0 0 8px rgba(255,255,200,0.7))';
                if (this.audioManager) this.audioManager.playHoverSFX();
            });
            item.addEventListener('mouseleave', () => {
                item.style.transform = 'scale(1)';
                item.style.filter = 'none';
            });
            
            // Active effect (click)
            item.addEventListener('mousedown', () => {
                item.style.transform = 'scale(0.92)';
                item.style.filter = 'brightness(0.75)';
            });
            item.addEventListener('mouseup', () => {
                item.style.transform = 'scale(1.08)';
                item.style.filter = 'brightness(1.25) drop-shadow(0 0 8px rgba(255,255,200,0.7))';
            });
            
            const iconWrapper = document.createElement('div');
            iconWrapper.style.cssText = `
                position: relative;
                display: flex;
                justify-content: center;
                align-items: center;
                width: ${itemSize};
                height: ${itemSize};
            `;
            
            const aura = document.createElement('img');
            aura.src = PathResolver.resolveAsset('keychains', `${rarezaMap[keychain.rareza]?.bg || 'typical'}_aura.png`);
            aura.style.cssText = `
                position: absolute;
                width: ${iconSize};
                height: ${iconSize};
                image-rendering: pixelated;
                opacity: 0.5;
                pointer-events: none;
            `;
            
            const icon = document.createElement('img');
            icon.src = PathResolver.resolveAsset('keychains', `keychain_${keychain.id}.png`);
            icon.style.cssText = `
                width: ${iconSize};
                height: ${iconSize};
                image-rendering: pixelated;
                z-index: 1;
                position: relative;
            `;
            icon.alt = keychain.name;
            
            iconWrapper.appendChild(aura);
            iconWrapper.appendChild(icon);
            
            const rarezaWrapper = document.createElement('div');
            rarezaWrapper.style.cssText = `
                position: relative;
                width: 100%;
                margin-top: 0.5vmin;
                display: flex;
                justify-content: center;
                align-items: center;
            `;
            
            const rarezaBg = document.createElement('img');
            rarezaBg.src = PathResolver.resolveAsset('keychains', `${rarezaMap[keychain.rareza]?.bg || 'typical'}.png`);
            rarezaBg.style.cssText = `
                width: 80%;
                height: auto;
                image-rendering: pixelated;
            `;
            
            const rarezaLabel = document.createElement('span');
            rarezaLabel.textContent = this.getText(`bundle.rareza.${keychain.rareza}`);
            rarezaLabel.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: ${rarezaSize};
                color: white;
                text-shadow: 1px 1px 0 #000;
                font-weight: bold;
                letter-spacing: 0.5px;
                width: 100%;
                text-align: center;
                white-space: nowrap;
            `;
            
            rarezaWrapper.appendChild(rarezaBg);
            rarezaWrapper.appendChild(rarezaLabel);
            
            const name = document.createElement('span');
            name.textContent = this.getText(`keychain.${keychain.id}.name`);
            name.style.cssText = `
                font-size: ${nameSize};
                color: white;
                margin-top: 0.3vmin;
                text-shadow: 1px 1px 0 #000;
                font-weight: bold;
                text-align: center;
                white-space: nowrap;
            `;
            
            item.appendChild(iconWrapper);
            item.appendChild(rarezaWrapper);
            item.appendChild(name);
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.takeKeychain(keychain, item);
            });
            
            keychainContainer.appendChild(item);
        });
        
        container.appendChild(keychainContainer);
    }
    
    takeKeychain(keychain, item) {
        const player = this.gameManager.getPlayer();
        const inventory = player.getInventory ? player.getInventory() : [];
        
        if (inventory.length >= 5) {
            this.showInventoryFullPopup();
            return;
        }
        
        if (player.addKeychain) {
            player.addKeychain(keychain.id);
        }
        
        if (this.audioManager) this.audioManager.playRescueSFX();
        
        item.style.opacity = '0.3';
        item.style.pointerEvents = 'none';
        item.style.transform = 'scale(0.8)';
        
        this.selectedCount++;
        
        setTimeout(() => {
            this.closePopup();
        }, 400);
    }
    
    showInventoryFullPopup() {
        const message = this.getText('bundle.inventoryFull');
        if (this.gameManager) {
            this.gameManager.showMessage(message);
        }
    }
    
    closePopup() {
        this.isOpen = false;
        this.removePopup();
        this.gameManager.setGameInputLocked(false);
    }
    
    removePopup() {
        const overlay = document.getElementById('bundle-popup-overlay');
        if (overlay) overlay.remove();
    }
    
    addStyles() {
        if (document.getElementById('bundle-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'bundle-styles';
        style.textContent = `
            @keyframes keychainItemAppear {
                0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}