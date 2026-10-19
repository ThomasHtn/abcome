import { Service } from '@angular/core';

import { Translation, TranslocoLoader } from '@jsverse/transloco';

/**
 * Loads `src/i18n/<lang>.json` for Transloco, bundled with the build so texts and code always ship
 * together, each file as its own lazy chunk; an unknown language gets the French file.
 */
@Service()
export class TranslationLoader implements TranslocoLoader {
  /**
   * Translations of one language.
   */
  public async getTranslation(lang: string): Promise<Translation> {
    const file =
      lang === 'en' ? await import('../../../i18n/en.json') : await import('../../../i18n/fr.json');
    return file.default;
  }
}
