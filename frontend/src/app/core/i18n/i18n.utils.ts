import { APP_LOCALES, SOURCE_LOCALE } from './i18n.constants';
import { AppLocale } from './i18n.model';

/**
 * First language of the browser that the app speaks ("en-GB" gives English), else French.
 */
export function pickLocale(languages: readonly string[]): AppLocale {
  for (const language of languages) {
    const base = language.split('-')[0].toLowerCase();
    const match = APP_LOCALES.find((locale) => locale === base);
    if (match) {
      return match;
    }
  }
  return SOURCE_LOCALE;
}

/**
 * Language the app started in, read from `<html lang>` where `provideI18n()` wrote it.
 */
export function activeLocale(): AppLocale {
  return pickLocale([document.documentElement.lang]);
}

/**
 * Whether `count` takes the singular in the active language: 0 and 1 in French, only 1 in English.
 */
export function isSingular(count: number): boolean {
  return new Intl.PluralRules(activeLocale()).select(count) === 'one';
}
