/* ========================================================= */
/* ======================== CONFIG ========================= */
/* ========================================================= */
// Configuration page controller. Handles volume controls,
// language selection, gameplay toggles, and settings persistence.

import { SaveManager } from "../managers/SaveManager.js";
import { AudioManager } from "../managers/AudioManager.js";
import { LocaleManager } from "../managers/LocaleManager.js";
import { PathResolver } from "../utils/PathResolver.js";

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

// Display a modal dialog with a message and optional callback
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

// Update the visual gradient of a volume slider
function updateSliderVisual(slider) {
    const percent = slider.value;
    slider.style.setProperty('--value', percent + '%');
}

// ==============================================================
// ====================== VOLUME CONTROLS =======================
// ==============================================================

// Initialize volume sliders and their event handlers
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

// Initialize language selection buttons
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

// Update the active state of language buttons
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

// Initialize toggle switches for gameplay options
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
// ====================== SECRET CODES ==========================
// ==============================================================

let secretClickCount = 0;
let secretClickTimer = null;

// Initialize the secret code system on the options title
function initSecretCodeSystem() {
    const configTitle = document.querySelector('.config-title');
    if (!configTitle) return;
    
    // Remove pointer cursor (keep default for secrecy)
    configTitle.style.cursor = 'default';
    
    // Add click counter (5 clicks within 3 seconds)
    configTitle.addEventListener('click', () => {
        secretClickCount++;
        
        // Reset timer
        if (secretClickTimer) clearTimeout(secretClickTimer);
        secretClickTimer = setTimeout(() => {
            secretClickCount = 0;
        }, 3000);
        
        // Show secret code modal after 5 clicks
        if (secretClickCount >= 5) {
            secretClickCount = 0;
            showSecretCodeModal();
        }
    });
}

// Display the secret code input modal
function showSecretCodeModal() {
    const modal = document.getElementById("secret-code-modal");
    const input = document.getElementById("secret-code-input");
    const message = document.getElementById("secret-code-message");
    const submitBtn = document.getElementById("secret-code-submit");
    const cancelBtn = document.getElementById("secret-code-cancel");
    
    if (!modal) return;
    
    input.value = "";
    message.textContent = "";
    modal.style.display = "flex";
    
    const newSubmit = submitBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmit, submitBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    
    newSubmit.addEventListener("click", () => {
        const code = input.value.trim().toLowerCase();
        processSecretCode(code);
        modal.style.display = "none";
    });
    
    newCancel.addEventListener("click", () => {
        modal.style.display = "none";
    });
    
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            const code = input.value.trim().toLowerCase();
            processSecretCode(code);
            modal.style.display = "none";
        }
    };
}

// Process the entered secret code
function processSecretCode(code) {
    if (!code) return;
    
    switch(code) {
        case 'back2school':
            if (!saveManager.isSecretCodeActivated('back2school')) {
                saveManager.activateSecretCode('back2school');
                addBackyardToZoneSelect();
                showModal("Backyard zone unlocked!");
            } else {
                showModal("Code already activated!");
            }
            break;
            
        case 'masiosare':
            if (localeManager) {
                localeManager.setLocale('mx');
                applyLanguage();
                updateActiveLanguageButton('mx');
                saveManager.setLanguage('mx');
                showModal("Language changed to Mexican!");
            } else {
                showModal("Could not change language");
            }
            break;
            
        case 'debugthis':
            const config = {
                mode: "test",
                seed: null,
                level: 1,
                character: "chef",
                size: 24,
                hazards: 1,
                obstacles: 1,
                goals: 1,
                zone: "backyard"
            };
            saveManager.saveConfig(config);
            PathResolver.goToGame();
            break;
            
        default:
            showModal("Invalid code!");
    }
}

// Add Backyard to the zone select dropdown (unlocked by secret code)
function addBackyardToZoneSelect() {
    const zoneSelect = document.getElementById("custom-zone-select");
    if (!zoneSelect) return;
    
    let hasBackyard = false;
    for (let i = 0; i < zoneSelect.options.length; i++) {
        if (zoneSelect.options[i].value === 'backyard') {
            hasBackyard = true;
            break;
        }
    }
    
    if (!hasBackyard) {
        const option = document.createElement('option');
        option.value = 'backyard';
        option.textContent = localeManager ? localeManager.get('menu.punchcard.backyard') : 'Backyard';
        zoneSelect.appendChild(option);
        
        if (localeManager) {
            updateSelectOptions();
        }
    }
}

// ==============================================================
// ====================== OTHER BUTTONS =========================
// ==============================================================

// Initialize other action buttons (tutorial replay, manual)
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
        PathResolver.goToGame();
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

// Initialize import/export functionality
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
        
        // Detect if running in Cordova
        if (window.cordova) {
            // Android/Cordova: use cordova-plugin-file
            saveFileInCordova(dataStr);
        } else {
            // PC / Browser: normal download
            const blob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nuclearstic_save_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
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

// Cordova file save function for Android
function saveFileInCordova(dataStr) {
    // Request permission for storage (Android 11+)
    if (window.cordova && cordova.platformId === 'android') {
        // Use cordova-plugin-file
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, (fs) => {
            const fileName = `nuclearstic_save_${Date.now()}.json`;
            fs.root.getFile(fileName, { create: true, exclusive: false }, (fileEntry) => {
                fileEntry.createWriter((writer) => {
                    writer.onwriteend = () => {
                        // Show success and the file path
                        const successMsg = localeManager 
                            ? localeManager.get('config.exportSuccess')
                            : `File saved: ${fileName}`;
                        showModal(successMsg);
                    };
                    writer.onerror = (err) => {
                        console.error('Write error:', err);
                        fallbackAndroidSave(dataStr, fileName);
                    };
                    
                    // Write file
                    const blob = new Blob([dataStr], {type: 'application/json'});
                    writer.write(blob);
                }, (err) => {
                    console.error('File create error:', err);
                    fallbackAndroidSave(dataStr, fileName);
                });
            }, (err) => {
                console.error('File system error:', err);
                fallbackAndroidSave(dataStr, fileName);
            });
        }, (err) => {
            console.error('Request file system error:', err);
            fallbackAndroidSave(dataStr, fileName);
        });
    } else {
        fallbackAndroidSave(dataStr, `nuclearstic_save_${Date.now()}.json`);
    }
}

// Fallback: copy to clipboard and show instructions
function fallbackAndroidSave(dataStr, fileName) {
    // Copy JSON to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(dataStr).then(() => {
            const msg = localeManager 
                ? localeManager.get('config.exportClipboard')
                : 'Configuration copied to clipboard. You can paste it into a file.';
            showModal(msg);
        }).catch(() => {
            showManualSaveDialog(dataStr);
        });
    } else {
        showManualSaveDialog(dataStr);
    }
}

// Manual save dialog (shows textarea with JSON)
function showManualSaveDialog(dataStr) {
    const modal = document.getElementById("modal-dialog");
    const modalText = document.getElementById("modal-text");
    const okBtn = document.getElementById("modal-ok");
    
    if (!modal || !modalText) return;
    
    const msg = localeManager 
        ? localeManager.get('config.exportManual')
        : 'Copy this JSON to save your configuration:';
    
    modalText.innerHTML = `
        <div style="margin-bottom: 2vmin;">${msg}</div>
        <textarea id="manual-export-text" style="width: 90%; height: 30vmin; font-family: monospace; font-size: 2vmin; padding: 1vmin;">${dataStr}</textarea>
        <button id="manual-copy-btn" style="margin-top: 2vmin; padding: 1vmin 2vmin; font-family: 'Shampoos'; background: #4a7c59; color: white; border: none; border-radius: 8px; cursor: pointer;">Copy to Clipboard</button>
    `;
    modal.style.display = "flex";
    
    const copyBtn = document.getElementById("manual-copy-btn");
    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            const textarea = document.getElementById("manual-export-text");
            textarea.select();
            document.execCommand('copy');
            const copiedMsg = localeManager 
                ? localeManager.get('config.copied')
                : 'Copied!';
            copyBtn.textContent = copiedMsg;
            setTimeout(() => {
                copyBtn.textContent = 'Copy to Clipboard';
            }, 2000);
        });
    }
    
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    newOkBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });
}

// ==============================================================
// ====================== NAVIGATION ============================
// ==============================================================

// Initialize close button to return to main menu
function initCloseButton() {
    const closeBtn = document.getElementById('close-config');
    closeBtn.addEventListener('click', () => {
        PathResolver.goToIndex();
    });
}

// Initialize save button to save settings and return to main menu
function initSaveButton() {
    const saveImg = document.getElementById('save-config');
    saveImg.addEventListener('click', () => {
        audioManager.playSFX('grade.mp3', false, 0.5);
        setTimeout(() => {
            PathResolver.goToIndex();
        }, 200);
    });
}

// ==============================================================
// ====================== INITIALIZATION ========================
// ==============================================================

// Main initialization function
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
    initSecretCodeSystem(); 
    applyLanguage();

    // Apply any activated codes on load
    if (saveManager.isSecretCodeActivated('back2school')) {
        addBackyardToZoneSelect();
    }
}

// Start everything when DOM is ready
document.addEventListener('DOMContentLoaded', init);