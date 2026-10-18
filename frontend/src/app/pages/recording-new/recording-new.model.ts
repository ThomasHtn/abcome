import { Pronunciation } from '@core/words/word.model';

/**
 * Steps of the record screen: record, listen, pick the word, pick the stage of an existing word, note a
 * new word's first pronunciation or a new stage, done.
 */
export type RecordingPhase = 'ready' | 'recording' | 'review' | 'pick' | 'stage' | 'note' | 'done';

/**
 * Why the microphone could not record: no recorder in this browser, access refused, no microphone,
 * or anything else.
 */
export type RecorderErrorKind = 'unsupported' | 'denied' | 'missing' | 'failed';

/**
 * A finished recording.
 */
export interface RecordedClip {
  /**
   * The audio, typed with the format the browser recorded.
   */
  blob: Blob;

  /**
   * Its length, 1 to 15 000 ms.
   */
  durationMs: number;

  /**
   * Loudness sampled while recording, 0 to 1, oldest first; drawn as the clip's bars.
   */
  levels: number[];
}

/**
 * What a save did, for the closing screen: a new word with its first sound, a sound filed under an
 * existing stage, or a new stage of an existing word with its sound.
 */
export type SaveKind = 'new' | 'added' | 'stage';

/**
 * Stage created by a save, kept while its sound is not uploaded yet.
 */
export interface PendingStage {
  /**
   * Its word, for the closing screen.
   */
  wordId: number;

  /**
   * The stage receiving the sound.
   */
  stageId: number;
}

/**
 * One stage offered for the sound, ready to draw.
 */
export interface StageOption {
  /**
   * The stage itself.
   */
  pronunciation: Pronunciation;

  /**
   * Line under the spoken form ("Maintenant · 12 oct. 2026").
   */
  caption: string;

  /**
   * Screen reader name of its button: what, how well, when.
   */
  ariaLabel: string;
}

/**
 * Result of a save, shown on the closing screen.
 */
export interface SaveOutcome {
  /**
   * What the save did.
   */
  kind: SaveKind;

  /**
   * The word, for the titles.
   */
  label: string;

  /**
   * What Côme says, for a new word or stage; empty when the sound joined an existing stage.
   */
  spoken: string;

  /**
   * Number of sounds the word has now.
   */
  soundCount: number;

  /**
   * The word's page.
   */
  wordId: number;
}

/**
 * Wording of the closing screen.
 */
export interface DoneCopy {
  /**
   * Big sentence ("« lapin » est dans ses mots !").
   */
  title: string;

  /**
   * Explanation under it.
   */
  text: string;
}
