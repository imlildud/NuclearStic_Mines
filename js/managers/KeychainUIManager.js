// ==============================================================
// ==================== KEYCHAIN UI MANAGER ======================
// ==============================================================
// Handles keychain info popups, animations, and interactions.

import { PathResolver } from "../utils/PathResolver.js";

export class KeychainUIManager {
    
    constructor(gameManager, audioManager) {
        this.gameManager = gameManager;
        this.audioManager = audioManager;
        this.localeManager = null;
        this.isOpen = false;
        
        // Rareza configuration
        this.rarezaMap = {
            'typical': { bg: 'typical', color: '#8B7355', borderColor: '#8B7355' },
            'abnormal': { bg: 'abnormal', color: '#E8762D', borderColor: '#E8762D' },
            'extravagant': { bg: 'extravagant', color: '#9B59B6', borderColor: '#9B59B6' },
            'unheard': { bg: 'outrageous', color: '#C0392B', borderColor: '#C0392B' },
            'cursed': { bg: 'cursed', color: '#1A1A1A', borderColor: '#1A1A1A' }
        };
        
        this.addStyles();
    }
    
    setLocaleManager(lm) {
        this.localeManager = lm;
    }
    
    getText(key) {
        return this.localeManager ? this.localeManager.get(key) : key;
    }
    
    // ==============================================================
    // ==================== SHOW KEYCHAIN INFO ======================
    // ==============================================================
    
    showKeychainInfo(keychainId) {
        const bundleManager = this.gameManager.bundleManager;
        if (!bundleManager) {
            console.warn('BundleManager not available');
            return;
        }
        
        const keychainData = bundleManager.getAllKeychains().find(k => k.id === keychainId);
        if (!keychainData) {
            console.warn('Keychain not found:', keychainId);
            return;
        }
        
        // If popup already open, close it
        if (this.isOpen) {
            this.closePopup();
            return;
        }
        
        // Get locale data
        const name = this.getText(`keychain.${keychainId}.name`) || keychainId;
        const description = this.getText(`keychain.${keychainId}.description`) || '';
        const rarezaKey = keychainData.rareza;
        const rarezaName = this.getText(`bundle.rareza.${rarezaKey}`) || rarezaKey;
        const rarezaInfo = this.rarezaMap[rarezaKey] || this.rarezaMap['typical'];
        
        this.isOpen = true;
        this.gameManager.setGameInputLocked(true);
        
        // Create popup
        const overlay = this.createPopupOverlay();
        const content = this.createPopupContent(keychainId, name, description, rarezaName, rarezaInfo);
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Play sound
        if (this.audioManager) this.audioManager.playClickSFX();
    }
    
    // ==============================================================
    // ==================== CREATE POPUP ELEMENTS ===================
    // ==============================================================
    
    createPopupOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'keychain-info-popup';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 100000;
            display: flex;
            justify-content: center;
            align-items: center;
            background: rgba(0, 0, 0, 0.72);
            animation: keychainFadeIn 0.2s ease-out;
            cursor: pointer;
            backdrop-filter: blur(2px);
            -webkit-backdrop-filter: blur(2px);
        `;
        
        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closePopup();
            }
        });
        
        // ESC key to close
        this.escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closePopup();
            }
        };
        document.addEventListener('keydown', this.escHandler);
        
        return overlay;
    }
    
    createPopupContent(keychainId, name, description, rarezaName, rarezaInfo) {
        const container = document.createElement('div');
        container.style.cssText = `
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2vmin;
            animation: keychainPopupAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            cursor: default;
            user-select: none;
        `;
        
        // Aura + Icon container
        container.appendChild(this.createAuraIconContainer(keychainId, rarezaInfo));
        
        // Rareza badge
        container.appendChild(this.createRarezaBadge(rarezaName, rarezaInfo));
        
        // Name
        container.appendChild(this.createNameElement(name));
        
        // Description
        container.appendChild(this.createDescriptionElement(description));
        
        return container;
    }
    
    // ==============================================================
    // ==================== POPUP SUB-COMPONENTS ====================
    // ==============================================================
    
    createAuraIconContainer(keychainId, rarezaInfo) {
        const container = document.createElement('div');
        container.style.cssText = `
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 28vmin;
            min-width: 28vmin;
            margin-bottom: 1vmin;
        `;
        
        // Aura
        const aura = document.createElement('img');
        aura.src = PathResolver.resolveAsset('keychains', `${rarezaInfo.bg}_aura.png`);
        aura.style.cssText = `
            width: 28vmin;
            height: 28vmin;
            image-rendering: pixelated;
            opacity: 0.6;
            position: absolute;
            animation: keychainAuraPulse 3s ease-in-out infinite;
            filter: drop-shadow(0 0 40px ${rarezaInfo.borderColor}60);
        `;
        container.appendChild(aura);
        
        // Icon
        const icon = document.createElement('img');
        icon.src = PathResolver.resolveAsset('keychains', `keychain_${keychainId}.png`);
        icon.style.cssText = `
            width: 20vmin;
            height: 30vmin;
            image-rendering: pixelated;
            position: relative;
            z-index: 1;
            animation: keychainFloat 2.5s ease-in-out infinite;
            filter: drop-shadow(0 0 30px ${rarezaInfo.borderColor}40);
        `;
        icon.alt = keychainId;
        container.appendChild(icon);
        
        return container;
    }
    
    // En KeychainUIManager.js - Actualizar createRarezaBadge

    createRarezaBadge(rarezaName, rarezaInfo) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 1.5vmin;
            width: 30vmin;
            max-width: 80%;
        `;
        
        // Background image para la rareza (el cuadrito pixelado)
        const rarezaBg = document.createElement('img');
        rarezaBg.src = PathResolver.resolveAsset('keychains', `${rarezaInfo.bg}.png`);
        rarezaBg.style.cssText = `
            width: 100%;
            height: auto;
            image-rendering: pixelated;
        `;
        
        // Texto de rareza sobre el background
        const text = document.createElement('span');
        text.textContent = rarezaName;
        text.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-family: 'Shampoos';
            font-size: 2.8vmin;
            color: white;
            text-shadow: 1px 1px 0 #000;
            letter-spacing: 1px;
            font-weight: bold;
            width: 100%;
            text-align: center;
            white-space: nowrap;
        `;
        
        wrapper.appendChild(rarezaBg);
        wrapper.appendChild(text);
        return wrapper;
    }
    
    createNameElement(name) {
        const el = document.createElement('div');
        el.textContent = name;
        el.style.cssText = `
            font-family: 'Shampoos';
            font-size: 5vmin;
            color: white;
            font-weight: bold;
            text-shadow: 0 0 30px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.5);
            margin-bottom: 1vmin;
            letter-spacing: 0.5px;
            text-align: center;
        `;
        return el;
    }
    
    createDescriptionElement(description) {
        const el = document.createElement('div');
        el.textContent = description;
        el.style.cssText = `
            font-family: 'Shampoos';
            font-size: 4vmin;
            color: rgba(255, 255, 255, 0.75);
            line-height: 1.6;
            font-style: italic;
            max-width: 45vmin;
            text-align: center;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        `;
        return el;
    }
    
    // ==============================================================
    // ==================== CLOSE POPUP =============================
    // ==============================================================
    
    closePopup() {
        const overlay = document.getElementById('keychain-info-popup');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
                overlay.remove();
            }, 200);
        }
        
        this.isOpen = false;
        this.gameManager.setGameInputLocked(false);
        
        // Remove ESC handler
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }
    }
    
    // ==============================================================
    // ==================== STYLES ==================================
    // ==============================================================

    addStyles() {
        if (document.getElementById('keychain-ui-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'keychain-ui-styles';
        style.textContent = `
            @keyframes keychainPopupAppear {
                0% { transform: scale(0.6) rotate(-5deg); opacity: 0; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            
            @keyframes keychainFadeIn {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
            
            @keyframes keychainFloat {
                0% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-12px) rotate(3deg); }
                100% { transform: translateY(0px) rotate(0deg); }
            }
            
            @keyframes keychainAuraPulse {
                0% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.15); opacity: 0.8; }
                100% { transform: scale(1); opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
    }
}