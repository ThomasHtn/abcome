import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { WordCardView } from '../home.model';
import { WordCard } from './word-card';

/**
 * "lapin", said "apin" now.
 */
const CARD: WordCardView = {
  id: 7,
  path: '/mots/7',
  label: 'lapin',
  spoken: 'apin',
  status: 'almost',
  day: '16',
  month: 'sept',
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

  it('titles the card with the word, then says what Côme says', () => {
    const link = render(CARD);

    expect(link.querySelector('.word-card__label')!.textContent).toBe('lapin');
    expect(link.querySelector('.word-card__said')!.textContent!.trim()).toBe(
      'Côme dit «\u00A0apin\u00A0»',
    );
    expect(link.querySelector('app-card-tag')).toBeNull();
  });

  it('ends with a small dot of the current status, and no stage dots', () => {
    const link = render(CARD);

    expect(link.querySelector('.word-card__current')!.classList).toContain('status-dot--almost');
    expect(link.querySelectorAll('app-status-dot')).toHaveLength(1);
  });
});
