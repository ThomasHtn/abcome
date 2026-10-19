import { DOCUMENT } from '@angular/common';
import { EnvironmentProviders, inject, isDevMode, provideAppInitializer } from '@angular/core';

import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { APP_LOCALES, SOURCE_LOCALE } from './i18n.constants';
import { pickLocale } from './i18n.utils';
import { TranslationLoader } from './translation-loader';

/**
 * Transloco, set once at startup to the browser's language (French when the app does not speak it);
 * the first screen waits for its translations, so no key ever shows.
 */
export function provideI18n(): EnvironmentProviders[] {
  return [
    ...provideTransloco({
      config: {
        availableLangs: [...APP_LOCALES],
        defaultLang: SOURCE_LOCALE,
        fallbackLang: SOURCE_LOCALE,
        reRenderOnLangChange: false,
        prodMode: !isDevMode(),
        // Some halves of a split sentence are empty in one language ("Côme's words" has no prefix).
        missingHandler: { allowEmpty: true },
      },
      loader: TranslationLoader,
    }),
    provideAppInitializer(() => {
      const document = inject(DOCUMENT);
      const transloco = inject(TranslocoService);
      const locale = pickLocale(document.defaultView?.navigator.languages ?? []);
      document.documentElement.lang = locale;
      transloco.setActiveLang(locale);
      return firstValueFrom(transloco.load(locale));
    }),
  ];
}
