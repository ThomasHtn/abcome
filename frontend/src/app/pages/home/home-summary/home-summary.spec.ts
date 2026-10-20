import { TestBed } from '@angular/core/testing';

import { AuthSession } from '@core/auth/auth-session';

import { HomeSummary } from '../home.model';
import { HomeSummaryCard } from './home-summary';

/**
 * Words tab with three words.
 */
const SUMMARY: HomeSummary = {
  total: 3,
  countText: '3 mots',
  emptyHeadline: 'Le carnet attend son premier mot !',
  latestLabel: 'Dernier',
  latest: 'gâteau, dit «\u00A0tato\u00A0»',
  statusCounts: [
    { status: 'mastered', count: 1, label: '1 Bien dit' },
    { status: 'almost', count: 1, label: '1 Presque' },
    { status: 'learning', count: 1, label: '1 En route' },
  ],
  newsText: null,
};

describe('HomeSummaryCard', () => {
  /**
   * Renders the card and returns its text, whitespace collapsed.
   */
  function render(summary: HomeSummary): string {
    TestBed.inject(AuthSession).childName.set('Alix');
    const fixture = TestBed.createComponent(HomeSummaryCard);
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();
    return ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/[ \t\n\r]+/g, ' ');
  }

  it('says how many words, the latest and the counts per color', () => {
    const text = render(SUMMARY);

    expect(text).toContain('Alix a déjà dit 3 mots !');
    expect(text).toContain('Dernier\u00A0: gâteau, dit «\u00A0tato\u00A0»');
    expect(text).toContain('1 Bien dit');
  });

  it('counts what changed since the last visit, only when something did', () => {
    expect(render({ ...SUMMARY, newsText: '3 nouveautés depuis ta visite' })).toContain(
      '3 nouveautés depuis ta visite',
    );
    expect(render(SUMMARY)).not.toContain('nouveauté');
  });

  it('waits for the first word in an empty notebook', () => {
    const text = render({ ...SUMMARY, total: 0, latest: null, statusCounts: null });

    expect(text).toContain('Le carnet attend son premier mot !');
    expect(text).not.toContain('Dernier');
  });

  it('marks the card settled when the screen comes back, so the bubble does not grow again', () => {
    TestBed.inject(AuthSession).childName.set('Alix');
    const fixture = TestBed.createComponent(HomeSummaryCard);
    fixture.componentRef.setInput('summary', SUMMARY);
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector('.home-summary')!;
    expect(card.classList).not.toContain('home-summary--settled');

    fixture.componentRef.setInput('settled', true);
    fixture.detectChanges();
    expect(card.classList).toContain('home-summary--settled');
  });
});
