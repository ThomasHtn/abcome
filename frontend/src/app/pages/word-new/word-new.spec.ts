import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { DictionaryEntry } from '@core/dictionary/dictionary.model';
import { DictionaryApi } from '@core/dictionary/dictionary-api';
import { aPronunciation, aWord } from '@core/words/word.fixtures';
import { CreateWordRequest, Word } from '@core/words/word.model';
import { WordsApi } from '@core/words/words-api';

import { WordNewPage } from './word-new';

describe('WordNewPage', () => {
  const lapin = aWord({ id: 1, label: 'lapin' });
  const entries: DictionaryEntry[] = [
    { label: 'papa', category: 'people', frequent: true },
    { label: 'lapin', category: 'animals', frequent: true },
  ];
  let created: CreateWordRequest[];

  beforeEach(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    created = [];
    const words = signal<Word[]>([lapin]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: WordsApi,
          useValue: {
            words: { hasValue: () => true, value: words, reload: () => true },
            create: (request: CreateWordRequest) => {
              created.push(request);
              return Promise.resolve(
                aWord({
                  id: 2,
                  label: request.label,
                  pronunciations: [aPronunciation({ id: 20, wordId: 2, ...request.pronunciation })],
                }),
              );
            },
          },
        },
        {
          provide: DictionaryApi,
          useValue: { entries: { hasValue: () => true, value: signal(entries) } },
        },
      ],
    });
  });

  /**
   * Renders the page, optionally with a `?mot=` prefill.
   */
  function render(mot?: string): ComponentFixture<WordNewPage> {
    const fixture = TestBed.createComponent(WordNewPage);
    if (mot !== undefined) {
      fixture.componentRef.setInput('mot', mot);
    }
    fixture.detectChanges();
    return fixture;
  }

  /**
   * Types `text` in the spoken field.
   */
  function typeSpoken(element: HTMLElement, text: string): void {
    const field = element.querySelector<HTMLInputElement>('input[type="text"]');
    if (field) {
      field.value = text;
      field.dispatchEvent(new Event('input'));
    }
  }

  it('asks for the word and offers the frequent words not said yet', () => {
    const element = render().nativeElement as HTMLElement;
    expect(element.textContent).toContain('Quel mot Côme a-t-il dit ?');
    const shortcuts = [...element.querySelectorAll('.word-picker__shortcut')];
    expect(shortcuts.map((button) => button.textContent?.trim())).toEqual(['papa']);
  });

  it('shows the picked word with the picture and the name of its category', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.word-picker__shortcut')?.click();
    await fixture.whenStable();

    const chosen = element.querySelector('.word-new__chosen');
    expect(chosen?.querySelector('.word-new__tile use')?.getAttribute('href')).toContain('#users');
    expect(chosen?.querySelector('.word-new__category')?.textContent).toBe('personnes');
  });

  it('creates the picked word with its first stage, then opens its page', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    element.querySelector<HTMLButtonElement>('.word-picker__shortcut')?.click();
    await fixture.whenStable();

    const save = element.querySelector<HTMLButtonElement>('app-action-bar button');
    expect(save?.disabled).toBe(true);
    expect(save?.textContent).toContain("Note d'abord comment il le dit");

    typeSpoken(element, ' papa ');
    await fixture.whenStable();
    expect(save?.disabled).toBe(false);
    save?.click();
    await fixture.whenStable();

    expect(created).toEqual([
      {
        label: 'papa',
        pronunciation: { spoken: 'papa', status: 'almost', date: expect.any(String) },
      },
    ]);
    expect(navigate).toHaveBeenCalledWith(['/mots', 2]);
  });

  it('sends a word Côme already says to its page instead of a duplicate', async () => {
    const fixture = render('lap');
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.word-picker__suggestion')?.click();
    await fixture.whenStable();

    expect(element.textContent).toContain('Côme dit déjà «\u00A0lapin\u00A0»\u00A0!');
    expect(element.querySelector('a[href="/mots/1"]')?.textContent).toContain('Voir sa page');
    expect(element.querySelector('app-action-bar')).toBeNull();
  });
});
