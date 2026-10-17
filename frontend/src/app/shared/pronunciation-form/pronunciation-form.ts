import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { SPOKEN_MAX_LENGTH } from '@core/words/word.constants';
import { DateField } from '@shared/date-field/date-field';
import { StatusPicker } from '@shared/status-picker/status-picker';
import { TextField } from '@shared/text-field/text-field';

import { PronunciationDraft } from './pronunciation-form.model';
import { isDraftReady } from './pronunciation-form.utils';

/**
 * The three fields of a stage: what Côme said, the status tiles and the day; the screen owns the
 * draft and the save button. Usage: `<app-pronunciation-form [(draft)]="draft" />`.
 */
@Component({
  selector: 'app-pronunciation-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextField, StatusPicker, DateField],
  templateUrl: './pronunciation-form.html',
})
export class PronunciationForm {
  /**
   * Stage being typed, two-way bound.
   */
  public readonly draft = model.required<PronunciationDraft>();

  /**
   * Label of the spoken field ("Comment Côme le dit", "Sur ce son, Côme dit").
   */
  public readonly spokenLabel = input('Comment Côme le dit');

  /**
   * Example shown in the empty spoken field ("ex. apin", "avant : apin").
   */
  public readonly spokenPlaceholder = input('ex. apin');

  /**
   * Label of the day ("Dit pour la première fois le", "Entendu le").
   */
  public readonly dateLabel = input('Dit pour la première fois le');

  /**
   * Help line under the day.
   */
  public readonly dateHint = input<string | null>(null);

  /**
   * Whether the draft can be saved (spoken form written, valid day); screens may also call `isDraftReady`.
   */
  public readonly valid = computed(() => isDraftReady(this.draft()));

  /**
   * Longest spoken form the API accepts.
   */
  protected readonly spokenMaxLength = SPOKEN_MAX_LENGTH;

  /**
   * Replaces some fields of the draft, keeping the others.
   */
  protected update(change: Partial<PronunciationDraft>): void {
    this.draft.update((draft) => ({ ...draft, ...change }));
  }
}
