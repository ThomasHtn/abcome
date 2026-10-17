/**
 * Steps of the record screen: record, listen, pick the word, note a new word's first pronunciation,
 * done.
 */
export type RecordingPhase = 'ready' | 'recording' | 'review' | 'pick' | 'note' | 'done';

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
 * What a save did, for the closing screen: a new word with its first sound, or a sound added to the
 * gallery of an existing word.
 */
export type SaveKind = 'new' | 'added';

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
   * What Côme says, for a new word; empty when the sound joined an existing word.
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
