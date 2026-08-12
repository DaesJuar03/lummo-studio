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
 * @param {string} langCode - Language code ('es', 'en', or custom)
 */
export function getTranslations(langCode = 'es') {
  if (customLocales.has(langCode)) {
    return { ...esLocale.translations, ...customLocales.get(langCode).translations };
  }
  return localeDictionary[langCode] || localeDictionary.es;
}

export { esLocale, enLocale };
