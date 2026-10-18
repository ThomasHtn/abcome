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
import {
  formatRecordingClock,
  formatTenthsClock,
  waveformLevels,
} from '@core/recordings/recording.utils';
import { quote } from '@core/text/text.utils';
import { CATEGORY_LABELS } from '@core/words/word.constants';
import { Pronunciation, PronunciationRequest, Word } from '@core/words/word.model';
import { currentStatus } from '@core/words/word.utils';
import { WordsApi } from '@core/words/words-api';
import { ActionBar } from '@shared/action-bar/action-bar';
import { AudioButton } from '@shared/audio-button/audio-button';
import { Button } from '@shared/button/button';
import { Icon } from '@shared/icon/icon';
import { LevelBars } from '@shared/level-bars/level-bars';
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
import { StatusDot } from '@shared/status-dot/status-dot';
import { WordPicker } from '@shared/word-picker/word-picker';
import { WordChoice } from '@shared/word-picker/word-picker.model';

import { AudioRecorder } from './audio-recorder';
import { RecorderError } from './recorder-error';
import { RecordingClip } from './recording-clip/recording-clip';
import {
  LEVEL_BAR_COUNT,
  MIN_KEEP_MS,
  RECORDER_ERROR_MESSAGES,
  TRIM_BAR_COUNT,
} from './recording-new.constants';
import {
  ClockReading,
  DecodedClip,
  PendingStage,
  RecordedClip,
  RecordingPhase,
  SaveOutcome,
  TrimRange,
} from './recording-new.model';
import {
  decodeClip,
  doneCopy,
  isWholeClip,
  liveBars,
  recordingInstruction,
  recordingTitle,
  saveButtonText,
  stageOptions,
  summarizeLevels,
  trimClip,
} from './recording-new.utils';
import { RecordingTrim } from './recording-trim/recording-trim';

/**
 * Record-a-sound screen: record up to 15 s, listen, trim and retry, pick the word, then file the sound
 * under a stage. An existing word offers its stages or a new one; a new word first needs its first stage.
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
    RecordingTrim,
    StatusDot,
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
   * Stage already created by a save whose upload failed (a new word's first one, or a new stage), so
   * a retry only resends the sound.
   */
  private pending: PendingStage | null = null;

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
   * The clip as recorded, kept whole so a trim can always be undone; `null` before recording.
   */
  private readonly recorded = signal<RecordedClip | null>(null);

  /**
   * The recording decoded for trimming, `null` until decoded or where the browser cannot.
   */
  protected readonly decoded = signal<DecodedClip | null>(null);

  /**
   * Part of the recording kept, `null` while it cannot be trimmed.
   */
  protected readonly trim = signal<TrimRange | null>(null);

  /**
   * The clip to keep: the recording, or its trimmed part; `null` before recording.
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
   * Playback position in the clip, for the trim editor's playback line.
   */
  protected readonly positionMs = signal(0);

  /**
   * Whether the handles are offered: the recording is decoded and longer than a keepable sound.
   */
  protected readonly canTrim = computed(() => {
    const decoded = this.decoded();
    return decoded !== null && this.trim() !== null && decoded.durationMs > MIN_KEEP_MS;
  });

  /**
   * Whether the kept part is shorter than the recording, which offers to undo the cut.
   */
  protected readonly trimmed = computed(() => {
    const trim = this.trim();
    const decoded = this.decoded();
    return trim !== null && decoded !== null && !isWholeClip(trim, decoded.durationMs);
  });

  /**
   * Waveform of the whole recording under the handles, finer than the live one.
   */
  protected readonly trimLevels = computed(() => {
    const decoded = this.decoded();
    return decoded ? waveformLevels(decoded.samples, TRIM_BAR_COUNT) : [];
  });

  /**
   * Word the sound belongs to, `null` until chosen; `word` is set for a word of the notebook.
   */
  protected readonly target = signal<WordChoice | null>(null);

  /**
   * The chosen notebook word as it is now, with a stage added since; `null` for a new word.
   */
  protected readonly targetWord = computed(() => {
    const id = this.target()?.word?.id;
    return this.words().find((word) => word.id === id) ?? null;
  });

  /**
   * Stages of the chosen notebook word offered for the sound, newest first.
   */
  protected readonly stages = computed(() => {
    const word = this.targetWord();
    return word ? stageOptions(word) : [];
  });

  /**
   * Text typed in the word search.
   */
  protected readonly query = signal('');

  /**
   * First pronunciation of a new word, or new stage of a notebook word.
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
  protected readonly title = computed(() => recordingTitle(this.phase(), !this.targetWord()));

  /**
   * Lapinou's instruction, or the microphone failure.
   */
  protected readonly instruction = computed(
    () => this.error() ?? recordingInstruction(this.phase(), this.canTrim()),
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
   * Clock above the waveform: elapsed out of 15 s while recording, then the kept length to the tenth,
   * out of the whole recording once trimmed.
   */
  protected readonly clock = computed<ClockReading>(() => {
    const limit = formatRecordingClock(RECORDING_MAX_DURATION_MS);
    switch (this.phase()) {
      case 'recording':
        return { value: formatRecordingClock(this.recorder.elapsedMs()), total: limit };
      case 'review':
        return this.reviewClock();
      default:
        return { value: formatRecordingClock(0), total: limit };
    }
  });

  /**
   * Whether the new word's first pronunciation, or the new stage, can be saved.
   */
  protected readonly ready = computed(() => isDraftReady(this.draft()));

  /**
   * Text of the save button.
   */
  protected readonly saveText = computed(() => saveButtonText(this.ready(), !this.targetWord()));

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
    this.forgetRecording();
    this.phase.set('recording');
    try {
      const clip = await this.recorder.record();
      if (clip.blob.size > RECORDING_MAX_BYTES) {
        this.fail('Ce son est trop lourd. Recommence un peu plus court.');
        return;
      }
      this.recorded.set(clip);
      this.setClip(clip);
      this.phase.set('review');
      void this.prepareTrim(clip);
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
   * Keeps the part between the handles as the clip to listen to and save; the whole recording is
   * kept untouched, in its own format.
   */
  protected settleTrim(range: TrimRange): void {
    const recorded = this.recorded();
    const decoded = this.decoded();
    if (!recorded || !decoded) {
      return;
    }
    this.setClip(isWholeClip(range, decoded.durationMs) ? recorded : trimClip(decoded, range));
  }

  /**
   * Undoes the cut: the handles go back to the ends and the whole recording is kept.
   */
  protected undoTrim(): void {
    const decoded = this.decoded();
    if (decoded) {
      this.trim.set({ startMs: 0, endMs: decoded.durationMs });
    }
    this.setClip(this.recorded());
  }

  /**
   * Keeps the clip: to the stages of a preselected word, else to the word search.
   */
  protected keep(): void {
    if (this.tooShort()) {
      return;
    }
    const preselected = this.preselected();
    if (preselected) {
      this.openStages(preselected);
    } else {
      this.phase.set('pick');
    }
  }

  /**
   * A notebook word offers its stages; a new word asks for its first pronunciation.
   */
  protected choose(choice: WordChoice): void {
    if (choice.word) {
      this.openStages(choice.word);
      return;
    }
    this.pending = null;
    this.target.set(choice);
    this.draft.set(emptyDraft());
    this.phase.set('note');
  }

  /**
   * Back to the word search.
   */
  protected changeWord(): void {
    this.pending = null;
    this.target.set(null);
    this.phase.set('pick');
  }

  /**
   * Leaves the note step: back to the stages of a notebook word, or to the search for a new word.
   */
  protected leaveNote(): void {
    const word = this.targetWord();
    if (word) {
      this.openStages(word);
    } else {
      this.changeWord();
    }
  }

  /**
   * Form of a new stage of the chosen word, starting from its current status and today.
   */
  protected noteNewStage(): void {
    const word = this.targetWord();
    if (!word) {
      return;
    }
    this.pending = null;
    this.draft.set(emptyDraft(currentStatus(word)));
    this.phase.set('note');
  }

  /**
   * Files the clip under an existing stage of the chosen word.
   */
  protected async fileUnder(pronunciation: Pronunciation): Promise<void> {
    const clip = this.clip();
    const word = this.targetWord();
    if (!clip || !word || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      await this.wordsApi.addRecording(pronunciation.id, clip.blob, clip.durationMs);
      this.finish('added', word.label, '', word.id);
    } catch (error) {
      this.reportFailure(error, word.label);
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Creates the new word or the new stage, then files the sound under that stage.
   */
  protected async save(): Promise<void> {
    const target = this.target();
    const clip = this.clip();
    if (!target || !clip || !this.ready() || this.saving()) {
      return;
    }
    const word = this.targetWord();
    const request = toPronunciationRequest(this.draft());
    this.saving.set(true);
    try {
      this.pending ??= word
        ? { wordId: word.id, stageId: (await this.wordsApi.addPronunciation(word.id, request)).id }
        : await this.createWord(target.label, request);
      await this.wordsApi.addRecording(this.pending.stageId, clip.blob, clip.durationMs);
      this.finish(word ? 'stage' : 'new', target.label, request.spoken, this.pending.wordId);
      this.pending = null;
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
    this.pending = null;
    this.forgetRecording();
    this.target.set(null);
    this.query.set('');
    this.outcome.set(null);
    this.error.set(null);
    this.phase.set('ready');
  }

  /**
   * Creates a new word with its first stage, which receives the sound.
   */
  private async createWord(
    label: string,
    pronunciation: PronunciationRequest,
  ): Promise<PendingStage> {
    const word = await this.wordsApi.create({ label: label.trim(), pronunciation });
    return { wordId: word.id, stageId: word.pronunciations[0].id };
  }

  /**
   * Offers the stages of a notebook word for the clip.
   */
  private openStages(word: Word): void {
    this.pending = null;
    this.target.set({ label: word.label, category: word.category, word });
    this.phase.set('stage');
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
        this.toasts.show(this.uploadFailure(), 'error');
    }
  }

  /**
   * Why the save failed: nothing kept, or the stage kept without its sound.
   */
  private uploadFailure(): string {
    if (this.pending === null) {
      return "Le son n'a pas pu être enregistré, réessaie.";
    }
    return this.targetWord()
      ? "La prononciation est notée, mais le son n'est pas parti. Réessaie."
      : "Le mot est noté, mais le son n'est pas parti. Réessaie.";
  }

  /**
   * Back to the start with an explanation in the bubble.
   */
  private fail(message: string): void {
    this.error.set(message);
    this.phase.set('ready');
  }

  /**
   * Decodes a fresh recording for the handles, unless another one was recorded meanwhile.
   */
  private async prepareTrim(clip: RecordedClip): Promise<void> {
    const decoded = await decodeClip(clip.blob);
    if (!decoded || this.recorded() !== clip) {
      return;
    }
    this.decoded.set(decoded);
    this.trim.set({ startMs: 0, endMs: decoded.durationMs });
  }

  /**
   * Clock of the listen step: the kept length, and the whole length once trimmed.
   */
  private reviewClock(): ClockReading {
    const trim = this.trim();
    const decoded = this.decoded();
    if (!trim || !decoded) {
      return { value: formatTenthsClock(this.clip()?.durationMs ?? 0), total: null };
    }
    return {
      value: formatTenthsClock(trim.endMs - trim.startMs),
      total: this.trimmed() ? formatTenthsClock(decoded.durationMs) : null,
    };
  }

  /**
   * Drops the recording, its decoding and its trim, before recording again.
   */
  private forgetRecording(): void {
    this.recorded.set(null);
    this.decoded.set(null);
    this.trim.set(null);
    this.setClip(null);
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
