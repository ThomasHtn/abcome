import { TestBed } from '@angular/core/testing';

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
  latest: 'tato',
  statusCounts: [
    { status: 'mastered', count: 1, label: '1 Bien dit' },
    { status: 'almost', count: 1, label: '1 Presque' },
    { status: 'learning', count: 1, label: '1 En route' },
  ],
};

describe('HomeSummaryCard', () => {
  /**
   * Renders the card and returns its text, whitespace collapsed.
   */
  function render(summary: HomeSummary): string {
    const fixture = TestBed.createComponent(HomeSummaryCard);
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();
    return ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/[ \t\n\r]+/g, ' ');
  }

  it('says how many words, the latest and the counts per color', () => {
    const text = render(SUMMARY);

    expect(text).toContain('Côme a déjà dit 3 mots !');
    expect(text).toContain('Dernier\u00A0: «\u00A0tato\u00A0»');
    expect(text).toContain('1 Bien dit');
  });

  it('waits for the first word in an empty notebook', () => {
    const text = render({ ...SUMMARY, total: 0, latest: null, statusCounts: null });

    expect(text).toContain('Le carnet attend son premier mot !');
    expect(text).not.toContain('Dernier');
  });
});
