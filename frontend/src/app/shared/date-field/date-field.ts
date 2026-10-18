import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';

import { FIRST_NOTEBOOK_DAY } from '@core/date/date.constants';
import { todayIso } from '@core/date/date.utils';
import { Today } from '@core/date/today';
import { Icon } from '@shared/icon/icon';

import { dateDisplay, dateFieldError } from './date-field.utils';

/**
 * Unique id per field, linking the input to its error.
 */
let nextDateFieldId = 0;

/**
 * Labelled date field on the native date picker, a salmon box like the text fields: it reads the day
 * as people say it ("Aujourd'hui", "Hier", "mercredi 16 septembre") and a tap anywhere opens the
 * picker. A cleared or future day stays in `value` and shows its message under the field; the screen
 * disables its save with `dateFieldError(value)`. Usage: `<app-date-field label="Dit le" [(value)]="date" />`, `yyyy-MM-dd`.
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
   * Latest day allowed: today, since nothing is said in the future (the API refuses it too).
   */
  protected readonly max = inject(Today).iso;

  /**
   * Earliest day allowed, as the API: the picker never offers a mistyped year.
   */
  protected readonly min = FIRST_NOTEBOOK_DAY;

  /**
   * Why the day cannot be saved, shown under the field; null when it can.
   */
  public readonly error = computed(() => dateFieldError(this.value(), this.max()));

  /**
   * Whether the day cannot be saved, for a parent holding the field by reference.
   */
  public readonly invalid = computed(() => this.error() !== null);

  /**
   * The day as shown in the box.
   */
  protected readonly display = computed(() => dateDisplay(this.value(), this.max()));

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
   * Opens the system calendar from anywhere in the box; where the browser refuses, its own behaviour
   * stays (iOS opens its wheel on the tap anyway).
   */
  protected openPicker(event: Event): void {
    try {
      (event.target as HTMLInputElement).showPicker();
    } catch {
      // No `showPicker` (older browser) or no user gesture: nothing more to do.
    }
  }

  /**
   * Enter and Space open the calendar, like a button; other keys edit the day as usual.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPicker(event);
    }
  }

  /**
   * Id of the error line describing the input, `null` while the day is valid.
   */
  protected describedBy(): string | null {
    return this.error() ? `${this.id}-error` : null;
  }
}
