import { TestBed } from '@angular/core/testing';

import { Sentence } from '@core/sentences/sentence.model';

import { SentenceCardView } from '../home.model';
import { SentenceCard } from './sentence-card';

/**
 * A sentence with what Côme meant.
 */
const SENTENCE: Sentence = {
  id: 1,
  spoken: 'a pu ato',
  meaning: "Il n'y a plus de gâteau",
  date: '2026-10-14',
};

/**
 * Its card.
 */
const CARD: SentenceCardView = {
  sentence: SENTENCE,
  day: '14',
  month: 'oct',
  ariaLabel: "«\u00A0a pu ato\u00A0», Il n'y a plus de gâteau, le 14 octobre 2026. Modifier",
};

describe('SentenceCard', () => {
  it('shows the sentence and asks for its edition on tap', () => {
    const fixture = TestBed.createComponent(SentenceCard);
    fixture.componentRef.setInput('card', CARD);
    const edited: Sentence[] = [];
    fixture.componentInstance.edit.subscribe((sentence) => edited.push(sentence));
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    expect(button.textContent).toContain('«\u00A0a pu ato\u00A0»');
    expect(button.textContent).toContain("Il n'y a plus de gâteau");

    button.click();
    expect(edited).toEqual([SENTENCE]);
  });

  it('leaves out the meaning when there is none', () => {
    const fixture = TestBed.createComponent(SentenceCard);
    fixture.componentRef.setInput('card', { ...CARD, sentence: { ...SENTENCE, meaning: null } });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.sentence-card__meaning'),
    ).toBeNull();
  });
});
