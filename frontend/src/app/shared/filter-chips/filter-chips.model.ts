import { PronunciationStatus } from '@core/words/word.model';

/**
 * One chip of a filter row.
 */
export interface FilterChipOption<T extends string> {
  /**
   * Value the chip selects.
   */
  value: T;

  /**
   * French text of the chip.
   */
  label: string;

  /**
   * Ground of the chip: `neutral` ink ("Tous"), or a status' own tint.
   */
  tone: 'neutral' | PronunciationStatus;
}
