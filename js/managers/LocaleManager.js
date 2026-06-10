// ==============================================================
// ====================== LOCALE MANAGER ========================
// ==============================================================
// Handles loading and applying localization strings.
// Supports multiple languages via JSON files.
// Auto-detects browser language on first load.

import { SaveManager } from "./SaveManager.js";
import { PathResolver } from "../utils/PathResolver.js";

export class LocaleManager {
    
    constructor() {
        this.saveManager = new SaveManager();
        this.currentLocale = null;
        this.strings = null;
        this.listeners = [];
        this.supportedLocales = ['en', 'es', 'mx'];
        this.defaultLocale = 'en';
    }
    
    // Detect browser language and match with supported locales
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0].toLowerCase();
        
        // Check if browser language is supported
        if (this.supportedLocales.includes(langCode)) {
            return langCode;
        }
        
        // Fallback to default
        return this.defaultLocale;
    }
    
    // Get saved language or auto-detect
    getInitialLocale() {
        // Check if user has manually set a language before
        const savedLang = this.saveManager.getLanguage();
        
        // If user has never set a language (default 'en'), auto-detect
        if (savedLang === 'en') {
            const detectedLang = this.detectBrowserLanguage();
            // Save the detected language for future sessions
            if (detectedLang !== 'en') {
                this.saveManager.setLanguage(detectedLang);
            }
            return detectedLang;
        }
        
        return savedLang;
    }
    
    async init() {
        this.currentLocale = this.getInitialLocale();
        await this.loadLocale(this.currentLocale);
    }
    
    async loadLocale(locale) {
        try {
            const path = PathResolver.resolveAsset('locales', `${locale}.json`);
            console.log(`[LocaleManager] Loading locale from: ${path}`);
            const response = await fetch(path);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            this.strings = await response.json();
            this.currentLocale = locale;
            this.notifyListeners();
        } catch (e) {
            console.error(`Failed to load locale: ${locale}`, e);
            // Fallback to English
            if (locale !== 'en') {
                await this.loadLocale('en');
            }
        }
    }
    
    get(key) {
        if (!this.strings) return key;
        
        const keys = key.split('.');
        let value = this.strings;
        
        for (const k of keys) {
            if (value[k] === undefined) return key;
            value = value[k];
        }
        
        return value;
    }
    
    onChange(callback) {
        this.listeners.push(callback);
    }
    
    notifyListeners() {
        for (const listener of this.listeners) {
            listener(this.currentLocale, this.strings);
        }
    }
    
    async setLocale(locale) {
        if (locale === this.currentLocale) return;
        if (!this.supportedLocales.includes(locale)) return;
        
        await this.loadLocale(locale);
        this.saveManager.setLanguage(locale);
    }
}