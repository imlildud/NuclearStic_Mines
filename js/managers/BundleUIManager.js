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
        
        // Verificar si el inventario está lleno ANTES de generar el bundle
        const player = this.gameManager.getPlayer();
        const maxSize = player.maxInventorySize || 5;
        const isInventoryFull = player.inventory.length >= maxSize;
        
        const tierKey = this.bundleManager.getTier();
        const tier = this.bundleManager.bundleTiers[tierKey];
        const keychains = this.bundleManager.getBundleKeychains(tierKey);
        
        this.currentBundle = { tierKey, tier, keychains };
        this.currentKeychains = keychains;
        this.isOpen = true;
        this.selectedCount = 0;
        this.totalKeychains = keychains.length;
        
        this.gameManager.setGameInputLocked(true);
        
        // Si el inventario está lleno, mostrar popup de inventario lleno directamente
        if (isInventoryFull) {
            this.showInventoryFullPopup();
        } else {
            this.createPopup(tierKey, keychains);
        }
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
        
        const maxSize = player.maxInventorySize || 5;
        if (player.inventory.length >= maxSize) {
            this.showInventoryFullPopup();
            return;
        }
        
        if (player.inventory.includes(keychain.id)) {
            return;
        }
        
        player.inventory.push(keychain.id);
        
        // Initialize uses for limited-use keychains
        if (keychain.id === 'descent') {
            player.initKeychainUses('descent', 5);
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
    
    // ==============================================================
    // ==================== INVENTORY FULL POPUP ====================
    // ==============================================================
    
    showInventoryFullPopup() {
        // Remove current popup
        this.removePopup();
        
        const overlay = document.createElement('div');
        overlay.id = 'bundle-popup-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 90000;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(2px);
            -webkit-backdrop-filter: blur(2px);
            animation: keychainFadeIn 0.2s ease-out;
            cursor: pointer;
        `;
        
        // Click outside to close (solo si no es trash)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                // Solo cerrar si no estamos en modo trash
                if (!this.isTrashMode) {
                    this.closePopup();
                }
            }
        });
        
        const roll = Math.random();
        const isTrash = roll < 0.20; // 20% chance for trash
        
        this.isTrashMode = isTrash;
        
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2vmin;
            animation: keychainPopupAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            cursor: default;
            user-select: none;
        `;
        
        // Icono (keychain_none o trash)
        const icon = document.createElement('img');
        const iconSrc = isTrash 
            ? PathResolver.resolveAsset('keychains', 'trash.png')
            : PathResolver.resolveAsset('keychains', 'keychain_none.png');
        icon.src = iconSrc;
        icon.style.cssText = `
            width: 25vmin;
            height: 25vmin;
            image-rendering: pixelated;
            cursor: pointer;
            transition: transform 0.15s ease, filter 0.15s ease;
            margin-bottom: 2vmin;
        `;
        
        // Hover effect
        icon.addEventListener('mouseenter', () => {
            icon.style.transform = 'scale(1.08)';
            icon.style.filter = 'brightness(1.2) drop-shadow(0 0 20px rgba(255,255,200,0.4))';
            if (this.audioManager) this.audioManager.playHoverSFX();
        });
        icon.addEventListener('mouseleave', () => {
            icon.style.transform = 'scale(1)';
            icon.style.filter = 'none';
        });
        icon.addEventListener('mousedown', () => {
            icon.style.transform = 'scale(0.92)';
            icon.style.filter = 'brightness(0.75)';
        });
        icon.addEventListener('mouseup', () => {
            icon.style.transform = 'scale(1.08)';
            icon.style.filter = 'brightness(1.2) drop-shadow(0 0 20px rgba(255,255,200,0.4))';
        });
        
        // Click handler
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isTrash) {
                // Modo trash: mostrar selección de keychain para eliminar
                this.showTrashSelection();
            } else {
                // Modo none: cerrar popup
                if (this.audioManager) this.audioManager.playClickSFX();
                this.closePopup();
            }
        });
        
        container.appendChild(icon);
        
        // Texto descriptivo
        const text = document.createElement('div');
        text.textContent = isTrash 
            ? this.getText('bundle.trashFound') || '¡Encontraste basura! Click para tirar un keychain'
            : this.getText('bundle.nothingFound') || 'No encontraste nada...';
        text.style.cssText = `
            font-family: 'Shampoos';
            font-size: 3vmin;
            color: white;
            text-shadow: 1px 1px 0 #000;
            text-align: center;
            max-width: 40vmin;
        `;
        container.appendChild(text);
        
        overlay.appendChild(container);
        document.body.appendChild(overlay);
        
        this.addStyles();
    }
    
    // ==============================================================
    // ==================== TRASH SELECTION =========================
    // ==============================================================
    
    showTrashSelection() {
        const player = this.gameManager.getPlayer();
        const inventory = player.inventory || [];
        
        if (inventory.length === 0) {
            this.closePopup();
            return;
        }
        
        // Limpiar el popup actual
        const overlay = document.getElementById('bundle-popup-overlay');
        if (!overlay) return;
        
        overlay.innerHTML = '';
        overlay.style.cursor = 'default';
        
        // Contenedor flotante sin recuadro
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2vmin;
            animation: keychainPopupAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            cursor: default;
            user-select: none;
        `;
        
        // Título
        const title = document.createElement('div');
        title.textContent = this.getText('bundle.trashTitle') || 'Elige un keychain para eliminar:';
        title.style.cssText = `
            font-family: 'Shampoos';
            font-size: 3.5vmin;
            color: white;
            text-shadow: 1px 1px 0 #000;
            margin-bottom: 2vmin;
            text-align: center;
        `;
        container.appendChild(title);
        
        // Grid de keychains
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 2.5vmin;
            max-width: 50vmin;
            padding: 1vmin;
        `;
        
        inventory.forEach((keychainId) => {
            const slot = document.createElement('div');
            slot.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                cursor: pointer;
                padding: 1.5vmin;
                border-radius: 1.5vmin;
                transition: transform 0.15s ease, filter 0.15s ease, background 0.15s ease;
                background: rgba(255,255,255,0.05);
            `;
            
            slot.addEventListener('mouseenter', () => {
                slot.style.transform = 'scale(1.08)';
                slot.style.filter = 'brightness(1.2) drop-shadow(0 0 15px rgba(255,100,100,0.3))';
                slot.style.background = 'rgba(255,50,50,0.15)';
                if (this.audioManager) this.audioManager.playHoverSFX();
            });
            slot.addEventListener('mouseleave', () => {
                slot.style.transform = 'scale(1)';
                slot.style.filter = 'none';
                slot.style.background = 'rgba(255,255,255,0.05)';
            });
            slot.addEventListener('mousedown', () => {
                slot.style.transform = 'scale(0.92)';
                slot.style.filter = 'brightness(0.75)';
            });
            slot.addEventListener('mouseup', () => {
                slot.style.transform = 'scale(1.08)';
                slot.style.filter = 'brightness(1.2) drop-shadow(0 0 15px rgba(255,100,100,0.3))';
            });
            
            const img = document.createElement('img');
            img.src = PathResolver.resolveAsset('keychains', `keychain_${keychainId}.png`);
            img.style.cssText = `
                width: 10vmin;
                height: 10vmin;
                image-rendering: pixelated;
            `;
            
            const name = document.createElement('span');
            name.textContent = this.getText(`keychain.${keychainId}.name`) || keychainId;
            name.style.cssText = `
                font-family: 'Shampoos';
                font-size: 2vmin;
                color: white;
                margin-top: 0.5vmin;
                text-shadow: 1px 1px 0 #000;
                text-align: center;
            `;
            
            slot.appendChild(img);
            slot.appendChild(name);
            
            slot.addEventListener('click', () => {
                // Eliminar el keychain
                const idx = player.inventory.indexOf(keychainId);
                if (idx > -1) {
                    player.inventory.splice(idx, 1);
                }
                if (this.audioManager) this.audioManager.playClickSFX();
                this.closePopup();
            });
            
            grid.appendChild(slot);
        });
        
        container.appendChild(grid);
        overlay.appendChild(container);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                // No cerrar al hacer click fuera, obligar a elegir
            }
        });
    }
    
    closePopup() {
        this.isOpen = false;
        this.isTrashMode = false;
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
            
            @keyframes keychainPopupAppear {
                0% { transform: scale(0.6) rotate(-5deg); opacity: 0; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            
            @keyframes keychainFadeIn {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}