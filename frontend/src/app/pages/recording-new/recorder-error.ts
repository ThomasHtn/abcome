import { RecorderErrorKind } from './recording-new.model';

/**
 * Failure of the recorder, carrying why so the screen can explain it.
 */
export class RecorderError extends Error {
  /**
   * What went wrong.
   */
  public readonly kind: RecorderErrorKind;

  /**
   * Builds the error of `kind`.
   */
  constructor(kind: RecorderErrorKind) {
    super(`Recorder failed: ${kind}`);
    this.name = 'RecorderError';
    this.kind = kind;
  }
}
