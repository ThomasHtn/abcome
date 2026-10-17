import { TestBed } from '@angular/core/testing';

import { Celebration } from './celebration';
import { CELEBRATION_DURATION_MS, REDUCED_MOTION_QUERY } from './feedback.constants';

describe('Celebration', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('gives each burst a new id and ends it after the animation', () => {
    const celebration = TestBed.inject(Celebration);

    celebration.play();
    const first = celebration.burst();
    celebration.play();
    expect(celebration.burst()).not.toBe(first);

    vi.advanceTimersByTime(CELEBRATION_DURATION_MS);
    expect(celebration.burst()).toBeNull();
  });

  it('never starts a burst for a visitor asking for reduced motion', () => {
    const original = window.matchMedia;
    // jsdom has no matchMedia: this one reports the reduced-motion preference only.
    window.matchMedia = (query: string) =>
      ({ matches: query === REDUCED_MOTION_QUERY }) as MediaQueryList;
    try {
      const celebration = TestBed.inject(Celebration);
      celebration.play();
      expect(celebration.burst()).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });
});
