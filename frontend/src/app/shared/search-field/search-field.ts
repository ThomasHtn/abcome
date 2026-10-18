import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  viewChild,
} from '@angular/core';

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
   * `surface` white with a shadow on the cream page, `tint` lavender inside a white card,
   * `outline` white ringed in lavender where it replaces the home tabs.
   */
  public readonly tone = input<'surface' | 'tint' | 'outline'>('surface');

  /**
   * Focuses the field once rendered, for a field opened on demand; the native attribute only acts
   * on page load.
   */
  public readonly autofocus = input(false, { transform: booleanAttribute });

  /**
   * The input itself, focused by `autofocus`.
   */
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  /**
   * Focuses the field after the first render when asked.
   */
  constructor() {
    afterNextRender(() => {
      if (this.autofocus()) {
        this.input().nativeElement.focus();
      }
    });
  }

  /**
   * Updates the bound value on every keystroke.
   */
  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
