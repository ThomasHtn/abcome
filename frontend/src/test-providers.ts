import { EnvironmentProviders, importProvidersFrom, Provider, Service } from '@angular/core';

import {
  provideTranslocoMissingHandler,
  TranslocoMissingHandler,
  TranslocoTestingModule,
} from '@jsverse/transloco';

import fr from './i18n/fr.json';

/**
 * Fails the spec on a key absent from `fr.json`, instead of rendering the key.
 */
@Service()
export class FailingMissingHandler implements TranslocoMissingHandler {
  /**
   * Throws with the missing key.
   */
  public handle(key: string): never {
    throw new Error(`Missing translation: ${key}`);
  }
}

/**
 * Providers of every spec: Transloco in French, the source language, loaded before the first render,
 * so specs read the texts the family reads.
 */
export default [
  importProvidersFrom(
    TranslocoTestingModule.forRoot({
      langs: { fr },
      translocoConfig: {
        availableLangs: ['fr', 'en'],
        defaultLang: 'fr',
        missingHandler: { allowEmpty: true },
      },
      preloadLangs: true,
    }),
  ),
  provideTranslocoMissingHandler(FailingMissingHandler),
] satisfies (Provider | EnvironmentProviders)[];
