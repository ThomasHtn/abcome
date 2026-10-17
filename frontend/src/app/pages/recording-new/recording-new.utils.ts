import { quote } from '@core/text/text.utils';

import { LEVEL_BAR_COUNT, LEVEL_GAIN } from './recording-new.constants';
import { DoneCopy, RecorderErrorKind, RecordingPhase, SaveOutcome } from './recording-new.model';

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
  return 'failed';
}

/**
 * Lapinou's instruction for each recording step.
 */
export function recordingInstruction(phase: RecordingPhase): string {
  switch (phase) {
    case 'recording':
      return "J'écoute… Touche le carré rouge quand il a fini.";
    case 'review':
      return 'Écoute le son. Pas réussi ? Recommence autant que tu veux.';
    default:
      return 'Prêt ? Touche le micro quand Côme commence à parler.';
  }
}

/**
 * Title of the screen at each step.
 */
export function recordingTitle(phase: RecordingPhase): string {
  switch (phase) {
    case 'pick':
      return 'Associer le son';
    case 'note':
      return 'Nouveau mot';
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
  return {
    title: `Son ajouté à ${quote(outcome.label)}\u00A0!`,
    text:
      outcome.soundCount > 1
        ? `Il a maintenant ${outcome.soundCount} sons. Tu les retrouves sur sa page.`
        : 'Tu le retrouves sur sa page.',
  };
}

/**
 * Text of the save button of a new word: what to do first, then the creation.
 */
export function saveButtonText(ready: boolean): string {
  return ready ? 'Enregistrer le mot' : "Note d'abord ce qu'il dit";
}
