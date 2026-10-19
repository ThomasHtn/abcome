import { activeLocale, isSingular, pickLocale } from './i18n.utils';

describe('i18n utils', () => {
  afterEach(() => {
    document.documentElement.lang = '';
  });

  it('picks the first browser language the app speaks', () => {
    expect(pickLocale(['de-DE', 'en-GB', 'fr-FR'])).toBe('en');
    expect(pickLocale(['fr-CA', 'en-US'])).toBe('fr');
  });

  it('falls back to French when the browser offers no language the app speaks', () => {
    expect(pickLocale(['de-DE', 'es'])).toBe('fr');
    expect(pickLocale([])).toBe('fr');
  });

  it('reads the active language from the html element', () => {
    expect(activeLocale()).toBe('fr');
    document.documentElement.lang = 'en';
    expect(activeLocale()).toBe('en');
  });

  it('follows the plural rules of the active language', () => {
    expect(isSingular(0)).toBe(true);
    expect(isSingular(1.5)).toBe(true);
    document.documentElement.lang = 'en';
    expect(isSingular(0)).toBe(false);
    expect(isSingular(1)).toBe(true);
  });
});
