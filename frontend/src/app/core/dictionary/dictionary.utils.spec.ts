import { aWord } from '@core/words/word.fixtures';

import { DictionaryEntry } from './dictionary.model';
import { frequentShortcuts } from './dictionary.utils';

/**
 * Builds an entry; only the label and the frequent flag matter here.
 */
function entry(label: string, frequent = true): DictionaryEntry {
  return { label, category: 'people', frequent };
}

describe('frequentShortcuts', () => {
  /**
   * Entries in API order: earliest acquired first.
   */
  const entries = [
    entry('maman'),
    entry('papa'),
    entry('miam', false),
    entry('bébé'),
    entry('encore'),
    entry('non'),
    entry('ballon'),
    entry('pomme'),
    entry('chien'),
    entry('bain'),
    entry('coucou'),
  ];

  it('keeps the first eight frequent entries in API order', () => {
    expect(frequentShortcuts(entries, []).map((shortcut) => shortcut.label)).toEqual([
      'maman',
      'papa',
      'bébé',
      'encore',
      'non',
      'ballon',
      'pomme',
      'chien',
    ]);
  });

  it('skips words already in the notebook, whatever their case and accents', () => {
    const words = [aWord({ id: 1, label: 'Maman' }), aWord({ id: 2, label: 'bebe' })];

    const labels = frequentShortcuts(entries, words).map((shortcut) => shortcut.label);

    expect(labels).not.toContain('maman');
    expect(labels).not.toContain('bébé');
    expect(labels).toHaveLength(8);
    expect(labels.at(-1)).toBe('coucou');
  });
});
