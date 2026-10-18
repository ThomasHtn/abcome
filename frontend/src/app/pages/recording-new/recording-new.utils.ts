import { formatLongDate, formatShortDateWithYear } from '@core/date/date.utils';
import { RECORDING_MAX_DURATION_MS, TRIM_SAMPLE_RATE } from '@core/recordings/recording.constants';
import { encodeWav, waveformLevels } from '@core/recordings/recording.utils';
import { quote } from '@core/text/text.utils';
import { STATUS_LABELS } from '@core/words/word.constants';
import { Word } from '@core/words/word.model';
import { sortPronunciations } from '@core/words/word.utils';

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
export function recordingInstruction(phase: RecordingPhase, capped: boolean): string {
  switch (phase) {
    case 'recording':
      return "J'écoute… Touche le carré rouge quand il a fini.";
    case 'review':
      return capped
        ? "15 secondes, c'est le maximum\u00A0: l'enregistrement s'est arrêté tout seul."
        : 'Écoute le son. Pas réussi\u00A0? Recommence autant que tu veux.';
    default:
      return 'Prêt ? Touche le micro quand Côme commence à parler.';
  }
}

/**
 * Title of the screen at each step; the note step names what it notes, a word or one of its stages.
 */
export function recordingTitle(phase: RecordingPhase, newWord: boolean): string {
  switch (phase) {
    case 'pick':
    case 'stage':
      return 'Associer le son';
    case 'note':
      return newWord ? 'Nouveau mot' : 'Nouvelle prononciation';
    case 'done':
      return "C'est fait";
    default:
      return 'Enregistrer un son';
  }
}

/**
 * Title and sentence of the closing screen.
 */
export function doneCopy(outcome: SaveOutcome): DoneCopy {
  if (outcome.kind === 'new') {
    return {
      title: `${quote(outcome.label)} est dans ses mots\u00A0!`,
      text: `Côme le dit ${quote(outcome.spoken)}. Son premier son t'attend sur sa page.`,
    };
  }
  if (outcome.kind === 'stage') {
    return {
      title: `Nouvelle prononciation de ${quote(outcome.label)}\u00A0!`,
      text: `Côme le dit ${quote(outcome.spoken)}. Le son l'accompagne sur sa page.`,
    };
  }
  return {
    title: `Son ajouté à ${quote(outcome.label)}\u00A0!`,
    text:
      outcome.soundCount > 1
        ? `Il a maintenant ${outcome.soundCount} sons. Tu les retrouves sur sa page.`
        : 'Tu le retrouves sur sa page.',
  };
}

/**
 * Text of the save button of a new word or stage: what to do first, then the creation.
 */
export function saveButtonText(ready: boolean, newWord: boolean): string {
  if (!ready) {
    return "Note d'abord ce qu'il dit";
  }
  return newWord ? 'Enregistrer le mot' : 'Enregistrer la prononciation';
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
        caption: index === stages.length - 1 ? `Maintenant · ${date}` : date,
        ariaLabel:
          `${pronunciation.spoken}, ${STATUS_LABELS[pronunciation.status]}, ` +
          `le ${formatLongDate(pronunciation.date)}`,
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
  const text = seconds.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  return `${text} ${seconds < 2 ? 'seconde' : 'secondes'}`;
}
