import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { formatLongDate, formatShortDateWithYear, todayIso } from '@core/date/date.utils';
import { Celebration } from '@core/feedback/celebration';
import { ToastQueue } from '@core/feedback/toast-queue';
import { apiErrorCode, isNotFound } from '@core/http/api-error.utils';
import { resourceValue } from '@core/http/resource.utils';
import { quote } from '@core/text/text.utils';
import { WORD_LABEL_MAX_LENGTH } from '@core/words/word.constants';
import { Pronunciation, Recording, Word } from '@core/words/word.model';
import { currentPronunciation, currentStatus, firstPronunciation } from '@core/words/word.utils';
import { WordsApi } from '@core/words/words-api';
import { ActionBar } from '@shared/action-bar/action-bar';
import { BottomSheet } from '@shared/bottom-sheet/bottom-sheet';
import { Button } from '@shared/button/button';
import { ConfirmSheet } from '@shared/confirm-sheet/confirm-sheet';
import { Icon } from '@shared/icon/icon';
import { IconButton } from '@shared/icon-button/icon-button';
import { Mascot } from '@shared/mascot/mascot';
import { MASCOT_JUMP_MS } from '@shared/mascot/mascot.constants';
import { MascotState } from '@shared/mascot/mascot.model';
import { PronunciationForm } from '@shared/pronunciation-form/pronunciation-form';
import { PronunciationDraft } from '@shared/pronunciation-form/pronunciation-form.model';
import {
  draftOf,
  emptyDraft,
  isDraftReady,
  toPronunciationRequest,
} from '@shared/pronunciation-form/pronunciation-form.utils';
import { QuotePipe } from '@shared/quote/quote.pipe';
import { StatusBadge } from '@shared/status-badge/status-badge';
import { TextField } from '@shared/text-field/text-field';

import { SoundGallery } from './sound-gallery/sound-gallery';
import { CONFIRM_SHEETS } from './word-detail.constants';
import { MissingTarget, WordSheet } from './word-detail.model';
import {
  gallerySounds,
  progressLabel,
  stageDateLabel,
  timelineStages,
  titleLength,
  turnedMastered,
} from './word-detail.utils';

/**
 * Word page: the word on its status color, the timeline of its pronunciations (newest first), its
 * sound gallery, and sheets to add, edit or remove a stage, delete a sound, rename or delete the word.
 */
@Component({
  selector: 'app-word-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    QuotePipe,
    RouterLink,
    ActionBar,
    BottomSheet,
    Button,
    ConfirmSheet,
    Icon,
    IconButton,
    Mascot,
    PronunciationForm,
    SoundGallery,
    StatusBadge,
    TextField,
  ],
  templateUrl: './word-detail.html',
  styleUrl: './word-detail.scss',
})
export class WordDetailPage {
  /**
   * The notebook and every write of this page.
   */
  private readonly wordsApi = inject(WordsApi);

  /**
   * Confirms each change or reports a failure.
   */
  private readonly toasts = inject(ToastQueue);

  /**
   * Confetti when the word turns "Bien dit".
   */
  private readonly celebration = inject(Celebration);

  /**
   * Tells where the visitor came from, for the back arrow.
   */
  private readonly router = inject(Router);

  /**
   * Goes back in the browser history, so the list keeps its tab and search.
   */
  private readonly location = inject(Location);

  /**
   * Timer bringing Lapinou back to rest after a celebration jump.
   */
  private jumpTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * `:id` route parameter.
   */
  public readonly id = input.required<string>();

  /**
   * Whether the notebook has loaded, to tell "loading" from "not found".
   */
  protected readonly loaded = computed(() => this.wordsApi.words.hasValue());

  /**
   * The word shown, `null` while loading or when the id is unknown.
   */
  protected readonly word = computed<Word | null>(() => {
    const id = Number(this.id());
    const words = resourceValue(this.wordsApi.words, []) ?? [];
    return words.find((word) => word.id === id) ?? null;
  });

  /**
   * Size of the hero title, smaller for a long word.
   */
  protected readonly titleSize = computed(() => titleLength(this.word()?.label ?? ''));

  /**
   * Why the last write of the open sheet failed, shown inside it; `null` when nothing to say.
   */
  protected readonly sheetError = signal<string | null>(null);

  /**
   * Label of the word just deleted, for the goodbye screen; `null` otherwise.
   */
  protected readonly deletedLabel = signal<string | null>(null);

  /**
   * Today in Paris, to title the latest stage.
   */
  protected readonly today = todayIso();

  /**
   * Timeline, newest stage first.
   */
  protected readonly stages = computed(() => {
    const word = this.word();
    return word ? timelineStages(word, this.today) : [];
  });

  /**
   * Sound gallery, newest first.
   */
  protected readonly sounds = computed(() => gallerySounds(this.word()?.recordings ?? []));

  /**
   * Sound waiting for its deletion to be confirmed; `null` otherwise.
   */
  protected readonly removingSound = signal<Recording | null>(null);

  /**
   * Consequence of the sound deletion, naming its day and length.
   */
  protected readonly removeSoundMessage = computed(() => {
    const removing = this.removingSound();
    const sound = this.sounds().find((item) => item.recording.id === removing?.id);
    return sound
      ? `Le son ${sound.description} sera effacé. On ne pourra pas revenir en arrière.`
      : '';
  });

  /**
   * Latest stage.
   */
  protected readonly current = computed(() => {
    const word = this.word();
    return word ? currentPronunciation(word) : null;
  });

  /**
   * Text of the main button.
   */
  protected readonly progressText = computed(() =>
    progressLabel(this.current()?.status ?? 'learning'),
  );

  /**
   * Open bottom sheet, `null` when none.
   */
  protected readonly sheet = signal<WordSheet | null>(null);

  /**
   * Stage being edited; `null` when the form adds a new one.
   */
  protected readonly editing = signal<Pronunciation | null>(null);

  /**
   * Stage form content.
   */
  protected readonly draft = signal<PronunciationDraft>(emptyDraft());

  /**
   * Whether the stage form can be saved.
   */
  protected readonly draftReady = computed(() => isDraftReady(this.draft()));

  /**
   * Title of the stage form.
   */
  protected readonly stageHeading = computed(() =>
    this.editing() ? 'Modifier la prononciation' : 'Nouvelle prononciation',
  );

  /**
   * Example in the new stage's spoken field: what Côme said before.
   */
  protected readonly spokenPlaceholder = computed(() =>
    this.editing() ? '' : `avant : ${this.current()?.spoken ?? ''}`,
  );

  /**
   * Label of the stage form's day.
   */
  protected readonly dateLabel = computed(() => {
    const editing = this.editing();
    const word = this.word();
    return stageDateLabel(!!editing && !!word && firstPronunciation(word).id === editing.id);
  });

  /**
   * Question of the stage removal sheet.
   */
  protected readonly removeStageHeading = computed(
    () => `Retirer ${quote(this.editing()?.spoken ?? '')} de ses progrès\u00A0?`,
  );

  /**
   * Consequence of the stage removal.
   */
  protected readonly removeStageMessage = computed(() => {
    const editing = this.editing();
    return editing
      ? `Cette prononciation du ${formatLongDate(editing.date)} sera effacée. ` +
          'On ne pourra pas revenir en arrière.'
      : '';
  });

  /**
   * Label typed in the rename sheet.
   */
  protected readonly renameLabel = signal('');

  /**
   * Error under the rename field, `null` when none.
   */
  protected readonly renameError = signal<string | null>(null);

  /**
   * Whether a write is running, so buttons cannot send it twice.
   */
  protected readonly busy = signal(false);

  /**
   * Lapinou in the hero: jumps once when the word turns "Bien dit".
   */
  protected readonly mascotState = signal<MascotState>('idle');

  /**
   * Longest label the API accepts.
   */
  protected readonly labelMaxLength = WORD_LABEL_MAX_LENGTH;

  /**
   * Short date of a stage, for the stage list.
   */
  protected readonly shortDate = formatShortDateWithYear;

  /**
   * Stops the jump timer when the page goes away.
   */
  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.jumpTimer));
  }

  /**
   * Returns to the list as it was left (tab, search) when the visitor came from it, else opens it.
   */
  protected back(): void {
    const previous = this.router.lastSuccessfulNavigation()?.previousNavigation?.finalUrl;
    const fromList = !!previous && this.router.serializeUrl(previous).split(/[?#]/u)[0] === '/';
    if (fromList) {
      this.location.back();
    } else {
      void this.router.navigateByUrl('/');
    }
  }

  /**
   * Opens a sheet, replacing the one shown, without the previous sheet's error.
   */
  protected open(sheet: WordSheet): void {
    this.sheetError.set(null);
    this.sheet.set(sheet);
  }

  /**
   * Follows a sheet closing itself (Escape, veil, close button); ignores the close of a sheet that
   * another one just replaced.
   */
  protected onSheetToggle(sheet: WordSheet, open: boolean): void {
    if (!open && this.sheet() === sheet) {
      this.sheet.set(null);
      this.sheetError.set(null);
    }
  }

  /**
   * Stage form for a new stage, starting from the current status.
   */
  protected openNewStage(): void {
    this.editing.set(null);
    this.draft.set(emptyDraft(this.current()?.status, this.today));
    this.open('stage');
  }

  /**
   * Stage form for an existing stage.
   */
  protected openStage(pronunciation: Pronunciation): void {
    this.editing.set(pronunciation);
    this.draft.set(draftOf(pronunciation));
    this.open('stage');
  }

  /**
   * Adds or edits the stage, celebrating a word that turns "Bien dit".
   */
  protected async saveStage(): Promise<void> {
    const word = this.word();
    if (!word || !this.draftReady() || this.busy()) {
      return;
    }
    const before = currentStatus(word);
    const editing = this.editing();
    const request = toPronunciationRequest(this.draft());
    await this.run(
      async () => {
        if (editing) {
          await this.wordsApi.updatePronunciation(editing.id, request);
        } else {
          await this.wordsApi.addPronunciation(word.id, request);
        }
        this.sheet.set(null);
        const after = this.current()?.status ?? before;
        if (turnedMastered(before, after)) {
          this.celebrate(word.label);
        } else {
          this.toasts.show(editing ? 'Prononciation modifiée' : 'Nouvelle prononciation notée');
        }
      },
      "La prononciation n'a pas pu être enregistrée, réessaie.",
      editing ? 'stage' : 'word',
    );
  }

  /**
   * Asks to remove the edited stage, or explains why the only stage cannot go.
   */
  protected askRemoveStage(): void {
    const word = this.word();
    this.open(word && word.pronunciations.length > 1 ? 'remove-stage' : 'last-stage');
  }

  /**
   * Removes the edited stage.
   */
  protected async removeStage(): Promise<void> {
    const editing = this.editing();
    if (!editing || this.busy()) {
      return;
    }
    await this.run(
      async () => {
        try {
          await this.wordsApi.removePronunciation(editing.id);
          this.sheet.set(null);
          this.toasts.show('Prononciation retirée');
        } catch (error) {
          if (apiErrorCode(error) !== 'LAST_PRONUNCIATION') {
            throw error;
          }
          this.open('last-stage');
        }
      },
      "La prononciation n'a pas pu être retirée, réessaie.",
      'stage',
    );
  }

  /**
   * Rename sheet, prefilled with the current label.
   */
  protected openRename(): void {
    this.renameLabel.set(this.word()?.label ?? '');
    this.renameError.set(null);
    this.open('rename');
  }

  /**
   * Updates the typed label and clears a previous error.
   */
  protected typeLabel(label: string): void {
    this.renameLabel.set(label);
    this.renameError.set(null);
  }

  /**
   * Renames the word; a label already in the notebook is explained under the field.
   */
  protected async rename(): Promise<void> {
    const word = this.word();
    const label = this.renameLabel().trim();
    if (!word || this.busy()) {
      return;
    }
    if (label === '') {
      this.renameError.set('Écris le mot.');
      return;
    }
    if (label === word.label) {
      this.sheet.set(null);
      return;
    }
    this.busy.set(true);
    this.sheetError.set(null);
    try {
      await this.wordsApi.rename(word.id, { label });
      this.sheet.set(null);
      this.toasts.show('Mot renommé');
    } catch (error) {
      if (apiErrorCode(error) === 'WORD_ALREADY_EXISTS') {
        this.renameError.set(`${quote(label)} est déjà dans ses mots.`);
      } else if (isNotFound(error)) {
        this.handleMissing('word');
      } else {
        this.sheetError.set("Le mot n'a pas pu être renommé, réessaie.");
      }
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Deletes the word with its whole history, then says goodbye.
   */
  protected async deleteWord(): Promise<void> {
    const word = this.word();
    if (!word || this.busy()) {
      return;
    }
    await this.run(
      async () => {
        await this.wordsApi.remove(word.id);
        this.deletedLabel.set(word.label);
        this.sheet.set(null);
      },
      "Le mot n'a pas pu être supprimé, réessaie.",
      'word',
    );
  }

  /**
   * Asks to confirm the deletion of a sound.
   */
  protected askRemoveSound(recording: Recording): void {
    this.removingSound.set(recording);
    this.open('remove-sound');
  }

  /**
   * Deletes the sound waiting for confirmation.
   */
  protected async removeSound(): Promise<void> {
    const removing = this.removingSound();
    if (!removing || this.busy()) {
      return;
    }
    await this.run(
      async () => {
        await this.wordsApi.removeRecording(removing.id);
        this.removingSound.set(null);
        this.sheet.set(null);
        this.toasts.show('Son supprimé');
      },
      "Le son n'a pas pu être supprimé, réessaie.",
      'sound',
    );
  }

  /**
   * Confetti, Lapinou's jump and the "passe au vert" toast.
   */
  private celebrate(label: string): void {
    this.celebration.play();
    this.toasts.show(`Bravo Côme\u00A0! ${quote(label)} passe au vert`);
    clearTimeout(this.jumpTimer);
    this.mascotState.set('jump');
    this.jumpTimer = setTimeout(() => this.mascotState.set('idle'), MASCOT_JUMP_MS);
  }

  /**
   * Runs a write with the buttons locked; a not-found answer means `missing` was deleted elsewhere,
   * any other failure is reported.
   */
  private async run(
    action: () => Promise<void>,
    failure: string,
    missing: MissingTarget,
  ): Promise<void> {
    this.busy.set(true);
    this.sheetError.set(null);
    try {
      await action();
    } catch (error) {
      if (isNotFound(error)) {
        this.handleMissing(missing);
      } else {
        this.report(failure);
      }
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Shows a failure inside the open sheet; a confirmation sheet closes first so its toast is seen.
   */
  private report(failure: string): void {
    const sheet = this.sheet();
    if (sheet && !CONFIRM_SHEETS.includes(sheet)) {
      this.sheetError.set(failure);
      return;
    }
    this.sheet.set(null);
    this.toasts.show(failure, 'error');
  }

  /**
   * Something was deleted from another phone: the word gone means the goodbye screen, a stage or a
   * sound gone only needs the list refreshed.
   */
  private handleMissing(missing: MissingTarget): void {
    const label = this.word()?.label;
    this.sheet.set(null);
    this.removingSound.set(null);
    this.wordsApi.words.reload();
    if (missing === 'word' && label !== undefined) {
      this.deletedLabel.set(label);
    } else if (missing === 'stage') {
      this.toasts.show('Cette prononciation avait été retirée entre-temps.');
    } else if (missing === 'sound') {
      this.toasts.show('Ce son avait déjà été supprimé.');
    }
  }
}
