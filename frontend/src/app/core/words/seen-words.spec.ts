import { TestBed } from '@angular/core/testing';

import { SeenWords } from './seen-words';
import { CHANGE_RETENTION_MS, SEEN_STORAGE_KEY } from './word.constants';
import { aPronunciation, aRecording, aWord } from './word.fixtures';
import { SeenMarks } from './word.model';

/**
 * Day of the first visit on this device in these tests.
 */
const FIRST_VISIT = '2026-10-10T12:00:00Z';

/**
 * Word added before the first visit, given a sound afterwards.
 */
const LAPIN = aWord({
  id: 1,
  createdAt: '2026-09-16T08:00:00Z',
  pronunciations: [aPronunciation({ id: 10, wordId: 1, createdAt: '2026-09-16T08:00:00Z' })],
  recordings: [aRecording({ id: 11, wordId: 1, createdAt: '2026-10-17T09:30:00Z' })],
});

/**
 * Word added after the first visit.
 */
const RENARD = aWord({
  id: 2,
  label: 'renard',
  createdAt: '2026-10-18T07:00:00Z',
  pronunciations: [aPronunciation({ id: 20, wordId: 2, createdAt: '2026-10-18T07:00:00Z' })],
});

describe('SeenWords', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T10:00:00Z'));
  });

  afterEach(() => vi.useRealTimers());

  /**
   * Service of a device whose first visit was `FIRST_VISIT`, with `entries` already seen.
   */
  function onDevice(entries: Record<number, number> = {}): SeenWords {
    const marks: SeenMarks = { since: Date.parse(FIRST_VISIT), entries };
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(marks));
    return TestBed.inject(SeenWords);
  }

  it('tags nothing on a first visit, and remembers when it was', () => {
    const seen = TestBed.inject(SeenWords);

    expect(seen.changeOf(RENARD)).toBeNull();
    expect(JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY)!)).toEqual({
      since: Date.parse('2026-10-19T10:00:00Z'),
      entries: {},
    });
  });

  it('tags what was added since the first visit', () => {
    const seen = onDevice();

    expect(seen.changeOf(RENARD)).toBe('entry');
    expect(seen.changeOf(LAPIN)).toBe('recording');
  });

  it('clears an entry once seen, and keeps it cleared on the next visit', () => {
    onDevice().markSeen(LAPIN);
    TestBed.resetTestingModule();

    expect(TestBed.inject(SeenWords).changeOf(LAPIN)).toBeNull();
  });

  it('tags an entry again when something newer arrives', () => {
    const seen = onDevice({ 1: Date.parse('2026-10-17T09:30:00Z') });
    const withStage = {
      ...LAPIN,
      pronunciations: [
        ...LAPIN.pronunciations,
        aPronunciation({ id: 12, wordId: 1, createdAt: '2026-10-18T20:00:00Z' }),
      ],
    };

    expect(seen.changeOf(LAPIN)).toBeNull();
    expect(seen.changeOf(withStage)).toBe('pronunciation');
  });

  it('never moves a mark back', () => {
    const seen = onDevice({ 1: Date.parse('2026-10-18T00:00:00Z') });
    seen.markSeenAt(1, Date.parse('2026-10-11T00:00:00Z'));

    expect(seen.changeOf(LAPIN)).toBeNull();
  });

  it('keeps the tags of a listed entry for this visit, and drops them at the next one', () => {
    const seen = onDevice();
    seen.markListed([LAPIN, RENARD]);

    expect(seen.changeOf(RENARD)).toBe('entry');
    TestBed.resetTestingModule();
    const nextVisit = TestBed.inject(SeenWords);
    expect(nextVisit.changeOf(RENARD)).toBeNull();
    expect(nextVisit.changeOf(LAPIN)).toBeNull();
  });

  it('starts a new visit when the app comes back to the screen', () => {
    const seen = onDevice();
    seen.markListed([RENARD]);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(seen.changeOf(RENARD)).toBeNull();
    expect(seen.changeOf(LAPIN)).toBe('recording');
  });

  it('clears an opened entry at once without clearing the listed ones', () => {
    const seen = onDevice();
    seen.markListed([LAPIN, RENARD]);
    seen.markSeen(LAPIN);

    expect(seen.changeOf(LAPIN)).toBeNull();
    expect(seen.changeOf(RENARD)).toBe('entry');
  });

  it('keeps what another tab stored when it stores its own marks', () => {
    const seen = onDevice();
    const otherTab: SeenMarks = {
      since: Date.parse(FIRST_VISIT),
      entries: { 1: Date.parse('2026-10-17T09:30:00Z') },
    };
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(otherTab));
    seen.markListed([RENARD]);

    expect(Object.keys(JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY)!).entries)).toEqual([
      '1',
      '2',
    ]);
  });

  it('stores nothing for entries older than the first visit', () => {
    const seen = onDevice();
    const old = '2026-09-01T08:00:00Z';
    seen.markListed([
      aWord({
        id: 3,
        createdAt: old,
        pronunciations: [aPronunciation({ id: 30, wordId: 3, createdAt: old })],
      }),
    ]);

    expect(JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY)!).entries).toEqual({});
  });

  it('stops tagging a change older than 14 days, and forgets marks that old', () => {
    const seen = onDevice({ 9: Date.now() - CHANGE_RETENTION_MS - 1 });
    vi.setSystemTime(Date.parse('2026-10-17T09:30:00Z') + CHANGE_RETENTION_MS + 1);
    seen.markSeenAt(2, Date.now());

    expect(seen.changeOf(LAPIN)).toBeNull();
    expect(Object.keys(JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY)!).entries)).toEqual(['2']);
  });

  it('starts afresh from unreadable marks', () => {
    localStorage.setItem(SEEN_STORAGE_KEY, '{"since":"yesterday"}');

    expect(TestBed.inject(SeenWords).changeOf(RENARD)).toBeNull();
  });
});
