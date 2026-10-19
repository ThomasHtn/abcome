import { translate } from '@jsverse/transloco';

import { formatLongDate, formatShortDateWithYear } from '@core/date/date.utils';
import { activeLocale, isSingular } from '@core/i18n/i18n.utils';
import { RECORDING_MAX_DURATION_MS, TRIM_SAMPLE_RATE } from '@core/recordings/recording.constants';
import { encodeWav, waveformLevels } from '@core/recordings/recording.utils';
import { quote } from '@core/text/text.utils';
import { Word } from '@core/words/word.model';
import { sortPronunciations, statusLabel } from '@core/words/word.utils';

import { LEVEL_BAR_COUNT, LEVEL_GAIN, MIN_KEEP_MS, TRIM_FADE_MS } from './recording-new.constants';
import {
  DecodedClip,
  DoneCopy,
  RecordedClip,
  RecorderErrorKind,
  RecordingPhase,
  SaveOutcome,
  StageOption,
  TrimEdge,
  TrimRange,
} from './recording-new.model';

/**
 * Loudness of one analyser frame, 0 to 1: the root mean square of the wave around its silent middle
 * (128), amplified so speech fills the bars.
 */
export function rmsLevel(frame: Uint8Array): number {
  if (frame.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const value of frame) {
    const centered = (value - 128) / 128;
    sum += centered * centered;
  }
  return Math.min(1, Math.sqrt(sum / frame.length) * LEVEL_GAIN);
}

/**
 * The last `count` levels for the live waveform, padded with silence on the left while it fills.
 */
export function liveBars(levels: readonly number[], count: number = LEVEL_BAR_COUNT): number[] {
  const last = levels.slice(-count);
  return [...Array<number>(count - last.length).fill(0), ...last];
}

/**
 * The whole recording in `count` bars, each the loudest sample of its slice; silence when empty.
 */
export function summarizeLevels(
  levels: readonly number[],
  count: number = LEVEL_BAR_COUNT,
): number[] {
  if (levels.length === 0) {
    return Array<number>(count).fill(0);
  }
  return Array.from({ length: count }, (_, bar) => {
    const start = Math.floor((bar * levels.length) / count);
    const end = Math.max(start + 1, Math.floor(((bar + 1) * levels.length) / count));
    return Math.max(...levels.slice(start, end));
  });
}

/**
 * Kind of a microphone failure from the error `getUserMedia` threw.
 */
export function microphoneErrorKind(error: unknown): RecorderErrorKind {
  const name = error instanceof Error || error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'denied';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'missing';
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return 'busy';
  }
  return 'failed';
}

/**
 * Lapinou's instruction for each recording step; `capped` explains a recording stopped by the 15 s cap.
 */
export function recordingInstruction(
  phase: RecordingPhase,
  capped: boolean,
  childName: string,
): string {
  switch (phase) {
    case 'recording':
      return translate('recordingNew.instruction.recording');
    case 'review':
      return capped
        ? translate('recordingNew.instruction.capped')
        : translate('recordingNew.instruction.review');
    default:
      return translate('recordingNew.instruction.ready', { childName });
  }
}

/**
 * Title of the screen at each step; the note step names what it notes, a word or one of its stages.
 */
export function recordingTitle(phase: RecordingPhase, newWord: boolean): string {
  switch (phase) {
    case 'pick':
    case 'stage':
      return translate('recordingNew.title.pick');
    case 'note':
      return newWord
        ? translate('recordingNew.title.newWord')
        : translate('recordingNew.title.newStage');
    case 'done':
      return translate('recordingNew.title.done');
    default:
      return translate('recordingNew.title.record');
  }
}

/**
 * Title and sentence of the closing screen.
 */
export function doneCopy(outcome: SaveOutcome, childName: string): DoneCopy {
  if (outcome.kind === 'new') {
    return {
      title: translate('recordingNew.done.newTitle', { label: quote(outcome.label) }),
      text: translate('recordingNew.done.newText', { childName, spoken: quote(outcome.spoken) }),
    };
  }
  if (outcome.kind === 'stage') {
    return {
      title: translate('recordingNew.done.stageTitle', { label: quote(outcome.label) }),
      text: translate('recordingNew.done.stageText', { childName, spoken: quote(outcome.spoken) }),
    };
  }
  return {
    title: translate('recordingNew.done.soundTitle', { label: quote(outcome.label) }),
    text:
      outcome.soundCount > 1
        ? translate('recordingNew.done.soundsText', { count: outcome.soundCount })
        : translate('recordingNew.done.soundText'),
  };
}

/**
 * Text of the save button of a new word or stage: what to do first, then the creation.
 */
export function saveButtonText(ready: boolean, newWord: boolean): string {
  if (!ready) {
    return translate('recordingNew.save.notReady');
  }
  return newWord ? translate('recordingNew.save.word') : translate('recordingNew.save.stage');
}

/**
 * Stages of a word offered for the sound, newest first, the current one first and titled so.
 */
export function stageOptions(word: Word): StageOption[] {
  const stages = sortPronunciations(word.pronunciations);
  return stages
    .map((pronunciation, index) => {
      const date = formatShortDateWithYear(pronunciation.date);
      return {
        pronunciation,
        caption: index === stages.length - 1 ? translate('recordingNew.stage.now', { date }) : date,
        ariaLabel: translate('recordingNew.stage.ariaLabel', {
          spoken: pronunciation.spoken,
          status: statusLabel(pronunciation.status),
          date: formatLongDate(pronunciation.date),
        }),
      };
    })
    .reverse();
}

/**
 * Decodes a fresh recording to mono samples so it can be trimmed; `null` where the browser cannot.
 * Cut at the API's longest sound: the recorder stops a few ms late, and a trim must stay accepted.
 */
export async function decodeClip(blob: Blob): Promise<DecodedClip | null> {
  if (typeof OfflineAudioContext === 'undefined') {
    return null;
  }
  try {
    const context = new OfflineAudioContext(1, 1, TRIM_SAMPLE_RATE);
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    const maxSamples = Math.floor((RECORDING_MAX_DURATION_MS / 1000) * audio.sampleRate);
    const samples = audio.getChannelData(0).subarray(0, maxSamples);
    return {
      samples,
      sampleRate: audio.sampleRate,
      durationMs: (samples.length / audio.sampleRate) * 1000,
    };
  } catch {
    return null;
  }
}

/**
 * The kept part with one edge moved to `ms`, never shorter than a keepable sound nor past the clip,
 * rounded to the hundredth of a second.
 */
export function moveTrimEdge(
  range: TrimRange,
  edge: TrimEdge,
  ms: number,
  durationMs: number,
): TrimRange {
  const rounded = Math.round(ms / 10) * 10;
  return edge === 'start'
    ? { ...range, startMs: clamp(rounded, 0, range.endMs - MIN_KEEP_MS) }
    : { ...range, endMs: clamp(rounded, range.startMs + MIN_KEEP_MS, durationMs) };
}

/**
 * Whether the kept part is the whole clip, so the recording can be sent untouched.
 */
export function isWholeClip(range: TrimRange, durationMs: number): boolean {
  return range.startMs <= 0 && range.endMs >= durationMs;
}

/**
 * The kept part as a new WAV clip, faded in and out at the cuts, with its own waveform.
 */
export function trimClip(decoded: DecodedClip, range: TrimRange): RecordedClip {
  const toSample = (ms: number) => Math.round((ms / 1000) * decoded.sampleRate);
  const samples = decoded.samples.slice(toSample(range.startMs), toSample(range.endMs));
  fadeEdges(samples, toSample(TRIM_FADE_MS));
  return {
    blob: encodeWav(samples, decoded.sampleRate),
    durationMs: Math.round(range.endMs - range.startMs),
    levels: waveformLevels(samples, LEVEL_BAR_COUNT),
  };
}

/**
 * Ramps the first and last `length` samples from silence, in place.
 */
function fadeEdges(samples: Float32Array, length: number): void {
  const ramp = Math.min(length, Math.floor(samples.length / 2));
  for (let index = 0; index < ramp; index++) {
    const gain = index / ramp;
    samples[index] *= gain;
    samples[samples.length - 1 - index] *= gain;
  }
}

/**
 * `value` kept between `min` and `max`.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * A handle's position read aloud ("1,4 seconde", "2 secondes"), to the tenth.
 */
export function spokenSeconds(ms: number): string {
  const seconds = Math.round(ms / 100) / 10;
  const text = seconds.toLocaleString(activeLocale(), { maximumFractionDigits: 1 });
  return isSingular(seconds)
    ? translate('recordingNew.trim.secondOne', { seconds: text })
    : translate('recordingNew.trim.secondOther', { seconds: text });
}
