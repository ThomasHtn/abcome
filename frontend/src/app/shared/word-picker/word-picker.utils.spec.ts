import { DictionaryEntry } from '@core/dictionary/dictionary.model';
import { LABEL_MAX_LENGTHS } from '@core/words/word.constants';
import { aPronunciation, aWord } from '@core/words/word.fixtures';

import {
  buildSuggestions,
  isTooLongForWord,
  newWordOffer,
  pickerCandidates,
  splitOnMatch,
  suggestionName,
} from './word-picker.utils';

/**
 * Dictionary entry of the given label, `animals` by default.
 */
function entry(label: string, overrides: Partial<DictionaryEntry> = {}): DictionaryEntry {
  return { label, category: 'animals', frequent: false, ...overrides };
}

describe('word picker utils', () => {
  const lapin = aWord({ id: 1, label: 'lapin' });
  const entries = [entry('lapin'), entry('lait', { category: 'food_drink' }), entry('salade')];

  it('lists the notebook words first, then the dictionary words not said yet', () => {
    const labels = pickerCandidates(entries, [lapin]).map((candidate) => candidate.label);
    expect(labels).toEqual(['lapin', 'lait', 'salade']);
  });

  it('splits a label around the typed text, ignoring case and accents', () => {
    expect(splitOnMatch('gâteau', 'GA')).toEqual({ head: 'gâ', tail: 'teau' });
    expect(splitOnMatch('balle', 'al')).toEqual({ head: 'bal', tail: 'le' });
    expect(splitOnMatch('chat', 'zz')).toEqual({ head: '', tail: 'chat' });
    expect(splitOnMatch('sœur', 'soe')).toEqual({ head: 'sœ', tail: 'ur' });
  });

  it('finds a label written with an apostrophe without typing it', () => {
    const polite = entry("s'il te plaît");
    const [first] = buildSuggestions([polite], [], 'sil te');
    expect(first?.label).toBe("s'il te plaît");
    expect(first?.head).toBe("s'il te");
  });

  it('suggests labels starting with the text before those containing it', () => {
    const labels = buildSuggestions(entries, [lapin], 'la').map((suggestion) => suggestion.label);
    expect(labels).toEqual(['lapin', 'lait', 'salade']);
  });

  it('puts the exact word first and flags a word the child already says', () => {
    const suggestions = buildSuggestions([entry('chaton'), entry('chat')], [], 'chat').map(
      (suggestion) => suggestion.label,
    );
    expect(suggestions).toEqual(['chat', 'chaton']);
    expect(buildSuggestions(entries, [lapin], 'lap')[0].word).toBe(lapin);
  });

  it('finds a notebook word by what the child says', () => {
    const gateau = aWord({
      id: 2,
      label: 'gâteau',
      pronunciations: [aPronunciation({ id: 20, wordId: 2, spoken: 'tato' })],
    });
    expect(buildSuggestions([], [gateau], 'tato').map((suggestion) => suggestion.label)).toEqual([
      'gâteau',
    ]);
  });

  it('suggests nothing for an empty search and caps the list', () => {
    expect(buildSuggestions(entries, [], '  ')).toEqual([]);
    const many = Array.from({ length: 10 }, (_, index) => entry(`la${index}`));
    expect(buildSuggestions(many, [], 'la')).toHaveLength(6);
  });

  it('offers a new word only when nobody knows it yet', () => {
    expect(newWordOffer(entries, [lapin], ' Lulu ')).toBe('Lulu');
    expect(newWordOffer(entries, [lapin], 'LAPIN')).toBeNull();
    expect(newWordOffer(entries, [], 'lait')).toBeNull();
    expect(newWordOffer(entries, [], '')).toBeNull();
    expect(newWordOffer(entries, [], 'x'.repeat(LABEL_MAX_LENGTHS.word + 1))).toBeNull();
  });

  it('tells a text too long to be a word, spaces around it ignored', () => {
    expect(isTooLongForWord(` ${'x'.repeat(LABEL_MAX_LENGTHS.word)} `)).toBe(false);
    expect(isTooLongForWord('x'.repeat(LABEL_MAX_LENGTHS.word + 1))).toBe(true);
  });

  it('names a suggestion for screen readers with its category and status', () => {
    expect(suggestionName({ label: 'lapin', category: 'animals', word: lapin })).toBe(
      'lapin, animaux, déjà dit',
    );
    expect(suggestionName({ label: 'lait', category: 'food_drink', word: null })).toBe(
      'lait, à manger et à boire',
    );
  });
});
