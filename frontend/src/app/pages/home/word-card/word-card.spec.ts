import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthSession } from '@core/auth/auth-session';

import { WordCardView } from '../home.model';
import { WordCard } from './word-card';

/**
 * "lapin", said "apin" now.
 */
const CARD: WordCardView = {
  id: 7,
  path: '/words/7',
  label: 'lapin',
  spoken: 'apin',
  status: 'almost',
  day: '16',
  month: 'sept',
  change: null,
  ariaLabel: 'apin, pour lapin, Presque, depuis le 16 septembre 2026. Voir sa page',
};

describe('WordCard', () => {
  /**
   * Renders a card and returns its link.
   */
  function render(card: WordCardView): HTMLAnchorElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(AuthSession).childName.set('Alix');
    const fixture = TestBed.createComponent(WordCard);
    fixture.componentRef.setInput('card', card);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('a')!;
  }

  it('links to the word page and reads as one sentence', () => {
    const link = render(CARD);

    expect(link.getAttribute('href')).toBe('/words/7');
    expect(link.getAttribute('aria-label')).toBe(CARD.ariaLabel);
    expect(link.textContent).toContain('«\u00A0apin\u00A0»');
  });

  it('titles the card with the word, then says what the child says', () => {
    const link = render(CARD);

    expect(link.querySelector('.word-card__label')!.textContent!.trim()).toBe('lapin');
    expect(link.querySelector('.word-card__said')!.textContent!.trim()).toBe(
      'Alix dit «\u00A0apin\u00A0»',
    );
    expect(link.querySelector('app-card-tag')).toBeNull();
  });

  it('shows no news tag when nothing changed elsewhere', () => {
    expect(render(CARD).querySelector('.word-card__change')).toBeNull();
  });

  it('tags a change after the title with its icon only, left to the aria-label to say', () => {
    const tag = render({ ...CARD, change: 'recording' }).querySelector('.word-card__change')!;

    expect(tag.getAttribute('aria-hidden')).toBe('true');
    expect(tag.textContent!.trim()).toBe('');
    expect(tag.querySelector('use')!.getAttribute('href')).toContain('#mic');
  });

  it('draws every news icon the same way, outlined at one size', () => {
    const icons = (['entry', 'pronunciation', 'recording'] as const).map((change) => {
      TestBed.resetTestingModule();
      return render({ ...CARD, change }).querySelector('.word-card__change svg')!;
    });

    expect(icons[0].querySelector('use')!.getAttribute('href')).toContain('#sparkle');
    expect(icons.map((icon) => [icon.getAttribute('fill'), icon.getAttribute('width')])).toEqual([
      ['none', '14'],
      ['none', '14'],
      ['none', '14'],
    ]);
  });

  it('shows a speech bubble for a new stage', () => {
    const stage = render({ ...CARD, change: 'pronunciation' }).querySelector(
      '.word-card__change svg',
    )!;
    expect(stage.querySelector('use')!.getAttribute('href')).toContain('#message-circle');
  });

  it('ends with a small dot of the current status, and no stage dots', () => {
    const link = render(CARD);

    expect(link.querySelector('.word-card__current')!.classList).toContain('status-dot--almost');
    expect(link.querySelectorAll('app-status-dot')).toHaveLength(1);
  });
});
