import { Pipe, PipeTransform } from '@angular/core';

import { quote } from '@core/text/text.utils';

/**
 * Quotes a word in a template the French way, guillemets held by no-break spaces: `{{ label | quote }}`.
 */
@Pipe({ name: 'quote' })
export class QuotePipe implements PipeTransform {
  /**
   * Quoted text; an absent value quotes nothing rather than printing "undefined".
   */
  public transform(value: string | null | undefined): string {
    return quote(value ?? '');
  }
}
