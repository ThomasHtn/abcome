import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthSession } from '@core/auth/auth-session';
import { aPronunciation, aWord } from '@core/words/word.fixtures';
import { Word } from '@core/words/word.model';
import { WordsApi } from '@core/words/words-api';

import { SEEN_MILESTONES_STORAGE_KEY } from './milestone.constants';
import { MilestoneWatch } from './milestone-watch';

/**
 * `count` words, one per day from September 1st 2026.
 */
function someWords(count: number): Word[] {
  return Array.from({ length: count }, (_, index) =>
    aWord({
      id: index + 1,
      label: `mot${index + 1}`,
      pronunciations: [
        aPronunciation({
          id: 1000 + index,
          date: new Date(Date.UTC(2026, 8, 1 + index)).toISOString().slice(0, 10),
        }),
      ],
    }),
  );
}

describe('MilestoneWatch', () => {
  let words: ReturnType<typeof signal<Word[]>>;

  beforeEach(() => {
    localStorage.removeItem(SEEN_MILESTONES_STORAGE_KEY);
    words = signal(someWords(9));
    TestBed.configureTestingModule({
      providers: [
        { provide: WordsApi, useValue: { words: { hasValue: () => true, value: words } } },
      ],
    });
    TestBed.inject(AuthSession).status.set('signed-in');
  });

  it('holds the milestone the 10th word just reached, once', () => {
    const watch = TestBed.inject(MilestoneWatch);
    TestBed.tick();
    expect(watch.current()).toBeNull();

    words.set(someWords(10));
    TestBed.tick();
    expect(watch.current()?.key).toBe('words-10');

    watch.dismiss();
    words.set([...someWords(10)]);
    TestBed.tick();
    expect(watch.current()).toBeNull();
  });

  it('celebrates nothing on a device opening a notebook that already passed milestones', () => {
    words.set(someWords(60));
    const watch = TestBed.inject(MilestoneWatch);
    TestBed.tick();

    expect(watch.current()).toBeNull();
  });

  it('waits for a session', () => {
    TestBed.inject(AuthSession).status.set('signed-out');
    TestBed.inject(MilestoneWatch);
    TestBed.tick();

    expect(localStorage.getItem(SEEN_MILESTONES_STORAGE_KEY)).toBeNull();
  });
});
