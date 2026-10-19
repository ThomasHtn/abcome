import { Pipe, PipeTransform } from '@angular/core';

import { quote } from '@core/text/text.utils';

/**
 * Quotes a word in a template with the marks of the app's language (« lapin », “bunny”): `{{ label | quote }}`.
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
