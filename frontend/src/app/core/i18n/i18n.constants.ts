import { AppLocale } from './i18n.model';

/**
 * Language of the texts written in the code, and the one used when the browser offers no other.
 */
export const SOURCE_LOCALE: AppLocale = 'fr';

/**
 * Every language the app speaks, the source first.
 */
export const APP_LOCALES: readonly AppLocale[] = [SOURCE_LOCALE, 'en'];
