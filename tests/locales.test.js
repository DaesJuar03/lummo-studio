import { describe, it, expect } from 'vitest';
import { getTranslations, getAvailableLocales, registerLocale, esLocale, enLocale } from '../src/locales/index.js';

describe('i18n Locales Engine', () => {
  it('debería retornar traducciones en español por defecto', () => {
    const t = getTranslations('es');
    expect(t).toBeDefined();
    expect(t.home).toBeDefined();
    expect(t.projects).toBeDefined();
    expect(t.databases).toBeDefined();
  });

  it('debería retornar traducciones en inglés correctamente', () => {
    const t = getTranslations('en');
    expect(t).toBeDefined();
    expect(t.home).toBe('Home');
    expect(t.projects).toBe('Projects');
    expect(t.databases).toBe('Databases');
  });

  it('debería listar los idiomas disponibles incorporados', () => {
    const locales = getAvailableLocales();
    expect(locales.length).toBeGreaterThanOrEqual(2);
    expect(locales.some(l => l.code === 'es')).toBe(true);
    expect(locales.some(l => l.code === 'en')).toBe(true);
  });

  it('debería permitir registrar un nuevo idioma de contribuidor dinámicamente', () => {
    const frLocale = {
      meta: { code: 'fr', name: 'Français', badge: 'FR' },
      translations: { home: 'Accueil', projects: 'Projets' }
    };
    registerLocale(frLocale);
    
    const t = getTranslations('fr');
    expect(t.home).toBe('Accueil');
    expect(t.projects).toBe('Projets');
    // Mantiene fallback en español para claves faltantes
    expect(t.databases).toBe(esLocale.translations.databases);
  });
});
