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
  tile: { value: '16', unit: 'sept', age: false },
  saidOn: null,
  markers: [],
  change: null,
  hasSound: false,
  ariaLabel: 'apin, pour lapin, Presque, depuis le 16 septembre 2026. Voir sa page',
};

describe('WordCard', () => {
  /**
   * Renders a card, popping in unless settled, and returns its link.
   */
  function render(card: WordCardView, settled = false): HTMLAnchorElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(AuthSession).childName.set('Alix');
    const fixture = TestBed.createComponent(WordCard);
    fixture.componentRef.setInput('card', card);
    fixture.componentRef.setInput('settled', settled);
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

  it('shows the age in a salmon tile and the day after what the child says', () => {
    const link = render({
      ...CARD,
      tile: { value: '17', unit: 'mois', age: true },
      saidOn: ', le 16 sept.',
    });

    expect(link.querySelector('app-date-tile')!.classList).toContain('date-tile--age');
    expect(link.querySelector('.date-tile__day')!.textContent).toBe('17');
    expect(link.querySelector('.date-tile__month')!.textContent).toBe('mois');
    expect(link.querySelector('.word-card__said')!.textContent!.trim()).toBe(
      'Alix dit «\u00A0apin\u00A0», le 16 sept.',
    );
  });

  it('shows a microphone after the title of an entry that keeps sounds', () => {
    expect(render(CARD).querySelector('.word-card__sound')).toBeNull();
    TestBed.resetTestingModule();
    const sound = render({ ...CARD, hasSound: true }).querySelector('.word-card__sound')!;

    expect(sound.getAttribute('aria-hidden')).toBe('true');
    expect(sound.querySelector('use')!.getAttribute('href')).toContain('#mic');
  });

  it('keeps the marks with the last word of a long title', () => {
    const label = render({ ...CARD, label: 'il a plus de gateau', hasSound: true }).querySelector(
      '.word-card__label',
    )!;
    const tail = label.querySelector('.word-card__tail')!;

    expect(label.textContent!.trim()).toBe('il a plus de gateau');
    expect(tail.textContent!.trim()).toBe('gateau');
    expect(tail.querySelector('.word-card__sound')).not.toBeNull();
  });

  it('leaves the microphone to the tag of a new sound, and keeps it beside other news', () => {
    const newSound = render({ ...CARD, hasSound: true, change: 'recording' });
    expect(newSound.querySelector('.word-card__sound')).toBeNull();
    TestBed.resetTestingModule();
    const newStage = render({ ...CARD, hasSound: true, change: 'pronunciation' });

    expect(newStage.querySelector('.word-card__sound')).not.toBeNull();
    expect(newStage.querySelector('.word-card__change')).not.toBeNull();
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

  it('pops in by default, and shows in place when the list comes back', () => {
    expect(render(CARD).classList).toContain('pop');
    TestBed.resetTestingModule();
    const settled = render({ ...CARD, change: 'entry' }, true);

    expect(settled.classList).not.toContain('pop');
    expect(settled.classList).toContain('word-card--settled');
  });

  it('ends with a small dot of the current status, and no stage dots', () => {
    const link = render(CARD);

    expect(link.querySelector('.word-card__current')!.classList).toContain('status-dot--almost');
    expect(link.querySelectorAll('app-status-dot')).toHaveLength(1);
  });
});
