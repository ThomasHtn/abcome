import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthSession } from '@core/auth/auth-session';
import { Celebration } from '@core/feedback/celebration';
import { ToastQueue } from '@core/feedback/toast-queue';
import { Milestone } from '@core/milestones/milestone.model';
import { MilestoneWatch } from '@core/milestones/milestone-watch';
import { aPronunciation, aWord } from '@core/words/word.fixtures';

import { MilestoneSheet } from './milestone-sheet';

describe('MilestoneSheet', () => {
  let current: ReturnType<typeof signal<Milestone | null>>;

  beforeEach(() => {
    current = signal<Milestone | null>(null);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MilestoneWatch,
          useValue: { current, dismiss: () => current.set(null) },
        },
      ],
    });
    const session = TestBed.inject(AuthSession);
    session.childName.set('Alix');
    session.childBirthDate.set('2025-05-12');
  });

  /**
   * The 10th word, "non", first said on October 19th 2026.
   */
  function tenWords(): Milestone {
    return {
      key: 'words-10',
      kind: 'words',
      count: 10,
      entry: aWord({
        id: 7,
        label: 'non',
        pronunciations: [aPronunciation({ date: '2026-10-19' })],
      }),
      date: '2026-10-19',
    };
  }

  it('celebrates a word count with its story, the next step and confetti, over any toast', () => {
    const play = vi.spyOn(TestBed.inject(Celebration), 'play');
    TestBed.inject(ToastQueue).show('«\u00A0non\u00A0» rejoint ses mots');
    const fixture = TestBed.createComponent(MilestoneSheet);
    fixture.detectChanges();

    current.set(tenWords());
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.milestone-sheet__face')?.textContent?.trim()).toBe('10');
    expect(element.querySelector('h2')?.textContent?.trim()).toBe('10 mots !');
    expect(element.querySelector('.milestone-sheet__story')?.textContent?.trim()).toBe(
      'Avec « non », Alix passe le cap des 10 mots, à 17 mois.',
    );
    expect(element.querySelector('.milestone-sheet__next')?.textContent?.trim()).toBe(
      'Prochain jalon : 50 mots',
    );
    expect(play).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(ToastQueue).current()).toBeNull();
  });

  it('shows an icon and no next step for a first time', () => {
    const fixture = TestBed.createComponent(MilestoneSheet);
    current.set({ ...tenWords(), key: 'first-mastered', kind: 'first-mastered', count: null });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.milestone-sheet__face use')?.getAttribute('href')).toContain(
      '#check',
    );
    expect(element.querySelector('.milestone-sheet__next')).toBeNull();
  });

  it('closes on the thanks button', () => {
    const fixture = TestBed.createComponent(MilestoneSheet);
    current.set(tenWords());
    fixture.detectChanges();

    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.includes('Bravo Alix'),
    );
    button?.click();

    expect(current()).toBeNull();
  });
});
