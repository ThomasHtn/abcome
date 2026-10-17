import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { todayIso } from '@core/date/date.utils';
import { Icon } from '@shared/icon/icon';

import { dateFieldError } from './date-field.utils';

/**
 * Unique id per field, linking the input to its hint.
 */
let nextDateFieldId = 0;

/**
 * Labelled date field on the native date picker, dashed salmon like the mockup. A cleared or future day
 * stays in `value` and shows its message under the field; the screen disables its save with
 * `dateFieldError(value)`. Usage: `<app-date-field label="Dit le" [(value)]="date" />`, `yyyy-MM-dd`.
 */
@Component({
  selector: 'app-date-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './date-field.html',
  styleUrl: './date-field.scss',
})
export class DateField {
  /**
   * Chosen day, `yyyy-MM-dd`, two-way bound; today in Paris by default.
   */
  public readonly value = model(todayIso());

  /**
   * Visible label above the field.
   */
  public readonly label = input.required<string>();

  /**
   * Help line under the field.
   */
  public readonly hint = input<string | null>(null);

  /**
   * Latest day allowed: today, since nothing is said in the future (the API refuses it too).
   */
  protected readonly max = todayIso();

  /**
   * Why the day cannot be saved, shown under the field; null when it can.
   */
  public readonly error = computed(() => dateFieldError(this.value(), this.max));

  /**
   * Whether the day cannot be saved, for a parent holding the field by reference.
   */
  public readonly invalid = computed(() => this.error() !== null);

  /**
   * Id of the input.
   */
  protected readonly id = `date-field-${nextDateFieldId++}`;

  /**
   * Takes what the picker holds, empty included: keeping an old day silently would save the wrong one.
   */
  protected onChange(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  /**
   * Ids describing the input: the error first, then the hint.
   */
  protected describedBy(): string | null {
    const ids = [this.error() ? `${this.id}-error` : null, this.hint() ? `${this.id}-hint` : null];
    return ids.filter((id) => id !== null).join(' ') || null;
  }
}
