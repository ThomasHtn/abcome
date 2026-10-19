import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';

import { AuthSession } from '@core/auth/auth-session';
import { todayIso } from '@core/date/date.utils';
import { Celebration } from '@core/feedback/celebration';
import { ToastQueue } from '@core/feedback/toast-queue';
import { LABEL_MAX_LENGTHS } from '@core/words/word.constants';
import { WordsApi } from '@core/words/words-api';
import { BottomSheet } from '@shared/bottom-sheet/bottom-sheet';
import { Button } from '@shared/button/button';
import { PronunciationForm } from '@shared/pronunciation-form/pronunciation-form';
import { PronunciationDraft } from '@shared/pronunciation-form/pronunciation-form.model';
import {
  emptyDraft,
  isDraftReady,
  toPronunciationRequest,
} from '@shared/pronunciation-form/pronunciation-form.utils';
import { TextField } from '@shared/text-field/text-field';

/**
 * Sheet to note a new sentence: what the child meant, then how they said it; its page does the rest.
 * Shown while the page keeps it in its template.
 */
@Component({
  selector: 'app-sentence-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BottomSheet, Button, PronunciationForm, TextField],
  templateUrl: './sentence-sheet.html',
})
export class SentenceSheet {
  /**
   * Creates the sentence.
   */
  private readonly wordsApi = inject(WordsApi);

  /**
   * Says what was done once the sheet closes.
   */
  private readonly toasts = inject(ToastQueue);

  /**
   * Confetti for a new sentence ("Fête").
   */
  private readonly celebration = inject(Celebration);

  /**
   * First name of the child, given by the server with the session.
   */
  protected readonly childName = inject(AuthSession).childName;

  /**
   * Tells the page the sheet is done, saved or not.
   */
  public readonly closed = output();

  /**
   * Longest meaning the API accepts.
   */
  protected readonly labelMaxLength = LABEL_MAX_LENGTHS.sentence;

  /**
   * What the child meant, the sentence's title.
   */
  protected readonly label = signal('');

  /**
   * Its first pronunciation, said today by default.
   */
  protected readonly draft = signal<PronunciationDraft>(emptyDraft('learning'));

  /**
   * A save is on its way.
   */
  protected readonly busy = signal(false);

  /**
   * Why the last save failed, shown inside the sheet (a toast would sit under the modal dialog).
   */
  protected readonly error = signal<string | null>(null);

  /**
   * Saving needs a meaning, a ready pronunciation and nothing pending.
   */
  protected readonly canSave = computed(
    () =>
      this.label().trim() !== '' &&
      this.label().trim().length <= this.labelMaxLength &&
      isDraftReady(this.draft(), todayIso(), 'sentence') &&
      !this.busy(),
  );

  /**
   * Closes the page's sheet when the dialog closes (Escape, veil, close button).
   */
  protected onOpenChange(open: boolean): void {
    if (!open) {
      this.closed.emit();
    }
  }

  /**
   * Creates the sentence with its first pronunciation, and celebrates it.
   */
  protected async save(): Promise<void> {
    if (!this.canSave()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.wordsApi.create({
        kind: 'sentence',
        label: this.label().trim(),
        pronunciation: toPronunciationRequest(this.draft()),
      });
      this.toasts.show('Nouvelle phrase notée');
      this.celebration.play();
      this.closed.emit();
    } catch {
      this.error.set("La phrase n'a pas pu être enregistrée. Réessaie.");
    } finally {
      this.busy.set(false);
    }
  }
}
