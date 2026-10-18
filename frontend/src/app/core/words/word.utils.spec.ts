import { aPronunciation, aRecording, aWord } from './word.fixtures';
import {
  addRecording,
  countByStatus,
  currentPronunciation,
  currentStatus,
  entriesOfKind,
  entryPath,
  findWordByLabel,
  firstSaidDate,
  heirStage,
  removePronunciation,
  removeRecording,
  sortByFirstSaidDesc,
  upsertPronunciation,
  upsertWord,
  wordMatchesQuery,
} from './word.utils';

/**
 * "lapin": first "pin" in red, then "apin" in orange, stored out of order on purpose.
 */
const lapin = aWord({
  id: 1,
  label: 'lapin',
  pronunciations: [
    aPronunciation({ id: 2, wordId: 1, spoken: 'apin', status: 'almost', date: '2026-10-12' }),
    aPronunciation({ id: 1, wordId: 1, spoken: 'pin', status: 'learning', date: '2026-09-16' }),
  ],
});

/**
 * "maman", mastered, first said after "lapin".
 */
const maman = aWord({
  id: 2,
  label: 'maman',
  pronunciations: [
    aPronunciation({ id: 3, wordId: 2, spoken: 'maman', status: 'mastered', date: '2026-10-10' }),
  ],
});

describe('word stages', () => {
  it('takes the latest stage as current and the oldest as first said', () => {
    expect(currentPronunciation(lapin).spoken).toBe('apin');
    expect(currentStatus(lapin)).toBe('almost');
    expect(firstSaidDate(lapin)).toBe('2026-09-16');
  });

  it('breaks a same-day tie on the id, so the later entry is current', () => {
    const word = aWord({
      pronunciations: [
        aPronunciation({ id: 8, status: 'mastered', date: '2026-10-01' }),
        aPronunciation({ id: 5, status: 'learning', date: '2026-10-01' }),
      ],
    });
    expect(currentStatus(word)).toBe('mastered');
  });
});

describe('word lists', () => {
  it('sorts by first-said date, newest first', () => {
    expect(sortByFirstSaidDesc([lapin, maman]).map((word) => word.label)).toEqual([
      'maman',
      'lapin',
    ]);
  });

  it('counts words by current status', () => {
    expect(countByStatus([lapin, maman], 'almost')).toBe(1);
    expect(countByStatus([lapin, maman], 'learning')).toBe(0);
  });

  it('matches a search on the label or any spoken form', () => {
    expect(wordMatchesQuery(lapin, 'LAP')).toBe(true);
    expect(wordMatchesQuery(lapin, 'pin')).toBe(true);
    expect(wordMatchesQuery(lapin, 'chat')).toBe(false);
  });

  it('finds a duplicate whatever its case and accents', () => {
    const gateau = aWord({ id: 3, label: 'gâteau' });
    expect(findWordByLabel([lapin, gateau], ' Gateau')).toBe(gateau);
    expect(findWordByLabel([lapin], 'chat')).toBeUndefined();
    expect(findWordByLabel([{ ...gateau, kind: 'sentence' }], 'gateau')).toBeUndefined();
  });

  it('links a word under /mots and a sentence under /phrases', () => {
    expect(entryPath({ id: 7, kind: 'word' })).toBe('/mots/7');
    expect(entryPath({ id: 8, kind: 'sentence' })).toBe('/phrases/8');
  });

  it('keeps the entries of one kind', () => {
    const sentence = aWord({ id: 9, kind: 'sentence', label: 'Encore du gâteau' });
    expect(entriesOfKind([lapin, sentence], 'sentence')).toEqual([sentence]);
    expect(entriesOfKind([lapin, sentence], 'word')).toEqual([lapin]);
  });
});

describe('list updates', () => {
  it('replaces a word by id or appends a new one', () => {
    const renamed = { ...lapin, label: 'lapinou' };
    expect(upsertWord([lapin, maman], renamed)[0].label).toBe('lapinou');
    expect(upsertWord([lapin], maman)).toHaveLength(2);
  });

  it('adds a stage to its word and keeps stages sorted', () => {
    const added = aPronunciation({
      id: 9,
      wordId: 1,
      spoken: 'lapin',
      status: 'mastered',
      date: '2026-10-15',
    });
    const [updated] = upsertPronunciation([lapin], added);
    expect(updated.pronunciations.map((stage) => stage.id)).toEqual([1, 2, 9]);
  });

  it('removes a stage from its word only', () => {
    const [updatedLapin, untouched] = removePronunciation([lapin, maman], 1);
    expect(updatedLapin.pronunciations.map((stage) => stage.id)).toEqual([2]);
    expect(untouched).toBe(maman);
  });

  it('hands the sounds of a removed stage to the stage before it, or after it for the oldest', () => {
    const third = aPronunciation({ id: 3, wordId: 1, date: '2026-10-14' });
    const withSounds = {
      ...lapin,
      pronunciations: [...lapin.pronunciations, third],
      recordings: [
        aRecording({ id: 7, wordId: 1, pronunciationId: 2 }),
        aRecording({ id: 8, wordId: 1, pronunciationId: 1 }),
      ],
    };

    expect(heirStage(withSounds, 2)?.id).toBe(1);
    expect(heirStage(withSounds, 1)?.id).toBe(2);
    const [afterMiddle] = removePronunciation([withSounds], 2);
    expect(afterMiddle.recordings.map((recording) => recording.pronunciationId)).toEqual([1, 1]);
    const [afterOldest] = removePronunciation([withSounds], 1);
    expect(afterOldest.recordings.map((recording) => recording.pronunciationId)).toEqual([2, 2]);
  });

  it('puts a new sound first in its word only', () => {
    const older = aRecording({ id: 3, wordId: 1 });
    const withSound = { ...lapin, recordings: [older] };
    const [updated, untouched] = addRecording([withSound, maman], aRecording({ id: 4, wordId: 1 }));
    expect(updated.recordings.map((recording) => recording.id)).toEqual([4, 3]);
    expect(untouched).toBe(maman);
  });

  it('removes a sound from its word only', () => {
    const withSounds = {
      ...lapin,
      recordings: [aRecording({ id: 4, wordId: 1 }), aRecording({ id: 3, wordId: 1 })],
    };
    const [updated, untouched] = removeRecording([withSounds, maman], 4);
    expect(updated.recordings.map((recording) => recording.id)).toEqual([3]);
    expect(untouched).toBe(maman);
  });
});
