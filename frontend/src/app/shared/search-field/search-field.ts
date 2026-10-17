import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { Icon } from '@shared/icon/icon';

/**
 * Rounded search field with a magnifier; the label doubles as placeholder and accessible name.
 * Usage: `<app-search-field label="Chercher un mot" [(value)]="query" />`.
 */
@Component({
  selector: 'app-search-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './search-field.html',
  styleUrl: './search-field.scss',
})
export class SearchField {
  /**
   * Typed text, two-way bound.
   */
  public readonly value = model('');

  /**
   * What the field searches ("Chercher un mot"), shown as placeholder.
   */
  public readonly label = input.required<string>();

  /**
   * `surface` white with a shadow on the cream page, `tint` lavender inside a white card.
   */
  public readonly tone = input<'surface' | 'tint'>('surface');

  /**
   * Updates the bound value on every keystroke.
   */
  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
