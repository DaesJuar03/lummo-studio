import esLocale from './es.json';
import enLocale from './en.json';

// Locale Registry
export const availableLocales = [
  esLocale.meta,
  enLocale.meta
];

const localeDictionary = {
  [esLocale.meta.code]: esLocale.translations,
  [enLocale.meta.code]: enLocale.translations
};

// Helper function to get translations dictionary for a language code
export function getTranslations(langCode = 'es') {
  return localeDictionary[langCode] || localeDictionary.es;
}
