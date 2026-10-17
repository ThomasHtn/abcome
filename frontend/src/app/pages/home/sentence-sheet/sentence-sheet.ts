import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';

import { todayIso } from '@core/date/date.utils';
import { Celebration } from '@core/feedback/celebration';
import { ToastQueue } from '@core/feedback/toast-queue';
import { SENTENCE_MAX_LENGTH } from '@core/sentences/sentence.constants';
import { Sentence, SentenceRequest } from '@core/sentences/sentence.model';
import { SentencesApi } from '@core/sentences/sentences-api';
import { BottomSheet } from '@shared/bottom-sheet/bottom-sheet';
import { Button } from '@shared/button/button';
import { DateField } from '@shared/date-field/date-field';
import { dateFieldError } from '@shared/date-field/date-field.utils';
import { QuotePipe } from '@shared/quote/quote.pipe';
import { TextField } from '@shared/text-field/text-field';

/**
 * Sheet to write, edit or delete a sentence; shown while the page keeps it in its template.
 */
@Component({
  selector: 'app-sentence-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuotePipe, BottomSheet, Button, DateField, TextField],
  templateUrl: './sentence-sheet.html',
  styleUrl: './sentence-sheet.scss',
})
export class SentenceSheet {
  /**
   * Saves and deletes sentences.
   */
  private readonly api = inject(SentencesApi);

  /**
   * Says what was done once the sheet closes.
   */
  private readonly toasts = inject(ToastQueue);

  /**
   * Confetti for a new sentence ("Fête").
   */
  private readonly celebration = inject(Celebration);

  /**
   * Sentence to edit, `null` to write a new one.
   */
  public readonly sentence = input<Sentence | null>(null);

  /**
   * Tells the page the sheet is done, saved or not.
   */
  public readonly closed = output();

  /**
   * Longest sentence the API accepts.
   */
  protected readonly maxLength = SENTENCE_MAX_LENGTH;

  /**
   * Form, or the deletion question in place of it.
   */
  protected readonly mode = signal<'form' | 'confirm'>('form');

  /**
   * What Côme said, starting from the edited sentence.
   */
  protected readonly spoken = linkedSignal(() => this.sentence()?.spoken ?? '');

  /**
   * What he meant, optional.
   */
  protected readonly meaning = linkedSignal(() => this.sentence()?.meaning ?? '');

  /**
   * Day it was said, today for a new sentence.
   */
  protected readonly date = linkedSignal(() => this.sentence()?.date ?? todayIso());

  /**
   * A save or a deletion is on its way.
   */
  protected readonly busy = signal(false);

  /**
   * Why the last write failed, shown inside the sheet (a toast would sit under the modal dialog).
   */
  protected readonly error = signal<string | null>(null);

  /**
   * The day is filled in and not in the future, as the API requires.
   */
  protected readonly dateValid = computed(() => dateFieldError(this.date()) === null);

  /**
   * Title of the sheet for what it is doing now.
   */
  protected readonly heading = computed(() => {
    if (this.mode() === 'confirm') {
      return 'Supprimer la phrase';
    }
    return this.sentence() ? 'Modifier la phrase' : 'Nouvelle phrase';
  });

  /**
   * Saving needs something said, a valid day and nothing pending.
   */
  protected readonly canSave = computed(
    () => this.spoken().trim() !== '' && this.dateValid() && !this.busy(),
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
   * Creates or updates the sentence; a new one is celebrated.
   */
  protected async save(): Promise<void> {
    if (!this.canSave()) {
      return;
    }
    const existing = this.sentence();
    const request: SentenceRequest = {
      spoken: this.spoken().trim(),
      meaning: this.meaning().trim() || null,
      date: this.date(),
    };
    await this.run(async () => {
      if (existing) {
        await this.api.update(existing.id, request);
        this.toasts.show('Phrase modifiée');
      } else {
        await this.api.create(request);
        this.toasts.show('Nouvelle phrase notée');
        this.celebration.play();
      }
    }, "La phrase n'a pas pu être enregistrée. Réessaie.");
  }

  /**
   * Deletes the edited sentence once the question was answered yes.
   */
  protected async remove(): Promise<void> {
    const existing = this.sentence();
    if (!existing || this.busy()) {
      return;
    }
    await this.run(async () => {
      await this.api.remove(existing.id);
      this.toasts.show('Phrase supprimée');
    }, "La phrase n'a pas pu être supprimée. Réessaie.");
  }

  /**
   * Runs a write, closes the sheet on success and keeps it open with the message inside on failure.
   */
  private async run(write: () => Promise<void>, failure: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await write();
      this.closed.emit();
    } catch {
      this.error.set(failure);
    } finally {
      this.busy.set(false);
    }
  }
}
