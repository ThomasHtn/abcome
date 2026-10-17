import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { WordCardView } from '../home.model';
import { WordCard } from './word-card';

/**
 * "lapin", said twice.
 */
const CARD: WordCardView = {
  id: 7,
  label: 'lapin',
  spoken: 'apin',
  status: 'almost',
  day: '16',
  month: 'sept',
  stageStatuses: ['learning', 'almost'],
  ariaLabel: 'apin, pour lapin, Presque, depuis le 16 septembre 2026. Voir sa page',
};

describe('WordCard', () => {
  /**
   * Renders a card and returns its link.
   */
  function render(card: WordCardView): HTMLAnchorElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(WordCard);
    fixture.componentRef.setInput('card', card);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('a')!;
  }

  it('links to the word page and reads as one sentence', () => {
    const link = render(CARD);

    expect(link.getAttribute('href')).toBe('/mots/7');
    expect(link.getAttribute('aria-label')).toBe(CARD.ariaLabel);
    expect(link.textContent).toContain('«\u00A0apin\u00A0»');
  });

  it('draws one dot per stage only when the word has progressed', () => {
    expect(render(CARD).querySelectorAll('.word-card__stage')).toHaveLength(2);
  });

  it('draws no dot for a word said once', () => {
    expect(
      render({ ...CARD, stageStatuses: [] }).querySelectorAll('.word-card__stage'),
    ).toHaveLength(0);
  });
});
