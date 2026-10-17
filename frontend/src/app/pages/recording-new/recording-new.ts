import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { DictionaryEntry } from '@core/dictionary/dictionary.model';
import { DictionaryApi } from '@core/dictionary/dictionary-api';
import { Celebration } from '@core/feedback/celebration';
import { ToastQueue } from '@core/feedback/toast-queue';
import { apiErrorCode } from '@core/http/api-error.utils';
import { resourceValue } from '@core/http/resource.utils';
import {
  RECORDING_MAX_BYTES,
  RECORDING_MAX_DURATION_MS,
} from '@core/recordings/recording.constants';
import { formatRecordingClock } from '@core/recordings/recording.utils';
import { quote } from '@core/text/text.utils';
import { CATEGORY_LABELS } from '@core/words/word.constants';
import { Word } from '@core/words/word.model';
import { WordsApi } from '@core/words/words-api';
import { ActionBar } from '@shared/action-bar/action-bar';
import { AudioButton } from '@shared/audio-button/audio-button';
import { Button } from '@shared/button/button';
import { Icon } from '@shared/icon/icon';
import { Mascot } from '@shared/mascot/mascot';
import { MascotBubble } from '@shared/mascot-bubble/mascot-bubble';
import { PageHeader } from '@shared/page-header/page-header';
import { PronunciationForm } from '@shared/pronunciation-form/pronunciation-form';
import { PronunciationDraft } from '@shared/pronunciation-form/pronunciation-form.model';
import {
  emptyDraft,
  isDraftReady,
  toPronunciationRequest,
} from '@shared/pronunciation-form/pronunciation-form.utils';
import { QuotePipe } from '@shared/quote/quote.pipe';
import { WordPicker } from '@shared/word-picker/word-picker';
import { WordChoice } from '@shared/word-picker/word-picker.model';

import { AudioRecorder } from './audio-recorder';
import { LevelBars } from './level-bars/level-bars';
import { RecorderError } from './recorder-error';
import { RecordingClip } from './recording-clip/recording-clip';
import { LEVEL_BAR_COUNT, MIN_KEEP_MS, RECORDER_ERROR_MESSAGES } from './recording-new.constants';
import { RecordedClip, RecordingPhase, SaveOutcome } from './recording-new.model';
import {
  doneCopy,
  liveBars,
  recordingInstruction,
  recordingTitle,
  saveButtonText,
  summarizeLevels,
} from './recording-new.utils';

/**
 * Record-a-sound screen: record up to 15 s, listen and retry, pick the word, then save the sound in
 * its gallery. An existing word takes it at once; a new word first needs its first pronunciation.
 */
@Component({
  selector: 'app-recording-new-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AudioRecorder],
  imports: [
    QuotePipe,
    RouterLink,
    ActionBar,
    AudioButton,
    Button,
    Icon,
    LevelBars,
    Mascot,
    MascotBubble,
    PageHeader,
    PronunciationForm,
    RecordingClip,
    WordPicker,
  ],
  templateUrl: './recording-new.html',
  styleUrl: './recording-new.scss',
})
export class RecordingNewPage {
  /**
   * Notebook words and the writes.
   */
  private readonly wordsApi = inject(WordsApi);

  /**
   * Built-in dictionary for the word search.
   */
  private readonly dictionaryApi = inject(DictionaryApi);

  /**
   * Reports failures.
   */
  private readonly toasts = inject(ToastQueue);

  /**
   * Confetti once the sound is saved.
   */
  private readonly celebration = inject(Celebration);

  /**
   * New word already created by a save whose upload failed, so a retry only resends the sound.
   */
  private pendingWordId: number | null = null;

  /**
   * The microphone.
   */
  protected readonly recorder = inject(AudioRecorder);

  /**
   * `?mot=` query parameter: id of the word to give the sound to, skipping the word search.
   */
  public readonly mot = input<string>();

  /**
   * Word of the last saved sound, preselected by "Enregistrer un autre son"; `null` otherwise.
   */
  private readonly lastWordId = signal<number | null>(null);

  /**
   * Current step.
   */
  protected readonly phase = signal<RecordingPhase>('ready');

  /**
   * Microphone failure explained in the bubble, `null` when none.
   */
  protected readonly error = signal<string | null>(null);

  /**
   * The recorded clip, `null` before recording.
   */
  protected readonly clip = signal<RecordedClip | null>(null);

  /**
   * Object URL playing the clip, revoked when replaced or on leave.
   */
  protected readonly clipUrl = signal<string | null>(null);

  /**
   * The clip is too short to be a word: it can be heard and redone, not kept.
   */
  protected readonly tooShort = computed(() => (this.clip()?.durationMs ?? 0) < MIN_KEEP_MS);

  /**
   * Whether the clip is playing on the listen step, to darken its bars.
   */
  protected readonly playing = signal(false);

  /**
   * Word the sound belongs to, `null` until chosen.
   */
  protected readonly target = signal<WordChoice | null>(null);

  /**
   * Text typed in the word search.
   */
  protected readonly query = signal('');

  /**
   * First pronunciation of a new word.
   */
  protected readonly draft = signal<PronunciationDraft>(emptyDraft());

  /**
   * Whether the save is running.
   */
  protected readonly saving = signal(false);

  /**
   * What the save did, for the closing screen.
   */
  protected readonly outcome = signal<SaveOutcome | null>(null);

  /**
   * The notebook's words.
   */
  protected readonly words = computed<readonly Word[]>(
    () => resourceValue(this.wordsApi.words, []) ?? [],
  );

  /**
   * The dictionary entries.
   */
  protected readonly entries = computed<readonly DictionaryEntry[]>(
    () => resourceValue(this.dictionaryApi.entries, []) ?? [],
  );

  /**
   * Word given by "Enregistrer un autre son" or by `?mot=`, when it exists.
   */
  protected readonly preselected = computed(() => {
    const id = this.lastWordId() ?? Number(this.mot());
    return this.words().find((word) => word.id === id) ?? null;
  });

  /**
   * Screen title.
   */
  protected readonly title = computed(() => recordingTitle(this.phase()));

  /**
   * Lapinou's instruction, or the microphone failure.
   */
  protected readonly instruction = computed(
    () => this.error() ?? recordingInstruction(this.phase()),
  );

  /**
   * Bars of the main waveform: flat before, live while recording, the clip afterwards.
   */
  protected readonly bars = computed(() => {
    const clip = this.clip();
    switch (this.phase()) {
      case 'recording':
        return liveBars(this.recorder.levels());
      case 'review':
        return clip ? summarizeLevels(clip.levels) : [];
      default:
        return Array<number>(LEVEL_BAR_COUNT).fill(0);
    }
  });

  /**
   * Color of the main waveform: grey, red while recording, lavender once recorded, darker playing.
   */
  protected readonly waveTone = computed<'idle' | 'live' | 'clip' | 'played'>(() => {
    switch (this.phase()) {
      case 'recording':
        return 'live';
      case 'review':
        return this.playing() ? 'played' : 'clip';
      default:
        return 'idle';
    }
  });

  /**
   * Bars of the clip strip on the next steps.
   */
  protected readonly clipBars = computed(() => summarizeLevels(this.clip()?.levels ?? []));

  /**
   * Clock under the waveform: elapsed out of 15 s while recording, the length afterwards.
   */
  protected readonly clock = computed(() => {
    switch (this.phase()) {
      case 'recording':
        return `${formatRecordingClock(this.recorder.elapsedMs())} / ${formatRecordingClock(RECORDING_MAX_DURATION_MS)}`;
      case 'review':
        return formatRecordingClock(this.clip()?.durationMs ?? 0);
      default:
        return formatRecordingClock(0);
    }
  });

  /**
   * Whether the new word's first pronunciation can be saved.
   */
  protected readonly ready = computed(() => isDraftReady(this.draft()));

  /**
   * Text of the save button.
   */
  protected readonly saveText = computed(() => saveButtonText(this.ready()));

  /**
   * Title and sentence of the closing screen.
   */
  protected readonly done = computed(() => {
    const outcome = this.outcome();
    return outcome ? { ...doneCopy(outcome), wordId: outcome.wordId } : null;
  });

  /**
   * French category names.
   */
  protected readonly categoryLabels = CATEGORY_LABELS;

  /**
   * Frees the clip's object URL on leave; the recorder frees the microphone itself.
   */
  constructor() {
    inject(DestroyRef).onDestroy(() => this.setClip(null));
  }

  /**
   * Records a clip, then offers to listen to it; explains a microphone failure.
   */
  protected async startRecording(): Promise<void> {
    this.error.set(null);
    this.setClip(null);
    this.phase.set('recording');
    try {
      const clip = await this.recorder.record();
      if (clip.blob.size > RECORDING_MAX_BYTES) {
        this.fail('Ce son est trop lourd. Recommence un peu plus court.');
        return;
      }
      this.setClip(clip);
      this.phase.set('review');
    } catch (error) {
      this.fail(
        error instanceof RecorderError
          ? RECORDER_ERROR_MESSAGES[error.kind]
          : RECORDER_ERROR_MESSAGES.failed,
      );
    }
  }

  /**
   * Ends the recording.
   */
  protected stopRecording(): void {
    this.recorder.stop();
  }

  /**
   * Keeps the clip: straight into the gallery of a preselected word, else to the word search.
   */
  protected keep(): void {
    if (this.tooShort()) {
      return;
    }
    const preselected = this.preselected();
    if (preselected) {
      void this.addToWord(preselected);
    } else {
      this.phase.set('pick');
    }
  }

  /**
   * An existing word takes the sound at once; a new word asks for its first pronunciation first.
   */
  protected choose(choice: WordChoice): void {
    if (choice.word) {
      void this.addToWord(choice.word);
      return;
    }
    this.pendingWordId = null;
    this.target.set(choice);
    this.draft.set(emptyDraft());
    this.phase.set('note');
  }

  /**
   * Back to the word search.
   */
  protected changeWord(): void {
    this.pendingWordId = null;
    this.target.set(null);
    this.phase.set('pick');
  }

  /**
   * Creates the new word with its first pronunciation, then adds the sound to its gallery.
   */
  protected async save(): Promise<void> {
    const target = this.target();
    const clip = this.clip();
    if (!target || !clip || !this.ready() || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      this.pendingWordId ??= (
        await this.wordsApi.create({
          label: target.label.trim(),
          pronunciation: toPronunciationRequest(this.draft()),
        })
      ).id;
      await this.wordsApi.addRecording(this.pendingWordId, clip.blob, clip.durationMs);
      this.finish('new', target.label, this.draft().spoken.trim(), this.pendingWordId);
      this.pendingWordId = null;
    } catch (error) {
      this.reportFailure(error, target.label);
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Starts over for another sound of the same word.
   */
  protected another(): void {
    this.lastWordId.set(this.outcome()?.wordId ?? null);
    this.pendingWordId = null;
    this.setClip(null);
    this.target.set(null);
    this.query.set('');
    this.outcome.set(null);
    this.error.set(null);
    this.phase.set('ready');
  }

  /**
   * Adds the clip to an existing word's gallery.
   */
  private async addToWord(word: Word): Promise<void> {
    const clip = this.clip();
    if (!clip || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      await this.wordsApi.addRecording(word.id, clip.blob, clip.durationMs);
      this.finish('added', word.label, '', word.id);
    } catch (error) {
      this.reportFailure(error, word.label);
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Closing screen with confetti; the sound count is read from the patched notebook.
   */
  private finish(kind: SaveOutcome['kind'], label: string, spoken: string, wordId: number): void {
    const soundCount = this.words().find((word) => word.id === wordId)?.recordings.length ?? 1;
    this.outcome.set({ kind, label, spoken, soundCount, wordId });
    this.phase.set('done');
    this.celebration.play();
  }

  /**
   * Explains a failed save; a word that already exists sends back to the search.
   */
  private reportFailure(error: unknown, label: string): void {
    switch (apiErrorCode(error)) {
      case 'WORD_ALREADY_EXISTS':
        this.wordsApi.words.reload();
        this.toasts.show(
          `${quote(label)} est déjà dans ses mots, choisis-le dans la liste.`,
          'error',
        );
        this.changeWord();
        return;
      case 'PAYLOAD_TOO_LARGE':
      case 'UNSUPPORTED_MEDIA_TYPE':
        this.toasts.show("Ce son n'est pas accepté. Recommence l'enregistrement.", 'error');
        return;
      default:
        this.toasts.show(
          this.pendingWordId === null
            ? "Le son n'a pas pu être enregistré, réessaie."
            : "Le mot est noté, mais le son n'est pas parti. Réessaie.",
          'error',
        );
    }
  }

  /**
   * Back to the start with an explanation in the bubble.
   */
  private fail(message: string): void {
    this.error.set(message);
    this.phase.set('ready');
  }

  /**
   * Replaces the clip and its object URL, revoking the old one.
   */
  private setClip(clip: RecordedClip | null): void {
    const previous = this.clipUrl();
    if (previous) {
      URL.revokeObjectURL(previous);
    }
    this.clip.set(clip);
    this.clipUrl.set(clip ? URL.createObjectURL(clip.blob) : null);
  }
}
