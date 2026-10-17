import { Sentence } from '@core/sentences/sentence.model';
import { aPronunciation, aWord } from '@core/words/word.fixtures';

import {
  countWithNoun,
  emptySentencesMessage,
  emptyWordsMessage,
  listState,
  sentencesSummary,
  tabFromParam,
  toSentenceCard,
  toWordCard,
  visibleSentences,
  visibleWords,
  wordsSummary,
} from './home.utils';

/**
 * "lapin": "pin" in September, then "apin" in October.
 */
const LAPIN = aWord({
  id: 1,
  label: 'lapin',
  pronunciations: [
    aPronunciation({ id: 10, wordId: 1, spoken: 'pin', status: 'learning', date: '2026-09-16' }),
    aPronunciation({ id: 11, wordId: 1, spoken: 'apin', status: 'almost', date: '2026-10-12' }),
  ],
});

/**
 * "gâteau", said once, later than "lapin" was first said.
 */
const GATEAU = aWord({
  id: 2,
  label: 'gâteau',
  pronunciations: [
    aPronunciation({ id: 20, wordId: 2, spoken: 'tato', status: 'learning', date: '2026-10-05' }),
  ],
});

/**
 * "maman", mastered.
 */
const MAMAN = aWord({
  id: 3,
  label: 'maman',
  pronunciations: [
    aPronunciation({ id: 30, wordId: 3, spoken: 'maman', status: 'mastered', date: '2026-08-30' }),
  ],
});

/**
 * Two sentences, one with its meaning.
 */
const SENTENCES: Sentence[] = [
  { id: 1, spoken: 'papa pati', meaning: 'Papa est parti', date: '2026-10-09' },
  { id: 2, spoken: 'a pu ato', meaning: null, date: '2026-10-14' },
];

describe('tabFromParam', () => {
  it('opens the sentences only for "phrases"', () => {
    expect(tabFromParam('phrases')).toBe('sentences');
    expect(tabFromParam(undefined)).toBe('words');
    expect(tabFromParam('mots')).toBe('words');
  });
});

describe('countWithNoun', () => {
  it('agrees the noun in number', () => {
    expect(countWithNoun(0, 'mot')).toBe('0 mot');
    expect(countWithNoun(1, 'mot')).toBe('1 mot');
    expect(countWithNoun(3, 'phrase')).toBe('3 phrases');
  });
});

describe('visibleWords', () => {
  it('lists the newest first-said word first', () => {
    expect(visibleWords([MAMAN, LAPIN, GATEAU], '', 'all').map((word) => word.id)).toEqual([
      2, 1, 3,
    ]);
  });

  it('filters on the current status only', () => {
    expect(visibleWords([LAPIN, GATEAU], '', 'learning')).toEqual([GATEAU]);
    expect(visibleWords([LAPIN, GATEAU], '', 'almost')).toEqual([LAPIN]);
  });

  it('searches the word and every spoken form, ignoring accents', () => {
    expect(visibleWords([LAPIN, GATEAU], 'gateau', 'all')).toEqual([GATEAU]);
    expect(visibleWords([LAPIN, GATEAU], 'PIN', 'all')).toEqual([LAPIN]);
  });
});

describe('toWordCard', () => {
  it('shows the first date, the current form and every stage', () => {
    const card = toWordCard(LAPIN);
    expect(card).toMatchObject({
      label: 'lapin',
      spoken: 'apin',
      status: 'almost',
      day: '16',
      month: 'sept',
      stageStatuses: ['learning', 'almost'],
    });
    expect(card.ariaLabel).toBe(
      'apin, pour lapin, Presque, depuis le 16 septembre 2026. Voir sa page',
    );
  });

  it('draws no stage dots for a word said once', () => {
    expect(toWordCard(GATEAU).stageStatuses).toEqual([]);
  });
});

describe('visibleSentences and toSentenceCard', () => {
  it('lists the newest sentence first and searches the meaning too', () => {
    expect(visibleSentences(SENTENCES, '').map((sentence) => sentence.id)).toEqual([2, 1]);
    expect(visibleSentences(SENTENCES, 'parti').map((sentence) => sentence.id)).toEqual([1]);
  });

  it('reads the meaning only when there is one', () => {
    expect(toSentenceCard(SENTENCES[0]).ariaLabel).toBe(
      '«\u00A0papa pati\u00A0», Papa est parti, le 9 octobre 2026. Modifier',
    );
    expect(toSentenceCard(SENTENCES[1]).ariaLabel).toBe(
      '«\u00A0a pu ato\u00A0», le 14 octobre 2026. Modifier',
    );
  });
});

describe('summaries', () => {
  it('counts words per current status and quotes the newest one', () => {
    const summary = wordsSummary([MAMAN, LAPIN, GATEAU]);
    expect(summary.countText).toBe('3 mots');
    expect(summary.latest).toBe('tato');
    expect(summary.statusCounts?.map((count) => count.label)).toEqual([
      '1 Bien dit',
      '1 Presque',
      '1 En route',
    ]);
  });

  it('has nothing to quote in an empty notebook', () => {
    expect(wordsSummary([])).toMatchObject({
      total: 0,
      latest: null,
      emptyHeadline: 'Le carnet attend son premier mot !',
      statusCounts: null,
    });
    expect(sentencesSummary([]).latest).toBeNull();
  });

  it('quotes the newest sentence', () => {
    expect(sentencesSummary(SENTENCES)).toMatchObject({
      countText: '2 phrases',
      latestLabel: 'Dernière',
      latest: 'a pu ato',
      statusCounts: null,
    });
  });
});

describe('empty messages', () => {
  it('names the search and the color', () => {
    expect(emptyWordsMessage(' chien ', 'all', 3)).toBe(
      "Côme n'a pas encore dit «\u00A0chien\u00A0».",
    );
    expect(emptyWordsMessage('chien', 'mastered', 3)).toBe(
      "Côme n'a pas encore dit «\u00A0chien\u00A0» dans cette couleur.",
    );
  });

  it('tells an empty notebook from an empty color', () => {
    expect(emptyWordsMessage('', 'all', 0)).toBe('Pas encore de mot. Le premier arrive bientôt !');
    expect(emptyWordsMessage('', 'mastered', 3)).toBe(
      "Aucun mot dans cette couleur pour l'instant.",
    );
  });

  it('explains an empty sentence list', () => {
    expect(emptySentencesMessage('')).toBe('Pas encore de phrase. La première arrive bientôt !');
    expect(emptySentencesMessage('lolo')).toBe('Aucune phrase ne contient «\u00A0lolo\u00A0».');
  });
});

describe('listState', () => {
  /**
   * Minimal resource with only what `listState` reads.
   */
  function resource(hasValue: boolean, error?: Error): Parameters<typeof listState>[0] {
    return { hasValue: () => hasValue, error: () => error } as Parameters<typeof listState>[0];
  }

  it('is ready once a value exists, even after a failed reload', () => {
    expect(listState(resource(true, new Error('offline')))).toBe('ready');
  });

  it('tells a failure from a first load', () => {
    expect(listState(resource(false, new Error('offline')))).toBe('error');
    expect(listState(resource(false))).toBe('loading');
  });
});
