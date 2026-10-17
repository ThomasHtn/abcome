import { normalizeText } from '@core/text/text.utils';
import { Word } from '@core/words/word.model';

import { FREQUENT_SHORTCUT_COUNT } from './dictionary.constants';
import { DictionaryEntry } from './dictionary.model';

/**
 * Shortcuts of the add-word screen: the first `frequent` entries in API order (earliest acquired first)
 * that Côme does not say yet, so a tap never leads to a duplicate.
 */
export function frequentShortcuts(
  entries: readonly DictionaryEntry[],
  words: readonly Word[],
  count: number = FREQUENT_SHORTCUT_COUNT,
): DictionaryEntry[] {
  const known = new Set(words.map((word) => normalizeText(word.label)));
  return entries
    .filter((entry) => entry.frequent && !known.has(normalizeText(entry.label)))
    .slice(0, count);
}
