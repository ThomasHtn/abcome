import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { translate, TranslocoPipe } from '@jsverse/transloco';

import { AuthSession } from '@core/auth/auth-session';
import { formatShortDateWithYear } from '@core/date/date.utils';
import { Today } from '@core/date/today';
import { Celebration } from '@core/feedback/celebration';
import { ToastQueue } from '@core/feedback/toast-queue';
import { apiErrorCode, isNotFound } from '@core/http/api-error.utils';
import { resourceValue } from '@core/http/resource.utils';
import { quote } from '@core/text/text.utils';
import { SeenWords } from '@core/words/seen-words';
import { LABEL_MAX_LENGTHS } from '@core/words/word.constants';
import { Pronunciation, Recording, Word, WordKind } from '@core/words/word.model';
import {
  currentPronunciation,
  currentStatus,
  entryPath,
  firstPronunciation,
  heirStage,
} from '@core/words/word.utils';
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
import { StatusDot } from '@shared/status-dot/status-dot';
import { TextField } from '@shared/text-field/text-field';

import { StageSounds } from './stage-sounds/stage-sounds';
import { CONFIRM_SHEETS, KIND_COPY, PARENT_SHEETS } from './word-detail.constants';
import { MissingTarget, WordSheet } from './word-detail.model';
import {
  gallerySounds,
  moveTargetLabel,
  progressLabel,
  removeSoundText,
  removeStageText,
  soundSheetCopy,
  stageDateLabel,
  timelineStages,
  titleLength,
  translatedCopy,
  turnedMastered,
} from './word-detail.utils';

/**
 * Word page: the word and its status, the timeline of its pronunciations (newest first) each with its
 * sounds, and sheets to add, edit or remove a stage, delete a sound, rename or delete the word.
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
    StageSounds,
    StatusBadge,
    StatusDot,
    TextField,
    TranslocoPipe,
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
   * Clears the entry's news tag on this device once its page is shown.
   */
  private readonly seenWords = inject(SeenWords);

  /**
   * Tells where the visitor came from, for the back arrow.
   */
  private readonly router = inject(Router);

  /**
   * Goes back in the browser history, so the list keeps its tab and search.
   */
  private readonly location = inject(Location);

  /**
   * First name of the child, given by the server with the session.
   */
  protected readonly childName = inject(AuthSession).childName;

  /**
   * Whether the visitor only looks: the timeline and sounds stay, every control that writes goes.
   */
  protected readonly readOnly = inject(AuthSession).readOnly;

  /**
   * Timer bringing Lapinou back to rest after a celebration jump.
   */
  private jumpTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * `:id` route parameter.
   */
  public readonly id = input.required<string>();

  /**
   * Route data: `word` under `/words/`, `sentence` under `/sentences/`.
   */
  public readonly kind = input<WordKind>('word');

  /**
   * Wording for a word or a sentence, known from the route even before the notebook loads.
   */
  protected readonly copy = computed(() => translatedCopy(KIND_COPY[this.kind()]));

  /**
   * Whether the notebook has loaded, to tell "loading" from "not found".
   */
  protected readonly loaded = computed(() => this.wordsApi.words.hasValue());

  /**
   * Whether the notebook failed to load, so the page offers a retry instead of loading forever.
   */
  protected readonly failed = computed(
    () => !this.wordsApi.words.hasValue() && !!this.wordsApi.words.error(),
  );

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
  protected readonly today = inject(Today).iso;

  /**
   * Timeline, newest stage first, each stage with its sounds.
   */
  protected readonly stages = computed(() => {
    const word = this.word();
    return word ? timelineStages(word, this.today()) : [];
  });

  /**
   * Every sound of the word, newest first, to name the one being deleted.
   */
  protected readonly sounds = computed(() =>
    gallerySounds(this.word()?.recordings ?? [], this.today()),
  );

  /**
   * Sound whose "⋮" was tapped, kept while its actions, move or deletion are open; `null` otherwise.
   */
  protected readonly actionSound = signal<Recording | null>(null);

  /**
   * Title and description of that sound's actions sheet.
   */
  protected readonly actionSoundCopy = computed(() => {
    const sound = this.sounds().find((item) => item.recording.id === this.actionSound()?.id);
    return sound
      ? soundSheetCopy(sound, this.spokenOn(sound.recording), this.childName())
      : { heading: '', text: '' };
  });

  /**
   * Sound whose new stage is being chosen; `null` otherwise.
   */
  protected readonly movingSound = signal<Recording | null>(null);

  /**
   * Stages the moving sound can go to: every stage but its own, newest first.
   */
  protected readonly moveTargets = computed(() =>
    this.stages().filter((stage) => stage.pronunciation.id !== this.movingSound()?.pronunciationId),
  );

  /**
   * Sound waiting for its deletion to be confirmed; `null` otherwise.
   */
  protected readonly removingSound = signal<Recording | null>(null);

  /**
   * Consequence of the sound deletion, naming its day and what the child says on it.
   */
  protected readonly removeSoundMessage = computed(() => {
    const removing = this.removingSound();
    const sound = this.sounds().find((item) => item.recording.id === removing?.id);
    return sound ? removeSoundText(sound, this.spokenOn(sound.recording), this.childName()) : '';
  });

  /**
   * Screen reader name of the "⋯" menu, naming the word.
   */
  protected readonly actionsLabel = computed(() =>
    translate('wordDetail.actionsLabel', { label: quote(this.word()?.label ?? '') }),
  );

  /**
   * Screen reader name of the microphone link, naming the word.
   */
  protected readonly recordLabel = computed(() =>
    translate('wordDetail.recordLabel', { label: quote(this.word()?.label ?? '') }),
  );

  /**
   * Question of the word deletion sheet, naming the word and whose list it leaves.
   */
  protected readonly deleteHeading = computed(() =>
    translate('wordDetail.deleteHeading', {
      label: quote(this.word()?.label ?? ''),
      childName: this.childName(),
    }),
  );

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
  protected readonly draftReady = computed(() =>
    isDraftReady(this.draft(), this.today(), this.kind()),
  );

  /**
   * Title of the stage form.
   */
  protected readonly stageHeading = computed(() =>
    this.editing()
      ? translate('wordDetail.stageHeadingEdit')
      : translate('wordDetail.stageHeadingNew'),
  );

  /**
   * Example in the new stage's spoken field: what the child said before.
   */
  protected readonly spokenPlaceholder = computed(() =>
    this.editing()
      ? ''
      : translate('wordDetail.spokenBefore', { spoken: this.current()?.spoken ?? '' }),
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
  protected readonly removeStageHeading = computed(() =>
    translate('wordDetail.removeStageHeading', { spoken: quote(this.editing()?.spoken ?? '') }),
  );

  /**
   * Consequence of the stage removal, saying which stage keeps its sounds.
   */
  protected readonly removeStageMessage = computed(() => {
    const editing = this.editing();
    const word = this.word();
    if (!editing || !word) {
      return '';
    }
    const soundCount = word.recordings.filter(
      (recording) => recording.pronunciationId === editing.id,
    ).length;
    return removeStageText(editing.date, soundCount, heirStage(word, editing.id)?.spoken);
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
  protected readonly labelMaxLength = computed(() => LABEL_MAX_LENGTHS[this.kind()]);

  /**
   * Short date of a stage, for the stage list.
   */
  protected readonly shortDate = formatShortDateWithYear;

  /**
   * Screen reader name of a stage in the move sheet.
   */
  protected readonly moveLabel = moveTargetLabel;

  /**
   * Stops the jump timer when the page goes away, moves an entry opened under the other kind's path
   * (`/words/` for a sentence) to its own, so its wording and limits match, and marks what the page
   * shows as seen, again when a reload brings a change made elsewhere.
   */
  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.jumpTimer));
    effect(() => {
      const word = this.word();
      if (word && word.kind !== this.kind()) {
        void this.router.navigateByUrl(entryPath(word), { replaceUrl: true });
      }
    });
    effect(() => {
      const word = this.word();
      if (word) {
        this.seenWords.markSeen(word);
      }
    });
  }

  /**
   * Loads the notebook again after a failure.
   */
  protected retry(): void {
    this.wordsApi.words.reload();
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
      void this.router.navigate(['/'], { queryParams: this.copy().listQuery });
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
   * Follows a sheet closing itself (Escape, veil, "Garder"), back to the sheet it came from if any;
   * ignores the close of a sheet that another one just replaced.
   */
  protected onSheetToggle(sheet: WordSheet, open: boolean): void {
    if (!open && this.sheet() === sheet) {
      this.sheet.set(PARENT_SHEETS[sheet] ?? null);
      this.sheetError.set(null);
    }
  }

  /**
   * Stage form for a new stage, starting from the current status.
   */
  protected openNewStage(): void {
    this.editing.set(null);
    this.draft.set(emptyDraft(this.current()?.status, this.today()));
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
          this.toasts.show(
            editing ? translate('wordDetail.stageEdited') : translate('wordDetail.stageAdded'),
          );
        }
      },
      translate('wordDetail.stageSaveFailed'),
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
          this.toasts.show(translate('wordDetail.stageRemoved'));
        } catch (error) {
          if (apiErrorCode(error) !== 'LAST_PRONUNCIATION') {
            throw error;
          }
          this.open('last-stage');
        }
      },
      translate('wordDetail.stageRemoveFailed'),
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
      this.renameError.set(this.copy().emptyLabel);
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
      this.toasts.show(this.copy().renamed);
    } catch (error) {
      if (apiErrorCode(error) === 'WORD_ALREADY_EXISTS') {
        this.renameError.set(translate('wordDetail.alreadyInWords', { label: quote(label) }));
      } else if (isNotFound(error)) {
        this.handleMissing('word');
      } else {
        this.sheetError.set(this.copy().renameFailed);
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
      this.copy().deleteFailed,
      'word',
    );
  }

  /**
   * Offers the actions of a sound: move it, delete it.
   */
  protected openSoundActions(recording: Recording): void {
    this.actionSound.set(recording);
    this.open('sound');
  }

  /**
   * Asks which stage the sound of the actions sheet moves to.
   */
  protected askMoveSound(): void {
    this.movingSound.set(this.actionSound());
    this.open('move-sound');
  }

  /**
   * Files the moving sound under the chosen stage.
   */
  protected async moveSound(target: Pronunciation): Promise<void> {
    const moving = this.movingSound();
    if (!moving || this.busy()) {
      return;
    }
    await this.run(
      async () => {
        try {
          await this.wordsApi.moveRecording(moving.id, target.id);
        } catch (error) {
          // A target stage deleted meanwhile is a 400, not a 404: refresh rather than retry forever.
          if (apiErrorCode(error) === 'INVALID_REQUEST') {
            this.handleMissing('stage');
            return;
          }
          throw error;
        }
        this.movingSound.set(null);
        this.sheet.set(null);
        this.toasts.show(translate('wordDetail.soundMoved', { spoken: quote(target.spoken) }));
      },
      translate('wordDetail.soundMoveFailed'),
      'sound',
    );
  }

  /**
   * Asks to confirm the deletion of the sound of the actions sheet.
   */
  protected askRemoveSound(): void {
    this.removingSound.set(this.actionSound());
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
        this.toasts.show(translate('wordDetail.soundRemoved'));
      },
      translate('wordDetail.soundRemoveFailed'),
      'sound',
    );
  }

  /**
   * Confetti, Lapinou's jump and the "passe au vert" toast.
   */
  private celebrate(label: string): void {
    this.celebration.play();
    this.toasts.show(
      translate('wordDetail.turnedMastered', { childName: this.childName(), label: quote(label) }),
    );
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
    this.actionSound.set(null);
    this.removingSound.set(null);
    this.movingSound.set(null);
    this.wordsApi.words.reload();
    if (missing === 'word' && label !== undefined) {
      this.deletedLabel.set(label);
    } else if (missing === 'stage') {
      this.toasts.show(translate('wordDetail.stageGoneMeanwhile'));
    } else if (missing === 'sound') {
      this.toasts.show(translate('wordDetail.soundGoneMeanwhile'));
    }
  }

  /**
   * What the child says on a sound: the spoken form of the stage it is filed under.
   */
  private spokenOn(recording: Recording): string {
    const stage = this.word()?.pronunciations.find(
      (pronunciation) => pronunciation.id === recording.pronunciationId,
    );
    return stage?.spoken ?? '';
  }
}
