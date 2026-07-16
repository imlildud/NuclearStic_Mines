// ==============================================================
// =================== KEYCHAIN SELECTOR PANEL ===================
// ==============================================================
// Handles keychain selection for Custom mode

import { PathResolver } from "../../utils/PathResolver.js";
import { BundleManager } from "../../managers/BundleManager.js";

// ==================== STATE ====================

let localeManager = null;
let selectedKeychains = [];
let allKeychains = [];
let maxSelection = 5;
let onConfirmCallback = null;
let isOpen = false;

// Rareza configuration
const rarezaMap = {
    'typical': { bg: 'typical', color: '#8B7355', borderColor: '#8B7355' },
    'abnormal': { bg: 'abnormal', color: '#E8762D', borderColor: '#E8762D' },
    'extravagant': { bg: 'extravagant', color: '#9B59B6', borderColor: '#9B59B6' },
    'unheard': { bg: 'outrageous', color: '#C0392B', borderColor: '#C0392B' },
    'cursed': { bg: 'cursed', color: '#1A1A1A', borderColor: '#1A1A1A' }
};

// ==================== INITIALIZATION ====================

function getKeychainList() {
    const bundleManager = new BundleManager(null, null);
    return bundleManager.getAllKeychains().filter(k => 
        !['fortune', 'greed', 'stuffed'].includes(k.id)
    );
}

function getText(key, params = {}) {
    if (!localeManager) return key;
    let text = localeManager.get(key) || key;
    for (const [param, value] of Object.entries(params)) {
        text = text.replace(`{${param}}`, value);
    }
    return text;
}

// ==================== SHOW SELECTOR ====================

export function showKeychainSelector(initialSelection = [], onConfirm) {
    if (isOpen) return;
    
    isOpen = true;
    selectedKeychains = [...initialSelection];
    allKeychains = getKeychainList();
    onConfirmCallback = onConfirm;
    
    // Overlay - fondo negro transparente con blur
    const overlay = document.createElement('div');
    overlay.id = 'keychain-selector-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 90000;
        background: rgba(0, 0, 0, 0.79);
        display: flex;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        animation: keychainFadeIn 0.2s ease-out;
        cursor: pointer;
        padding: 4vmin;
        box-sizing: border-box;
    `;
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeSelector();
        }
    });
    
    // ESC key to close
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeSelector();
        }
    };
    document.addEventListener('keydown', escHandler);
    overlay._escHandler = escHandler;
    
    const container = document.createElement('div');
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 2vmin;
        cursor: default;
        user-select: none;
        max-width: 90vw;
        max-height: 90vh;
        width: 100%;
        animation: keychainPopupAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;
    
    const title = document.createElement('div');
    title.textContent = getText('menu.punchcard.selectKeychains');
    title.style.cssText = `
        font-family: 'Shampoos';
        font-size: 4vmin;
        color: white;
        text-shadow: 2px 2px 0 #000, 0 0 30px rgba(0,0,0,0.5);
        margin-bottom: 1.5vmin;
        text-align: center;
    `;
    container.appendChild(title);
    
    const counter = document.createElement('div');
    counter.id = 'keychain-selector-counter';
    counter.textContent = getText('menu.punchcard.keychainSelected', { count: selectedKeychains.length });
    counter.style.cssText = `
        font-family: 'Shampoos';
        font-size: 2.5vmin;
        color: rgba(255,255,255,0.7);
        text-shadow: 1px 1px 0 #000;
        margin-bottom: 2vmin;
        text-align: center;
    `;
    container.appendChild(counter);
    
    const gridWrapper = document.createElement('div');
    gridWrapper.style.cssText = `
        width: 100%;
        max-width: 80vmin;
        max-height: 55vmin;
        overflow-y: auto;
        padding: 1vmin;
        margin-bottom: 2vmin;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.15) transparent;
    `;
    
    // Grid
    const grid = document.createElement('div');
    grid.id = 'keychain-selector-grid';
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(18vmin, 1fr));
        gap: 2.5vmin;
        justify-content: center;
    `;
    
    allKeychains.forEach(keychain => {
        const item = createKeychainItem(keychain);
        grid.appendChild(item);
    });
    
    gridWrapper.appendChild(grid);
    container.appendChild(gridWrapper);
    
    const buttonsRow = document.createElement('div');
    buttonsRow.style.cssText = `
        display: flex;
        gap: 2.5vmin;
        justify-content: center;
        margin-top: 1vmin;
    `;
    
    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = getText('menu.punchcard.keychainReset');
    resetBtn.style.cssText = `
        font-family: 'Shampoos';
        font-size: 2.5vmin;
        padding: 1.5vmin 4vmin;
        border: none;
        border-radius: 1.5vmin;
        cursor: pointer;
        background: rgba(100, 50, 50, 0.7);
        color: white;
        text-shadow: 1px 1px 0 #000;
        transition: transform 0.15s ease, filter 0.15s ease;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
    `;
    resetBtn.addEventListener('mouseenter', () => {
        resetBtn.style.transform = 'scale(1.05)';
        resetBtn.style.filter = 'brightness(1.2)';
    });
    resetBtn.addEventListener('mouseleave', () => {
        resetBtn.style.transform = 'scale(1)';
        resetBtn.style.filter = 'none';
    });
    resetBtn.addEventListener('click', () => {
        selectedKeychains = [];
        updateSelectionUI();
        updateCounter();
    });
    buttonsRow.appendChild(resetBtn);
    
    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = getText('menu.punchcard.keychainConfirm');
    confirmBtn.style.cssText = `
        font-family: 'Shampoos';
        font-size: 2.5vmin;
        padding: 1.5vmin 4vmin;
        border: none;
        border-radius: 1.5vmin;
        cursor: pointer;
        background: rgba(74, 124, 89, 0.8);
        color: white;
        text-shadow: 1px 1px 0 #000;
        transition: transform 0.15s ease, filter 0.15s ease;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
    `;
    confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.transform = 'scale(1.05)';
        confirmBtn.style.filter = 'brightness(1.2)';
    });
    confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.transform = 'scale(1)';
        confirmBtn.style.filter = 'none';
    });
    confirmBtn.addEventListener('click', () => {
        if (onConfirmCallback) {
            onConfirmCallback(selectedKeychains);
        }
        closeSelector();
    });
    buttonsRow.appendChild(confirmBtn);
    
    container.appendChild(buttonsRow);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    addStyles();
}

// ==================== CREATE KEYCHAIN ITEM ====================

function createKeychainItem(keychain) {
    const rarezaInfo = rarezaMap[keychain.rareza] || rarezaMap['typical'];
    const isSelected = selectedKeychains.includes(keychain.id);
    
    const item = document.createElement('div');
    item.dataset.keychainId = keychain.id;
    item.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1.5vmin 1vmin;
        cursor: pointer;
        border-radius: 1.5vmin;
        background: ${isSelected ? 'rgba(74, 124, 89, 0.25)' : 'rgba(255,255,255,0.03)'};
        border: 2px solid ${isSelected ? '#4a7c59' : 'rgba(255,255,255,0.05)'};
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        box-shadow: ${isSelected ? '0 0 30px rgba(74, 124, 89, 0.2)' : 'none'};
    `;
    
    const aura = document.createElement('img');
    aura.src = PathResolver.resolveAsset('keychains', `${rarezaInfo.bg}_aura.png`);
    aura.style.cssText = `
        width: 12vmin;
        height: 12vmin;
        image-rendering: pixelated;
        opacity: 0.4;
        position: absolute;
        pointer-events: none;
    `;
    
    const iconWrapper = document.createElement('div');
    iconWrapper.style.cssText = `
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 14vmin;
        height: 16vmin;
    `;
    
    const icon = document.createElement('img');
    icon.src = PathResolver.resolveAsset('keychains', `keychain_${keychain.id}.png`);
    icon.style.cssText = `
        width: 11vmin;
        height: 11vmin;
        image-rendering: pixelated;
        position: relative;
        z-index: 1;
        filter: ${isSelected ? 'drop-shadow(0 0 20px rgba(74, 124, 89, 0.5))' : 'none'};
    `;
    icon.alt = keychain.id;
    
    iconWrapper.appendChild(aura);
    iconWrapper.appendChild(icon);
    item.appendChild(iconWrapper);
    
    const rarezaWrapper = document.createElement('div');
    rarezaWrapper.style.cssText = `
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 80%;
        margin-top: 0.3vmin;
    `;
    
    const rarezaBg = document.createElement('img');
    rarezaBg.src = PathResolver.resolveAsset('keychains', `${rarezaInfo.bg}.png`);
    rarezaBg.style.cssText = `
        width: 100%;
        height: auto;
        image-rendering: pixelated;
    `;
    
    const rarezaText = document.createElement('span');
    rarezaText.textContent = getText(`bundle.rareza.${keychain.rareza}`) || keychain.rareza;
    rarezaText.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Shampoos';
        font-size: 2vmin;
        color: #ffffff;
        text-shadow: 1px 1px 0 #000000;
        font-weight: bold;
        width: 100%;
        text-align: center;
        white-space: nowrap;
    `;
    
    rarezaWrapper.appendChild(rarezaBg);
    rarezaWrapper.appendChild(rarezaText);
    item.appendChild(rarezaWrapper);
    
    const name = document.createElement('div');
    name.textContent = getText(`keychain.${keychain.id}.name`) || keychain.id;
    name.style.cssText = `
        font-family: 'Shampoos';
        font-size: 2.2vmin;
        color: white;
        text-shadow: 1px 1px 0 #000;
        text-align: center;
        margin-top: 0.3vmin;
    `;
    item.appendChild(name);
    
    item.addEventListener('click', () => {
        toggleKeychain(keychain.id);
    });
    
    item.addEventListener('mouseenter', () => {
        if (!isSelected) {
            item.style.transform = 'scale(1.05)';
            item.style.background = 'rgba(255,255,255,0.08)';
        }
    });
    item.addEventListener('mouseleave', () => {
        if (!isSelected) {
            item.style.transform = 'scale(1)';
            item.style.background = 'rgba(255,255,255,0.03)';
        }
    });
    
    return item;
}

// ==================== TOGGLE KEYCHAIN ====================

function toggleKeychain(keychainId) {
    const index = selectedKeychains.indexOf(keychainId);
    
    if (index > -1) {
        selectedKeychains.splice(index, 1);
    } else {
        if (selectedKeychains.length >= maxSelection) {
            return;
        }
        selectedKeychains.push(keychainId);
    }
    
    updateSelectionUI();
    updateCounter();
}

// ==================== UPDATE UI ====================

function updateSelectionUI() {
    const items = document.querySelectorAll('#keychain-selector-grid > div');
    items.forEach(item => {
        const id = item.dataset.keychainId;
        const isSelected = selectedKeychains.includes(id);
        
        item.style.background = isSelected ? 'rgba(74, 124, 89, 0.25)' : 'rgba(255,255,255,0.03)';
        item.style.border = `2px solid ${isSelected ? '#4a7c59' : 'rgba(255,255,255,0.05)'}`;
        item.style.boxShadow = isSelected ? '0 0 30px rgba(74, 124, 89, 0.2)' : 'none';
        
        const icon = item.querySelector('img:not([src*="aura"])');
        if (icon) {
            icon.style.filter = isSelected ? 'drop-shadow(0 0 20px rgba(74, 124, 89, 0.5))' : 'none';
        }
    });
}

function updateCounter() {
    const counter = document.getElementById('keychain-selector-counter');
    if (counter) {
        counter.textContent = getText('menu.punchcard.keychainSelected', { count: selectedKeychains.length });
    }
}

// ==================== CLOSE SELECTOR ====================

function closeSelector() {
    const overlay = document.getElementById('keychain-selector-overlay');
    if (overlay) {
        if (overlay._escHandler) {
            document.removeEventListener('keydown', overlay._escHandler);
        }
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        setTimeout(() => {
            overlay.remove();
        }, 200);
    }
    isOpen = false;
}

// ==================== STYLES ====================

function addStyles() {
    if (document.getElementById('keychain-selector-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'keychain-selector-styles';
    style.textContent = `
        @keyframes keychainPopupAppear {
            0% { transform: scale(0.6) rotate(-5deg); opacity: 0; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        @keyframes keychainFadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
        }
        
        #keychain-selector-overlay ::-webkit-scrollbar {
            width: 6px;
        }
        #keychain-selector-overlay ::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.05);
            border-radius: 3px;
        }
        #keychain-selector-overlay ::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.15);
            border-radius: 3px;
        }
        #keychain-selector-overlay ::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.25);
        }
    `;
    document.head.appendChild(style);
}

// ==================== EXPORTS ====================

export const KeychainSelector = {
    show: showKeychainSelector,
    setLocaleManager: (lm) => { localeManager = lm; },
    getSelected: () => selectedKeychains,
    getMaxSelection: () => maxSelection,
    setMaxSelection: (n) => { maxSelection = n; },
    isOpen: () => isOpen,
    close: closeSelector
};