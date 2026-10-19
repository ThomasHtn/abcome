import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';

import { AuthSession } from '@core/auth/auth-session';
import { todayIso } from '@core/date/date.utils';
import { SPOKEN_MAX_LENGTHS } from '@core/words/word.constants';
import { WordKind } from '@core/words/word.model';
import { DateField } from '@shared/date-field/date-field';
import { StatusPicker } from '@shared/status-picker/status-picker';
import { TextField } from '@shared/text-field/text-field';

import { PronunciationDraft } from './pronunciation-form.model';
import { isDraftReady } from './pronunciation-form.utils';

/**
 * The three fields of a stage: what the child said, the status tiles and the day; the screen owns the
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
   * Label of the spoken field ("Sur ce son, [child] dit"); "Comment [child] le dit" when not given.
   */
  public readonly spokenLabel = input<string>();

  /**
   * Example shown in the empty spoken field ("ex. apin", "avant : apin").
   */
  public readonly spokenPlaceholder = input('ex. apin');

  /**
   * Label of the day ("Dit pour la première fois le", "Entendu le").
   */
  public readonly dateLabel = input('Dit pour la première fois le');

  /**
   * Word or sentence, whose spoken forms run longer.
   */
  public readonly kind = input<WordKind>('word');

  /**
   * Whether the draft can be saved (spoken form written, valid day); screens may also call `isDraftReady`.
   */
  public readonly valid = computed(() => isDraftReady(this.draft(), todayIso(), this.kind()));

  /**
   * Longest spoken form the API accepts for the kind.
   */
  protected readonly spokenMaxLength = computed(() => SPOKEN_MAX_LENGTHS[this.kind()]);

  /**
   * First name of the child, which the default spoken label names.
   */
  private readonly childName = inject(AuthSession).childName;

  /**
   * Label shown on the spoken field.
   */
  protected readonly shownSpokenLabel = computed(
    () => this.spokenLabel() ?? `Comment ${this.childName()} le dit`,
  );

  /**
   * Replaces some fields of the draft, keeping the others.
   */
  protected update(change: Partial<PronunciationDraft>): void {
    this.draft.update((draft) => ({ ...draft, ...change }));
  }
}
