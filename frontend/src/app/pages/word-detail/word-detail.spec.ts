import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Celebration } from '@core/feedback/celebration';
import { ToastQueue } from '@core/feedback/toast-queue';
import { aPronunciation, aRecording, aWord } from '@core/words/word.fixtures';
import { Pronunciation, PronunciationRequest, Word } from '@core/words/word.model';
import { removeRecording, upsertPronunciation } from '@core/words/word.utils';
import { WordsApi } from '@core/words/words-api';

import { WordDetailPage } from './word-detail';

describe('WordDetailPage', () => {
  let words: ReturnType<typeof signal<Word[]>>;
  let removed: number[];
  let removedSounds: number[];
  let removeStageError: unknown;
  let addStageError: unknown;
  let reloads: number;

  beforeAll(() => {
    // jsdom has no modal dialogs: stand in with the `open` attribute and the close event.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  beforeEach(() => {
    words = signal<Word[]>([
      aWord({
        id: 1,
        label: 'lapin',
        pronunciations: [
          aPronunciation({ id: 10, spoken: 'pin', status: 'learning', date: '2026-09-16' }),
          aPronunciation({ id: 11, spoken: 'apin', status: 'almost', date: '2026-10-12' }),
        ],
        recordings: [
          aRecording({ id: 8, wordId: 1, createdAt: '2026-10-14T09:00:00Z', durationMs: 4000 }),
          aRecording({ id: 7, wordId: 1, createdAt: '2026-10-12T09:00:00Z', durationMs: 3000 }),
        ],
      }),
    ]);
    removed = [];
    removedSounds = [];
    removeStageError = null;
    addStageError = null;
    reloads = 0;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: WordsApi,
          useValue: {
            words: { hasValue: () => true, value: words, reload: () => reloads++ },
            addPronunciation: (wordId: number, request: PronunciationRequest) => {
              if (addStageError) {
                return Promise.reject(addStageError);
              }
              const stage: Pronunciation = { id: 12, wordId, ...request };
              words.update((list) => upsertPronunciation(list, stage));
              return Promise.resolve(stage);
            },
            removeRecording: (id: number) => {
              removedSounds.push(id);
              words.update((list) => removeRecording(list, id));
              return Promise.resolve();
            },
            removePronunciation: () =>
              removeStageError ? Promise.reject(removeStageError) : Promise.resolve(),
            remove: (id: number) => {
              removed.push(id);
              words.set([]);
              return Promise.resolve();
            },
          },
        },
      ],
    });
  });

  /**
   * Renders the page of word `id`.
   */
  function render(id = '1'): ComponentFixture<WordDetailPage> {
    const fixture = TestBed.createComponent(WordDetailPage);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    return fixture;
  }

  /**
   * Clicks the first button whose text contains `text`.
   */
  function clickButton(element: HTMLElement, text: string): void {
    const button = [...element.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes(text),
    );
    button?.click();
  }

  it('shows the word, its stages newest first and its sounds newest first', () => {
    const element = render().nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('lapin');
    const spoken = [...element.querySelectorAll('.word-detail__spoken')].map((span) =>
      span.textContent?.trim(),
    );
    expect(spoken).toEqual(['«\u00A0apin\u00A0»', '«\u00A0pin\u00A0»']);
    const sounds = [...element.querySelectorAll('.sound-gallery__caption')].map((caption) =>
      caption.textContent?.trim(),
    );
    expect(sounds).toEqual(['14 oct. · 0:04', '12 oct. · 0:03']);
    expect(element.querySelectorAll('.word-detail__stage app-audio-button')).toHaveLength(0);
    expect(element.textContent).toContain('Il le dit mieux !');
  });

  it('deletes one sound after confirmation and keeps the others', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('[aria-label^="Supprimer le son du 14"]')?.click();
    await fixture.whenStable();
    const confirm = element.querySelector('dialog[open]') as HTMLElement;
    expect(confirm.textContent).toContain('Le son du 14 octobre 2026 (0:04) sera effacé.');
    clickButton(confirm, 'Oui, supprimer');
    await fixture.whenStable();

    expect(removedSounds).toEqual([8]);
    expect(element.querySelectorAll('.sound-gallery__caption')).toHaveLength(1);
    expect(TestBed.inject(ToastQueue).current()?.text).toBe('Son supprimé');
  });

  it('adds a "Bien dit" stage and celebrates the word turning green', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const play = vi.spyOn(TestBed.inject(Celebration), 'play');

    clickButton(element, 'Il le dit mieux !');
    await fixture.whenStable();
    expect(element.querySelector('dialog[open]')?.textContent).toContain('Nouvelle prononciation');

    const spoken = element.querySelector<HTMLInputElement>('dialog[open] input[type="text"]');
    if (spoken) {
      spoken.value = 'lapin';
      spoken.dispatchEvent(new Event('input'));
    }
    element.querySelector<HTMLInputElement>('dialog[open] input[value="mastered"]')?.click();
    await fixture.whenStable();
    clickButton(element.querySelector('dialog[open]') as HTMLElement, 'Enregistrer');
    await fixture.whenStable();

    expect(play).toHaveBeenCalled();
    expect(TestBed.inject(ToastQueue).current()?.text).toBe(
      'Bravo Côme\u00A0! «\u00A0lapin\u00A0» passe au vert',
    );
    expect(element.querySelector('.word-detail__spoken')?.textContent).toContain('lapin');
  });

  /**
   * Opens the new stage sheet, types `spoken` and presses save.
   */
  async function saveNewStage(fixture: ComponentFixture<WordDetailPage>, spoken: string) {
    const element = fixture.nativeElement as HTMLElement;
    clickButton(element, 'Il le dit mieux !');
    await fixture.whenStable();
    const field = element.querySelector<HTMLInputElement>('dialog[open] input[type="text"]');
    if (field) {
      field.value = spoken;
      field.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    clickButton(element.querySelector('dialog[open]') as HTMLElement, 'Enregistrer');
    await fixture.whenStable();
  }

  it('keeps the stage sheet open with the failure inside it', async () => {
    addStageError = new HttpErrorResponse({ status: 500 });
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    await saveNewStage(fixture, 'lapin');

    expect(element.querySelector('dialog[open] [role="alert"]')?.textContent).toContain(
      "La prononciation n'a pas pu être enregistrée",
    );
    expect(TestBed.inject(ToastQueue).current()).toBeNull();
  });

  it('says goodbye when the word was deleted on another phone', async () => {
    addStageError = new HttpErrorResponse({ status: 404, error: { code: 'NOT_FOUND' } });
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    await saveNewStage(fixture, 'lapin');

    expect(element.querySelector('h1')?.textContent).toBe('«\u00A0lapin\u00A0» a été supprimé');
    expect(reloads).toBe(1);
  });

  it('gives a long word a smaller title', () => {
    words.update(([word]) => [{ ...word, label: 'anticonstitutionnellement' }]);
    const element = render().nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.classList).toContain('word-detail__word--very-long');
  });

  it('explains that the only stage cannot be removed when the API refuses it', async () => {
    removeStageError = new HttpErrorResponse({
      status: 409,
      error: { code: 'LAST_PRONUNCIATION' },
    });
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.word-detail__card')?.click();
    await fixture.whenStable();
    clickButton(element, 'Retirer cette prononciation');
    await fixture.whenStable();
    clickButton(element.querySelector('dialog[open]') as HTMLElement, 'Oui, retirer');
    await fixture.whenStable();

    expect(element.querySelector('dialog[open]')?.textContent).toContain(
      "C'est sa seule prononciation",
    );
  });

  it('deletes the word after confirmation and says goodbye', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    element
      .querySelector<HTMLButtonElement>('[aria-label="Actions sur «\u00A0lapin\u00A0»"]')
      ?.click();
    await fixture.whenStable();
    clickButton(element, 'Supprimer le mot');
    await fixture.whenStable();
    clickButton(element.querySelector('dialog[open]') as HTMLElement, 'Oui, supprimer');
    await fixture.whenStable();

    expect(removed).toEqual([1]);
    expect(element.querySelector('h1')?.textContent).toBe('«\u00A0lapin\u00A0» a été supprimé');
  });

  it('says so when the word is not in the notebook', () => {
    const element = render('99').nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toBe("Ce mot n'est pas dans le carnet");
  });
});
