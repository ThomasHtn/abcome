import { PronunciationRequest } from '@core/words/word.model';

/**
 * A sound kept on this device because its save could not reach the server, sent again later.
 */
export interface QueuedSound {
  /**
   * Key in the browser database, set once stored.
   */
  key?: number;

  /**
   * The recorded audio, already trimmed.
   */
  audio: Blob;

  /**
   * Its length, as the upload reports it.
   */
  durationMs: number;

  /**
   * The word it belongs to, for the toasts.
   */
  label: string;

  /**
   * Where it goes, as far as its save got.
   */
  target: OutboxTarget;
}

/**
 * Where a kept sound goes: each step done (word created, stage created) brings it closer to a stage.
 */
export type OutboxTarget = StageTarget | NewStageTarget | NewWordTarget;

/**
 * A stage that already exists: only the upload is left.
 */
export interface StageTarget {
  /**
   * Kind of target.
   */
  kind: 'stage';

  /**
   * The stage receiving the sound.
   */
  stageId: number;
}

/**
 * A new stage of an existing word, created before the upload.
 */
export interface NewStageTarget {
  /**
   * Kind of target.
   */
  kind: 'new-stage';

  /**
   * The word receiving the stage.
   */
  wordId: number;

  /**
   * The stage to create.
   */
  stage: PronunciationRequest;
}

/**
 * A word not in the notebook yet, created with its first stage before the upload.
 */
export interface NewWordTarget {
  /**
   * Kind of target.
   */
  kind: 'new-word';

  /**
   * The word to create.
   */
  label: string;

  /**
   * Its first stage.
   */
  stage: PronunciationRequest;
}
