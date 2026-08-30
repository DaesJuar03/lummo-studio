import esLocale from './es.json';
import enLocale from './en.json';

// Registered Custom Locales Storage (Allows contributors to register extra language files)
const customLocales = new Map();

/**
 * Register a new contributor locale dynamically
 * @param {Object} localeData - Struct containing { meta: { code, name, description, badge }, translations: {} }
 */
export function registerLocale(localeData) {
  if (localeData?.meta?.code && localeData?.translations) {
    customLocales.set(localeData.meta.code, localeData);
  }
}

/**
 * Get all available locales (Built-in + Contributor registered)
 */
export function getAvailableLocales() {
  const customList = Array.from(customLocales.values()).map(l => l.meta);
  return [esLocale.meta, enLocale.meta, ...customList];
}

// Built-in Locale Registry Array for backward compatibility
export const availableLocales = [
  esLocale.meta,
  enLocale.meta
];

// Built-in Locale Registry Dictionary
const localeDictionary = {
  [esLocale.meta.code]: esLocale.translations,
  [enLocale.meta.code]: enLocale.translations
};

/**
 * Helper function to get translations dictionary for a language code
 * @param {string} [langCode] - Language code ('es', 'en', or custom)
 */
export function getTranslations(langCode) {
  const code = langCode || (typeof localStorage !== 'undefined' ? localStorage.getItem('lummo-language') : null) || 'es';
  if (customLocales.has(code)) {
    return { ...esLocale.translations, ...customLocales.get(code).translations };
  }
  const dict = localeDictionary[code] || localeDictionary.es || esLocale.translations;
  return { ...esLocale.translations, ...dict };
}

/**
 * Detect user's OS / browser language and verify if supported by Lummo Studio.
 * @returns {{ language: string, detectedLang: string, isSupported: boolean, isFirstTime: boolean }}
 */
export function detectSystemLanguage() {
  const savedLang = localStorage.getItem('lummo-language');
  if (savedLang) {
    return {
      language: savedLang,
      detectedLang: savedLang,
      isSupported: true,
      isFirstTime: false
    };
  }

  const rawLang = typeof navigator !== 'undefined'
    ? (navigator.language || (navigator.languages && navigator.languages[0]) || 'es')
    : 'es';

  const code = rawLang.split('-')[0].toLowerCase();
  const supportedCodes = availableLocales.map(l => l.code);
  const isSupported = supportedCodes.includes(code);

  return {
    language: isSupported ? code : 'en', // Default to English if unsupported
    detectedLang: code,
    isSupported,
    isFirstTime: true
  };
}

export { esLocale, enLocale };
