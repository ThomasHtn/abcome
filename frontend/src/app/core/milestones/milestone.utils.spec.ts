import { aPronunciation, aWord } from '@core/words/word.fixtures';
import { Word } from '@core/words/word.model';

import {
  markerLabel,
  milestonesOf,
  milestoneStory,
  milestoneWhen,
  nextWordStep,
  wordSteps,
} from './milestone.utils';

/**
 * `count` words, the Nth first said on the Nth day after September 1st 2026, all "En route".
 */
function someWords(count: number): Word[] {
  return Array.from({ length: count }, (_, index) =>
    aWord({
      id: index + 1,
      label: `mot${index + 1}`,
      pronunciations: [
        aPronunciation({
          id: 1000 + index,
          status: 'learning',
          date: new Date(Date.UTC(2026, 8, 1 + index)).toISOString().slice(0, 10),
        }),
      ],
    }),
  );
}

describe('milestone steps', () => {
  it('celebrates 10, 50 and 100 words, then every 50', () => {
    expect(wordSteps(9)).toEqual([]);
    expect(wordSteps(10)).toEqual([10]);
    expect(wordSteps(149)).toEqual([10, 50, 100]);
    expect(wordSteps(210)).toEqual([10, 50, 100, 150, 200]);
  });

  it('names the next step after a count', () => {
    expect(nextWordStep(10)).toBe(50);
    expect(nextWordStep(50)).toBe(100);
    expect(nextWordStep(100)).toBe(150);
    expect(nextWordStep(150)).toBe(200);
  });
});

describe('milestonesOf', () => {
  it('gives each count to the word that reached it, in the order first said', () => {
    const words = someWords(12).reverse();

    const [ten] = milestonesOf(words);

    expect(ten).toMatchObject({ key: 'words-10', kind: 'words', count: 10, date: '2026-09-10' });
    expect(ten.entry.label).toBe('mot10');
  });

  it('finds the first stage said well, even on a word noted later', () => {
    const late = aWord({
      id: 50,
      label: 'maman',
      pronunciations: [
        aPronunciation({ id: 1, status: 'learning', date: '2026-08-01' }),
        aPronunciation({ id: 2, status: 'mastered', date: '2026-09-03' }),
      ],
    });
    const other = aWord({
      id: 51,
      label: 'papa',
      pronunciations: [aPronunciation({ id: 3, status: 'mastered', date: '2026-09-05' })],
    });

    const milestones = milestonesOf([other, late]);

    expect(milestones.map((milestone) => milestone.key)).toEqual(['first-mastered']);
    expect(milestones[0]).toMatchObject({ date: '2026-09-03' });
    expect(milestones[0].entry.label).toBe('maman');
  });

  it('marks the first sentence and never counts sentences as words', () => {
    const sentence = aWord({
      id: 60,
      kind: 'sentence',
      label: 'Encore gâteau',
      pronunciations: [aPronunciation({ id: 4, date: '2026-09-20' })],
    });

    const milestones = milestonesOf([...someWords(9), sentence]);

    expect(milestones.map((milestone) => milestone.key)).toEqual(['first-sentence']);
  });

  it('lists the milestones oldest first', () => {
    const sentence = aWord({
      id: 60,
      kind: 'sentence',
      label: 'Encore',
      pronunciations: [aPronunciation({ id: 4, date: '2026-09-02' })],
    });

    const keys = milestonesOf([...someWords(10), sentence]).map((milestone) => milestone.key);

    expect(keys).toEqual(['first-sentence', 'words-10']);
  });
});

describe('milestone wording', () => {
  const [ten] = milestonesOf(someWords(10));

  it('says when by the age once the birth date is known, else by the day', () => {
    expect(milestoneWhen(ten, '2025-05-12', 2026)).toBe('à 15 mois');
    expect(milestoneWhen(ten, null, 2026)).toBe('le 10 septembre');
    expect(milestoneWhen(ten, null, 2027)).toBe('le 10 septembre 2026');
  });

  it('labels the list marker with the step and when', () => {
    expect(markerLabel(ten, '2025-05-12', 2026)).toBe('10 mots, à 15 mois');
  });

  it('tells the story around the entry that reached it', () => {
    expect(milestoneStory(ten, 'Alix', 'à 15 mois')).toEqual({
      before: 'Avec ',
      entry: '« mot10 »',
      after: ', Alix passe le cap des 10 mots, à 15 mois.',
    });
  });
});
