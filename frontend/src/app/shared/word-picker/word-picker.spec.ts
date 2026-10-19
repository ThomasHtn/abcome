import { TestBed } from '@angular/core/testing';

import { DictionaryEntry } from '@core/dictionary/dictionary.model';
import { LABEL_MAX_LENGTHS } from '@core/words/word.constants';
import { aWord } from '@core/words/word.fixtures';
import { Word } from '@core/words/word.model';

import { WordPicker } from './word-picker';
import { WordChoice } from './word-picker.model';

/**
 * A rendered picker and what it emitted.
 */
interface Rendered {
  /**
   * Its root element.
   */
  element: HTMLElement;

  /**
   * Choices emitted so far.
   */
  picks: WordChoice[];
}

describe('WordPicker', () => {
  const lapin = aWord({ id: 1, label: 'lapin' });
  const entries: DictionaryEntry[] = [
    { label: 'papa', category: 'people', frequent: true },
    { label: 'lapin', category: 'animals', frequent: true },
    { label: 'lait', category: 'food_drink', frequent: false },
  ];

  /**
   * Renders a picker over `words`, with `query` typed; returns its element and the picks it emits.
   */
  function render(
    query: string,
    words: readonly Word[] = [lapin],
    emptyState: 'frequent' | 'notebook' = 'frequent',
  ): Rendered {
    const fixture = TestBed.createComponent(WordPicker);
    fixture.componentRef.setInput('words', words);
    fixture.componentRef.setInput('entries', entries);
    fixture.componentRef.setInput('searchLabel', 'Chercher un mot');
    fixture.componentRef.setInput('emptyState', emptyState);
    fixture.componentRef.setInput('query', query);
    const picks: WordChoice[] = [];
    fixture.componentInstance.picked.subscribe((choice) => picks.push(choice));
    fixture.detectChanges();
    return { element: fixture.nativeElement as HTMLElement, picks };
  }

  it('suggests matching words with their category and flags those already said', () => {
    const { element } = render('la');
    const rows = [...element.querySelectorAll('.word-picker__suggestion')].map((row) =>
      row.getAttribute('aria-label'),
    );
    expect(rows).toEqual(['lapin, animaux, déjà dit', 'lait, à manger et à boire']);
    expect(element.querySelector('.word-picker__head')?.textContent).toBe('la');
  });

  it('emits the notebook word when a known suggestion is picked', () => {
    const { element, picks } = render('lap');
    element.querySelector<HTMLButtonElement>('.word-picker__suggestion')?.click();
    expect(picks).toEqual([{ label: 'lapin', category: 'animals', word: lapin }]);
  });

  it('offers to add an unknown word as a custom one', () => {
    const { element, picks } = render('Lulu');
    const offer = element.querySelector<HTMLButtonElement>('.word-picker__offer');
    expect(offer?.textContent).toContain('ajouter «\u00A0Lulu\u00A0» quand même');
    offer?.click();
    expect(picks).toEqual([{ label: 'Lulu', category: 'custom', word: null }]);
  });

  it('says how long a word can be instead of offering a longer one', () => {
    const { element } = render('x'.repeat(LABEL_MAX_LENGTHS.word + 1));
    expect(element.querySelector('.word-picker__offer')).toBeNull();
    expect(element.querySelector('.word-picker__too-long')?.textContent?.trim()).toBe(
      `Un mot fait ${LABEL_MAX_LENGTHS.word} caractères au plus.`,
    );
    expect(render('Lulu').element.querySelector('.word-picker__too-long')).toBeNull();
  });

  it('shows the frequent words not said yet before anything is typed', () => {
    const { element, picks } = render('');
    const shortcuts = [...element.querySelectorAll('.word-picker__shortcut')];
    expect(shortcuts.map((button) => button.textContent?.trim())).toEqual(['papa']);
    (shortcuts[0] as HTMLButtonElement).click();
    expect(picks).toEqual([{ label: 'papa', category: 'people', word: null }]);
  });

  it('lists the notebook words before typing in notebook mode', () => {
    const { element, picks } = render('', [lapin], 'notebook');
    expect(element.textContent).toContain('Ses mots');
    expect(element.querySelector('.word-picker__spoken')?.textContent).toContain(
      '«\u00A0apin\u00A0»',
    );
    element.querySelector<HTMLButtonElement>('.word-picker__word')?.click();
    expect(picks[0].word).toBe(lapin);
  });
});
