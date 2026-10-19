import { DictionaryEntry } from '@core/dictionary/dictionary.model';
import {
  findQueryRange,
  normalizeForSearch,
  normalizeText,
  rankByQuery,
} from '@core/text/text.utils';
import { CATEGORY_LABELS, LABEL_MAX_LENGTHS } from '@core/words/word.constants';
import { Word } from '@core/words/word.model';
import { entriesOfKind, wordMatchesQuery } from '@core/words/word.utils';

import { WORD_PICKER_MAX_SUGGESTIONS } from './word-picker.constants';
import { WordChoice, WordSuggestion } from './word-picker.model';

/**
 * Every pickable entry: the notebook's words and sentences first, then the dictionary entries the child does
 * not say yet as a word.
 */
export function pickerCandidates(
  entries: readonly DictionaryEntry[],
  words: readonly Word[],
): WordChoice[] {
  const known = new Set(entriesOfKind(words, 'word').map((word) => normalizeText(word.label)));
  return [
    ...words.map((word) => ({ label: word.label, category: word.category, word })),
    ...entries
      .filter((entry) => !known.has(normalizeText(entry.label)))
      .map((entry) => ({ label: entry.label, category: entry.category, word: null })),
  ];
}

/**
 * Bold head and muted tail of a label around the typed text, to highlight the match.
 */
export function splitOnMatch(label: string, query: string): Pick<WordSuggestion, 'head' | 'tail'> {
  const range = findQueryRange(label, query);
  return range
    ? { head: label.slice(0, range.end), tail: label.slice(range.end) }
    : { head: '', tail: label };
}

/**
 * Suggestions for a search: the exact word first, then labels starting with the text, then labels
 * containing it, then notebook words found by one of their spoken forms; at most `max`.
 */
export function buildSuggestions(
  entries: readonly DictionaryEntry[],
  words: readonly Word[],
  query: string,
  max: number = WORD_PICKER_MAX_SUGGESTIONS,
): WordSuggestion[] {
  const needle = normalizeForSearch(query);
  if (needle === '') {
    return [];
  }
  const candidates = pickerCandidates(entries, words);
  const byLabel = rankByQuery(candidates, (candidate) => candidate.label, query);
  const isExact = (candidate: WordChoice): boolean =>
    normalizeForSearch(candidate.label) === needle;
  const exact = byLabel.filter(isExact);
  const others = byLabel.filter((candidate) => !isExact(candidate));
  const bySpoken = candidates.filter(
    (candidate) =>
      candidate.word !== null &&
      !byLabel.includes(candidate) &&
      wordMatchesQuery(candidate.word, query),
  );
  return [...exact, ...others, ...bySpoken]
    .slice(0, max)
    .map((candidate) => ({ ...candidate, ...splitOnMatch(candidate.label, query) }));
}

/**
 * Whether the typed text is longer than the API accepts for a word, so it cannot be offered as one.
 */
export function isTooLongForWord(query: string): boolean {
  return query.trim().length > LABEL_MAX_LENGTHS.word;
}

/**
 * Label to offer as a new word ("ajouter quand même"), `null` when nothing is typed, the text is too
 * long, or the notebook or the dictionary already holds it.
 */
export function newWordOffer(
  entries: readonly DictionaryEntry[],
  words: readonly Word[],
  query: string,
): string | null {
  const label = query.trim();
  if (label === '' || isTooLongForWord(label)) {
    return null;
  }
  const needle = normalizeText(label);
  // A sentence with the same text is no duplicate: the word can still be added.
  const taken = pickerCandidates(entries, words).some(
    (candidate) => candidate.word?.kind !== 'sentence' && normalizeText(candidate.label) === needle,
  );
  return taken ? null : label;
}

/**
 * Spoken name of a suggestion ("lapin, animaux, déjà dit"), since its pills read as one run of text.
 */
export function suggestionName(choice: WordChoice): string {
  const parts = [choice.label, CATEGORY_LABELS[choice.category]];
  if (choice.word) {
    parts.push('déjà dit');
  }
  return parts.join(', ');
}
