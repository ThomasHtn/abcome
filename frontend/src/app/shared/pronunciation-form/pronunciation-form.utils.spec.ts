import { aPronunciation } from '@core/words/word.fixtures';

import {
  draftOf,
  emptyDraft,
  isDraftReady,
  toPronunciationRequest,
} from './pronunciation-form.utils';

describe('pronunciation form utils', () => {
  it('starts blank on "Presque", dated as given', () => {
    expect(emptyDraft(undefined, '2026-10-17')).toEqual({
      spoken: '',
      status: 'almost',
      date: '2026-10-17',
    });
  });

  it('copies an existing stage to edit it', () => {
    const stage = aPronunciation({ spoken: 'pin', status: 'learning', date: '2026-09-16' });
    expect(draftOf(stage)).toEqual({ spoken: 'pin', status: 'learning', date: '2026-09-16' });
  });

  it('is ready only with a spoken form of 1 to 60 characters once trimmed', () => {
    const draft = emptyDraft('almost', '2026-10-17');
    const today = '2026-10-17';
    expect(isDraftReady({ ...draft, spoken: '   ' }, today)).toBe(false);
    expect(isDraftReady({ ...draft, spoken: ' apin ' }, today)).toBe(true);
    expect(isDraftReady({ ...draft, spoken: 'a'.repeat(61) }, today)).toBe(false);
    expect(isDraftReady({ ...draft, spoken: 'a'.repeat(200) }, today, 'sentence')).toBe(true);
    expect(isDraftReady({ ...draft, spoken: 'a'.repeat(201) }, today, 'sentence')).toBe(false);
  });

  it('is not ready without a day or with a day in the future', () => {
    const draft = { spoken: 'apin', status: 'almost' as const };
    expect(isDraftReady({ ...draft, date: '' }, '2026-10-17')).toBe(false);
    expect(isDraftReady({ ...draft, date: '2026-10-18' }, '2026-10-17')).toBe(false);
    expect(isDraftReady({ ...draft, date: '2026-10-17' }, '2026-10-17')).toBe(true);
  });

  it('trims the spoken form for the API', () => {
    expect(
      toPronunciationRequest({ spoken: ' apin ', status: 'mastered', date: '2026-10-17' }),
    ).toEqual({ spoken: 'apin', status: 'mastered', date: '2026-10-17' });
  });
});
