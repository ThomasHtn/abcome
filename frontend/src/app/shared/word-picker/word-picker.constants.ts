import { LABEL_MAX_LENGTHS } from '@core/words/word.constants';

/**
 * Longest suggestion list, so it fits above the keyboard.
 */
export const WORD_PICKER_MAX_SUGGESTIONS = 6;

/**
 * Notebook words listed before anything is typed, most recent first; the search finds the others.
 */
export const WORD_PICKER_RECENT_COUNT = 12;

/**
 * Said where the "ajouter quand même" offer would be, when the typed text is too long to be a word.
 */
export const WORD_TOO_LONG_MESSAGE = `Un mot fait ${LABEL_MAX_LENGTHS.word} caractères au plus.`;
