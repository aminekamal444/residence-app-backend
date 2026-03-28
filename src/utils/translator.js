const en = require('../locales/en.json');
const fr = require('../locales/fr.json');
const ar = require('../locales/ar.json');
const logger = require('./logger');

// Validate locale files
if (!en || !fr || !ar) {
  throw new Error('❌ Failed to load locale files!');
}

const translations = {
  en,
  fr,
  ar
};

class Translator {
  constructor(defaultLanguage = 'en') {
    this.defaultLanguage = defaultLanguage;
    this.supportedLanguages = ['en', 'fr', 'ar'];
  }

  // Get translated string
  t(key, language = this.defaultLanguage, variables = {}) {
    // Validate language
    if (!this.supportedLanguages.includes(language)) {
      logger.debug(`Language "${language}" not supported. Using default "${this.defaultLanguage}"`);
      language = this.defaultLanguage;
    }

    // Get translation by key path (e.g., "auth.login_success")
    const keys = key.split('.');
    let translation = translations[language];

    for (const k of keys) {
      if (translation && typeof translation === 'object') {
        translation = translation[k];
      } else {
        logger.warn(`Missing translation: ${key} for language: ${language}`);
        return key; // Return key if translation not found
      }
    }

    // Replace variables in translation
    let result = translation || key;
    
    if (typeof result === 'string') {
      Object.keys(variables).forEach(variable => {
        result = result.replace(`{${variable}}`, variables[variable]);
      });
    }

    return result;
  }

  // Get all translations for a language
  getLanguage(language) {
    if (!this.supportedLanguages.includes(language)) {
      return translations[this.defaultLanguage];
    }
    return translations[language];
  }

  // Check if language is supported
  isSupported(language) {
    return this.supportedLanguages.includes(language);
  }

  // Get supported languages (returns copy, not reference)
  getSupportedLanguages() {
    return [...this.supportedLanguages];  // Return copy to prevent modification
  }

  // Check if language uses RTL (Right-to-Left)
  isRTLLanguage(language) {
    return ['ar'].includes(language);
  }

  // Get text direction for language
  getLanguageDirection(language) {
    return this.isRTLLanguage(language) ? 'rtl' : 'ltr';
  }
}

module.exports = new Translator();