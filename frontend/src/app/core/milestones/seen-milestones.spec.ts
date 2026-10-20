import { TestBed } from '@angular/core/testing';

import { SEEN_MILESTONES_STORAGE_KEY } from './milestone.constants';
import { SeenMilestones } from './seen-milestones';

describe('SeenMilestones', () => {
  beforeEach(() => localStorage.removeItem(SEEN_MILESTONES_STORAGE_KEY));

  it('celebrates nothing already reached the first time a device looks', () => {
    const seen = TestBed.inject(SeenMilestones);

    expect(seen.takeUnseen(['words-10', 'first-mastered'])).toEqual([]);
    expect(seen.takeUnseen(['words-10', 'first-mastered', 'words-50'])).toEqual(['words-50']);
    expect(seen.takeUnseen(['words-10', 'first-mastered', 'words-50'])).toEqual([]);
  });

  it('remembers across visits', () => {
    localStorage.setItem(SEEN_MILESTONES_STORAGE_KEY, JSON.stringify(['words-10']));

    expect(TestBed.inject(SeenMilestones).takeUnseen(['words-10', 'words-50'])).toEqual([
      'words-50',
    ]);
  });

  it('starts afresh from unreadable storage', () => {
    localStorage.setItem(SEEN_MILESTONES_STORAGE_KEY, '{oops');

    expect(TestBed.inject(SeenMilestones).takeUnseen(['words-10'])).toEqual([]);
  });
});
