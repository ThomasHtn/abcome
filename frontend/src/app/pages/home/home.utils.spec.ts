import { aPronunciation, aWord } from '@core/words/word.fixtures';

import {
  countWithNoun,
  emptySentencesMessage,
  emptyWordsMessage,
  groupByMonth,
  listState,
  sentencesSummary,
  tabFromParam,
  toWordCard,
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
 * Two sentences, the newest one said "Presque".
 */
const SENTENCES = [
  aWord({
    id: 5,
    kind: 'sentence',
    label: 'Papa est parti',
    pronunciations: [
      aPronunciation({
        id: 50,
        wordId: 5,
        spoken: 'papa pati',
        status: 'learning',
        date: '2026-10-09',
      }),
    ],
  }),
  aWord({
    id: 6,
    kind: 'sentence',
    label: "Il n'y a plus de gâteau",
    pronunciations: [
      aPronunciation({
        id: 60,
        wordId: 6,
        spoken: 'a pu ato',
        status: 'almost',
        date: '2026-10-14',
      }),
    ],
  }),
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
  it('shows the first date, the word, its current form and status', () => {
    const card = toWordCard(LAPIN);
    expect(card).toMatchObject({
      label: 'lapin',
      spoken: 'apin',
      status: 'almost',
      day: '16',
      month: 'sept',
    });
    expect(card.ariaLabel).toBe(
      'apin, pour lapin, Presque, depuis le 16 septembre 2026. Voir sa page',
    );
  });
});

describe('sentences as cards', () => {
  it('lists the newest sentence first, searches what was meant and said, and filters by color', () => {
    expect(visibleWords(SENTENCES, '', 'all').map((sentence) => sentence.id)).toEqual([6, 5]);
    expect(visibleWords(SENTENCES, 'parti', 'all').map((sentence) => sentence.id)).toEqual([5]);
    expect(visibleWords(SENTENCES, 'ato', 'all').map((sentence) => sentence.id)).toEqual([6]);
    expect(visibleWords(SENTENCES, '', 'almost').map((sentence) => sentence.id)).toEqual([6]);
  });

  it('links a sentence card to its page', () => {
    expect(toWordCard(SENTENCES[0])).toMatchObject({
      path: '/phrases/5',
      label: 'Papa est parti',
      spoken: 'papa pati',
    });
  });
});

describe('summaries', () => {
  it('counts words per current status and names the newest one with how it is said', () => {
    const summary = wordsSummary([MAMAN, LAPIN, GATEAU]);
    expect(summary.countText).toBe('3 mots');
    expect(summary.latest).toBe('gâteau, dit «\u00A0tato\u00A0»');
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

  it('quotes the newest sentence and counts sentences per status', () => {
    const summary = sentencesSummary(SENTENCES);
    expect(summary).toMatchObject({
      countText: '2 phrases',
      latestLabel: 'Dernière',
      latest: "Il n'y a plus de gâteau, dite «\u00A0a pu ato\u00A0»",
    });
    expect(summary.statusCounts?.map((count) => count.label)).toEqual([
      '0 Bien dit',
      '1 Presque',
      '1 En route',
    ]);
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
    expect(emptySentencesMessage('', 'all', 0)).toBe(
      'Pas encore de phrase. La première arrive bientôt !',
    );
    expect(emptySentencesMessage('lolo', 'all', 2)).toBe(
      'Aucune phrase ne contient «\u00A0lolo\u00A0».',
    );
    expect(emptySentencesMessage('', 'mastered', 2)).toBe(
      "Aucune phrase dans cette couleur pour l'instant.",
    );
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

describe('groupByMonth', () => {
  it('cuts the newest-first list into titled and counted months, the stagger running on', () => {
    const groups = groupByMonth([GATEAU, LAPIN, MAMAN], 'mot');

    expect(
      groups.map(({ key, title, countText, offset }) => [key, title, countText, offset]),
    ).toEqual([
      ['2026-10', 'Octobre 2026', '1 mot', 0],
      ['2026-09', 'Septembre 2026', '1 mot', 1],
      ['2026-08', 'Août 2026', '1 mot', 2],
    ]);
    expect(groups[1].cards.map((card) => card.label)).toEqual(['lapin']);
  });

  it('keeps the words of one month together and counts them', () => {
    const [october] = groupByMonth([GATEAU, { ...GATEAU, id: 9, label: 'eau' }], 'mot');

    expect(october.countText).toBe('2 mots');
    expect(october.cards.map((card) => card.label)).toEqual(['gâteau', 'eau']);
  });

  it('gives no month for an empty list', () => {
    expect(groupByMonth([], 'phrase')).toEqual([]);
  });
});
