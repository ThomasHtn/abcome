import { WordSheet } from './word-detail.model';

/**
 * Confirmation sheets: they cannot show an error inside, so a failure closes them before its toast.
 */
export const CONFIRM_SHEETS: readonly WordSheet[] = [
  'remove-stage',
  'last-stage',
  'delete',
  'remove-sound',
];

/**
 * Beyond this many characters, the word's title takes the smaller "long" size.
 */
export const LONG_TITLE_LENGTH = 12;

/**
 * Beyond this many characters, the word's title takes the smallest size.
 */
export const VERY_LONG_TITLE_LENGTH = 22;
