/* ========================================================= */
/* ======================== CONFIG ========================= */
/* ========================================================= */
// Configuration page controller. Handles volume controls,
// language selection, gameplay toggles, and settings persistence.

import { SaveManager } from "../managers/SaveManager.js";
import { AudioManager } from "../managers/AudioManager.js";
import { LocaleManager } from "../managers/LocaleManager.js";

// ==============================================================
// ====================== GLOBAL STATE ==========================
// ==============================================================

const saveManager = new SaveManager();
const audioManager = new AudioManager();
let localeManager = null;

let touchButtonsEnabled = true;
let fallDamageEnabled = true;

// ==============================================================
// ====================== MODAL DIALOG ==========================
// ==============================================================

function showModal(message, onOk = null, onCancel = null) {
    const modal = document.getElementById("modal-dialog");
    const modalText = document.getElementById("modal-text");
    const okBtn = document.getElementById("modal-ok");
    
    if (!modal || !modalText) {
        console.warn("Modal not found, using fallback");
        if (onOk) onOk();
        return;
    }
    
    modalText.innerHTML = message.replace(/\n/g, '<br><br>');
    modal.style.display = "flex";
    
    // Setup OK button
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    
    newOkBtn.addEventListener("click", () => {
        modal.style.display = "none";
        if (onOk) onOk();
    });
    
    // Close when clicking outside
    const closeHandler = (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
            modal.removeEventListener('click', closeHandler);
            if (onCancel) onCancel();
        }
    };
    modal.addEventListener('click', closeHandler);
}

// ==============================================================
// ====================== VOLUME UTILITIES ======================
// ==============================================================

function updateSliderVisual(slider) {
    const percent = slider.value;
    slider.style.setProperty('--value', percent + '%');
}

// ==============================================================
// ====================== VOLUME CONTROLS =======================
// ==============================================================

function initVolumeControls() {
    const musicSlider = document.getElementById('music-volume');
    const sfxSlider = document.getElementById('sfx-volume');
    const musicPercent = document.getElementById('music-percent');
    const sfxPercent = document.getElementById('sfx-percent');
    
    const savedMusicVol = saveManager.getMusicVolume();
    const savedSfxVol = saveManager.getSFXVolume();
    
    musicSlider.value = savedMusicVol;
    sfxSlider.value = savedSfxVol;
    musicPercent.textContent = savedMusicVol + '%';
    sfxPercent.textContent = savedSfxVol + '%';
    updateSliderVisual(musicSlider);
    updateSliderVisual(sfxSlider);
    
    const linearMusic = savedMusicVol / 100;
    const linearSfx = savedSfxVol / 100;
    
    audioManager.setMusicVolume(linearMusic);
    audioManager.setSFXVolume(linearSfx);
    audioManager.setSFXEnabled(saveManager.isSFXEnabled());
    
    audioManager.updateAllVolumes();
    
    musicSlider.addEventListener('input', (e) => {
        const percent = parseInt(e.target.value);
        musicPercent.textContent = percent + '%';
        updateSliderVisual(musicSlider);
        
        const linear = percent / 100;
        audioManager.setMusicVolume(linear);
        saveManager.setMusicVolume(percent);
        audioManager.updateAllVolumes();
    });
    
    sfxSlider.addEventListener('input', (e) => {
        const percent = parseInt(e.target.value);
        sfxPercent.textContent = percent + '%';
        updateSliderVisual(sfxSlider);
        
        const linear = percent / 100;
        audioManager.setSFXVolume(linear);
        saveManager.setSFXVolume(percent);
        audioManager.updateAllVolumes();
    });
}

// ==============================================================
// ====================== LANGUAGE CONTROLS =====================
// ==============================================================

function initLanguageControls() {
    const enBtn = document.getElementById('lang-en');
    const esBtn = document.getElementById('lang-es');
    const mxBtn = document.getElementById('lang-mx');
    
    const currentLang = localeManager ? localeManager.currentLocale : saveManager.getLanguage();
    
    // Set active button
    if (currentLang === 'es') {
        esBtn.classList.add('active');
    } else if (currentLang === 'mx') {
        mxBtn.classList.add('active');
    } else {
        enBtn.classList.add('active');
    }
    
    enBtn.addEventListener('click', async () => {
        if (localeManager && localeManager.currentLocale === 'en') return;
        if (localeManager) {
            await localeManager.setLocale('en');
            applyLanguage();
        } else {
            saveManager.setLanguage('en');
            applyLanguage();
        }
        updateActiveLanguageButton('en');
    });
    
    esBtn.addEventListener('click', async () => {
        if (localeManager && localeManager.currentLocale === 'es') return;
        if (localeManager) {
            await localeManager.setLocale('es');
            applyLanguage();
        } else {
            saveManager.setLanguage('es');
            applyLanguage();
        }
        updateActiveLanguageButton('es');
    });
    
    if (mxBtn) {
        mxBtn.addEventListener('click', async () => {
            if (localeManager && localeManager.currentLocale === 'mx') return;
            if (localeManager) {
                await localeManager.setLocale('mx');
                applyLanguage();
            } else {
                saveManager.setLanguage('mx');
                applyLanguage();
            }
            updateActiveLanguageButton('mx');
        });
    }
}

function updateActiveLanguageButton(activeLang) {
    const enBtn = document.getElementById('lang-en');
    const esBtn = document.getElementById('lang-es');
    const mxBtn = document.getElementById('lang-mx');
    
    if (enBtn) enBtn.classList.remove('active');
    if (esBtn) esBtn.classList.remove('active');
    if (mxBtn) mxBtn.classList.remove('active');
    
    if (activeLang === 'es' && esBtn) esBtn.classList.add('active');
    else if (activeLang === 'mx' && mxBtn) mxBtn.classList.add('active');
    else if (enBtn) enBtn.classList.add('active');
}

// Apply language to all UI text elements
function applyLanguage() {
    if (!localeManager) return;
    
    // Section titles
    const sectionTitles = document.querySelectorAll('.section-title');
    if (sectionTitles[0]) sectionTitles[0].textContent = localeManager.get('config.volume');
    if (sectionTitles[1]) sectionTitles[1].textContent = localeManager.get('config.language');
    if (sectionTitles[2]) sectionTitles[2].textContent = localeManager.get('config.gameplay');
    if (sectionTitles[3]) sectionTitles[3].textContent = localeManager.get('config.other');
    
    // Slider labels
    const sliderLabels = document.querySelectorAll('.slider-label');
    if (sliderLabels[0]) sliderLabels[0].textContent = localeManager.get('config.music');
    if (sliderLabels[1]) sliderLabels[1].textContent = localeManager.get('config.sfx');
    
    // Toggle labels
    const toggleLabels = document.querySelectorAll('.toggle-label');
    if (toggleLabels[0]) toggleLabels[0].textContent = localeManager.get('config.showTouch');
    if (toggleLabels[1]) toggleLabels[1].textContent = localeManager.get('config.fallDamage');
    
    // Config buttons
    const configButtons = document.querySelectorAll('.config-button');
    if (configButtons[0]) configButtons[0].textContent = localeManager.get('config.replayTutorial');
    if (configButtons[1]) configButtons[1].textContent = localeManager.get('config.manual');
    
    // Language buttons text
    const enBtn = document.getElementById('lang-en');
    const esBtn = document.getElementById('lang-es');
    const mxBtn = document.getElementById('lang-mx');
    if (enBtn) enBtn.textContent = localeManager.get('config.langEn');
    if (esBtn) esBtn.textContent = localeManager.get('config.langEs');
    if (mxBtn) mxBtn.textContent = localeManager.get('config.langMx');
    
    // Save button
    const saveBtn = document.getElementById('save-config');
    if (saveBtn) saveBtn.textContent = localeManager.get('config.save');
}

// ==============================================================
// ====================== TOGGLE CONTROLS =======================
// ==============================================================

function initToggleControls() {
    const toggleTouch = document.getElementById('toggle-touch');
    const toggleFall = document.getElementById('toggle-falldamage');
    
    touchButtonsEnabled = saveManager.getTouchEnabled();
    fallDamageEnabled = saveManager.isFallDamageEnabled();
    
    if (touchButtonsEnabled) toggleTouch.classList.add('active');
    if (fallDamageEnabled) toggleFall.classList.add('active');
    
    // Touch buttons toggle
    toggleTouch.addEventListener('click', () => {
        touchButtonsEnabled = !touchButtonsEnabled;
        if (touchButtonsEnabled) {
            toggleTouch.classList.add('active');
        } else {
            toggleTouch.classList.remove('active');
        }
        saveManager.setTouchEnabled(touchButtonsEnabled);
    });
    
    // Fall damage toggle with modal warning
    toggleFall.addEventListener('click', () => {
        const newState = !fallDamageEnabled;
        
        if (newState === true) {
            const warningMessage = localeManager 
                ? localeManager.get('config.fallDamageWarning')
                : "WARNING: Enabling fall damage allows you to drop from any height.\n\nThis can cause SOFTLOCK (getting stuck in areas you can't climb back from).\n\nAre you sure you want to enable fall damage?";
            
            showModal(warningMessage, () => {
                // User confirmed
                fallDamageEnabled = newState;
                if (fallDamageEnabled) {
                    toggleFall.classList.add('active');
                } else {
                    toggleFall.classList.remove('active');
                }
                saveManager.setFallDamageEnabled(fallDamageEnabled);
            });
        } else {
            // Turning OFF, no warning needed
            fallDamageEnabled = newState;
            toggleFall.classList.remove('active');
            saveManager.setFallDamageEnabled(fallDamageEnabled);
        }
    });
}

// ==============================================================
// ====================== OTHER BUTTONS =========================
// ==============================================================

function initOtherButtons() {
    const replayBtn = document.getElementById('replay-tutorial');
    const manualBtn = document.getElementById('open-manual');
    
    replayBtn.addEventListener('click', () => {
        saveManager.setTutorialCompleted(false);
        
        const config = {
            mode: "tutorial",
            seed: null,
            level: 1,
            character: "student",
            size: 5,
            hazards: 1,
            obstacles: 1,
            goals: 1,
            zone: "backyard"
        };
        
        saveManager.saveConfig(config);
        window.location.href = '../../pages/game.html';
    });
    
    manualBtn.addEventListener('click', () => {
        const lang = localeManager ? localeManager.currentLocale : saveManager.getLanguage();
        const manualFile = lang === 'es' 
            ? '../../NuclearStic Manual(es).pdf' 
            : lang === 'mx'
                ? '../../NuclearStic Manual(es).pdf'
                : '../../NuclearStic Manual(en).pdf';
        window.open(manualFile, '_blank');
    });
}

// ==============================================================
// ====================== IMPORT/EXPORT =========================
// ==============================================================

function initImportExport() {
    const exportBtn = document.getElementById('export-config');
    const importBtn = document.getElementById('import-config');
    
    exportBtn.addEventListener('click', () => {
        const allData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            allData[key] = localStorage.getItem(key);
        }
        const dataStr = JSON.stringify(allData, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nuclearstic_save_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
    
    importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    for (const [key, value] of Object.entries(data)) {
                        localStorage.setItem(key, value);
                    }
                    const successMsg = localeManager 
                        ? localeManager.get('config.importSuccess')
                        : 'Configuration imported successfully! Please restart the game.';
                    showModal(successMsg, () => {
                        window.location.reload();
                    });
                } catch (err) {
                    const errorMsg = localeManager 
                        ? localeManager.get('config.importError')
                        : 'Invalid backup file';
                    showModal(errorMsg);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });
}

// ==============================================================
// ====================== NAVIGATION ============================
// ==============================================================

function initCloseButton() {
    const closeBtn = document.getElementById('close-config');
    closeBtn.addEventListener('click', () => {
        window.location.href = '../../index.html';
    });
}

function initSaveButton() {
    const saveImg = document.getElementById('save-config');
    saveImg.addEventListener('click', () => {
        audioManager.playSFX('grade.mp3', false, 0.5);
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 200);
    });
}

// ==============================================================
// ====================== INITIALIZATION ========================
// ==============================================================

async function init() {
    // Initialize LocaleManager
    localeManager = new LocaleManager();
    await localeManager.init();
    
    initVolumeControls();
    initLanguageControls();
    initToggleControls();
    initOtherButtons();
    initCloseButton();
    initSaveButton();
    initImportExport();
    applyLanguage();
}

document.addEventListener('DOMContentLoaded', init);