import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Unique id per field, linking the input to its hint and error.
 */
let nextFieldId = 0;

/**
 * Labelled text input or textarea of the forms ("Comment Côme le dit", "Ce qu'il voulait dire").
 * Usage: `<app-text-field label="Comment Côme le dit" placeholder="ex. apin" [(value)]="spoken" />`.
 */
@Component({
  selector: 'app-text-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './text-field.html',
  styleUrl: './text-field.scss',
})
export class TextField {
  /**
   * Typed text, two-way bound.
   */
  public readonly value = model('');

  /**
   * Visible label above the field.
   */
  public readonly label = input.required<string>();

  /**
   * Example shown while empty ("ex. apin").
   */
  public readonly placeholder = input('');

  /**
   * Help line under the field.
   */
  public readonly hint = input<string | null>(null);

  /**
   * Error line under the field, replacing the hint; marks the field invalid.
   */
  public readonly error = input<string | null>(null);

  /**
   * Adds "(facultatif)" after the label.
   */
  public readonly optional = input(false, { transform: booleanAttribute });

  /**
   * Several lines (a sentence) instead of one.
   */
  public readonly multiline = input(false, { transform: booleanAttribute });

  /**
   * Longest accepted text, the API's limit.
   */
  public readonly maxLength = input<number | null>(null);

  /**
   * `display` writes in Fredoka, for what Côme says; `plain` in Nunito, for the family's words.
   */
  public readonly tone = input<'display' | 'plain'>('display');

  /**
   * Browser autofill hint; `off` by default, nothing here is personal data to fill.
   */
  public readonly autocomplete = input('off');

  /**
   * Id of the input.
   */
  protected readonly id = `text-field-${nextFieldId++}`;

  /**
   * Updates the bound value on every keystroke.
   */
  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }
}
