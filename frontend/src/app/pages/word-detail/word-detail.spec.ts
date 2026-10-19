import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthSession } from '@core/auth/auth-session';
import { Celebration } from '@core/feedback/celebration';
import { ToastQueue } from '@core/feedback/toast-queue';
import { Waveforms } from '@core/recordings/waveforms';
import { SeenWords } from '@core/words/seen-words';
import { aPronunciation, aRecording, aWord } from '@core/words/word.fixtures';
import { Pronunciation, PronunciationRequest, Word, WordKind } from '@core/words/word.model';
import { removeRecording, replaceRecording, upsertPronunciation } from '@core/words/word.utils';
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
          aRecording({
            id: 8,
            wordId: 1,
            pronunciationId: 11,
            createdAt: '2026-10-14T09:00:00Z',
            durationMs: 4000,
          }),
          aRecording({
            id: 7,
            wordId: 1,
            pronunciationId: 10,
            createdAt: '2026-10-12T09:00:00Z',
            durationMs: 3000,
          }),
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
        { provide: Waveforms, useValue: { load: () => Promise.resolve([]) } },
        {
          provide: WordsApi,
          useValue: {
            words: { hasValue: () => true, value: words, reload: () => reloads++ },
            addPronunciation: (wordId: number, request: PronunciationRequest) => {
              if (addStageError) {
                return Promise.reject(addStageError);
              }
              const stage: Pronunciation = {
                id: 12,
                wordId,
                ...request,
                createdAt: '2026-10-19T10:00:00Z',
              };
              words.update((list) => upsertPronunciation(list, stage));
              return Promise.resolve(stage);
            },
            moveRecording: (id: number, pronunciationId: number) => {
              const recording = words()[0].recordings.find((sound) => sound.id === id)!;
              const moved = { ...recording, pronunciationId };
              words.update((list) => replaceRecording(list, moved));
              return Promise.resolve(moved);
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
    TestBed.inject(AuthSession).childName.set('Alix');
  });

  /**
   * Renders the page of word `id`, reached under `/mots/` or `/phrases/` as `kind` says.
   */
  function render(id = '1', kind: WordKind = 'word'): ComponentFixture<WordDetailPage> {
    const fixture = TestBed.createComponent(WordDetailPage);
    fixture.componentRef.setInput('id', id);
    fixture.componentRef.setInput('kind', kind);
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

  it('marks the word as seen on this device once shown', () => {
    const seen = TestBed.inject(SeenWords);
    const markSeen = vi.spyOn(seen, 'markSeen');
    render();

    expect(markSeen).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('shows the word with its status, its stages newest first, each with its own sounds', () => {
    const element = render().nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('lapin');
    expect(element.querySelector('.word-detail__hero app-status-badge')?.textContent?.trim()).toBe(
      'Presque',
    );
    const stages = [...element.querySelectorAll('.word-detail__stage')].map((stage) => [
      stage.querySelector('.word-detail__spoken')?.textContent?.trim(),
      [...stage.querySelectorAll('.stage-sounds__more')].map((more) =>
        more.getAttribute('aria-label'),
      ),
    ]);
    expect(stages).toEqual([
      // The year is said only outside the current one.
      [
        '«\u00A0apin\u00A0»',
        [
          expect.stringMatching(
            /^Actions sur le son enregistré le 14 octobre( 2026)?, 4 secondes$/,
          ),
        ],
      ],
      [
        '«\u00A0pin\u00A0»',
        [
          expect.stringMatching(
            /^Actions sur le son enregistré le 12 octobre( 2026)?, 3 secondes$/,
          ),
        ],
      ],
    ]);
    expect(element.querySelector('.word-detail__no-sound')).toBeNull();
    expect(element.textContent).toContain('Il le dit mieux\u00A0!');
  });

  it('tells assistive technologies that the word and sound menus open a dialog', () => {
    const element = render().nativeElement as HTMLElement;
    const menus = [
      element.querySelector('[aria-label="Actions sur «\u00A0lapin\u00A0»"]'),
      ...element.querySelectorAll('.stage-sounds__more'),
    ];
    expect(menus).toHaveLength(3);
    expect(menus.map((menu) => menu?.getAttribute('aria-haspopup'))).toEqual([
      'dialog',
      'dialog',
      'dialog',
    ]);
  });

  it('says where the sounds of a removed stage go, and "Garder" goes back to the edits', async () => {
    words.update(([word]) => [
      {
        ...word,
        recordings: [...word.recordings, aRecording({ id: 9, wordId: 1, pronunciationId: 11 })],
      },
    ]);
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.word-detail__card')?.click();
    await fixture.whenStable();
    const field = element.querySelector<HTMLInputElement>('dialog[open] input[type="text"]');
    if (field) {
      field.value = 'apine';
      field.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    clickButton(element, 'Retirer cette prononciation');
    await fixture.whenStable();
    const confirm = element.querySelector('dialog[open]') as HTMLElement;
    expect(confirm.textContent).toContain('Ses 2 sons seront rangés avec «\u00A0pin\u00A0».');

    clickButton(confirm, 'Garder');
    await fixture.whenStable();
    const stage = element.querySelector('dialog[open]') as HTMLElement;
    expect(stage.getAttribute('aria-label')).toBe('Modifier la prononciation');
    expect(stage.querySelector<HTMLInputElement>('input[type="text"]')?.value).toBe('apine');
  });

  it('says nothing of sounds when the removed stage has none', async () => {
    words.update(([word]) => [{ ...word, recordings: [] }]);
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.word-detail__card')?.click();
    await fixture.whenStable();
    clickButton(element, 'Retirer cette prononciation');
    await fixture.whenStable();

    expect(element.querySelector('dialog[open]')?.textContent).not.toContain('rangé');
  });

  it('says how to record the first sound of a word without any', () => {
    words.update((list) => list.map((word) => ({ ...word, recordings: [] })));
    const element = render().nativeElement as HTMLElement;

    expect(element.querySelector('app-stage-sounds')).toBeNull();
    expect(element.querySelector('.word-detail__no-sound')?.textContent).toContain(
      'Touche le micro',
    );
  });

  it('speaks of a sentence on a sentence page, even before finding it', async () => {
    words.update((list) => list.map((word) => ({ ...word, kind: 'sentence' as const })));
    const fixture = render('1', 'sentence');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('[aria-label^="Actions sur"]')?.click();
    await fixture.whenStable();
    const menu = element.querySelector('dialog[open]') as HTMLElement;
    expect(menu.textContent).toContain('Modifier la phrase');
    expect(menu.textContent).toContain('Supprimer la phrase');
    clickButton(menu, 'Modifier la phrase');
    await fixture.whenStable();
    expect(element.querySelector('dialog[open]')?.getAttribute('aria-label')).toBe(
      'Modifier la phrase',
    );

    const missing = render('99', 'sentence').nativeElement as HTMLElement;
    expect(missing.textContent).toContain("Cette phrase n'est pas dans le carnet");
  });

  it('moves a sound to another stage chosen in a sheet', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    element
      .querySelector<HTMLButtonElement>('[aria-label^="Actions sur le son enregistré le 14"]')
      ?.click();
    await fixture.whenStable();
    const actions = element.querySelector('dialog[open]') as HTMLElement;
    expect(actions.textContent).toContain('Son enregistré le 14 octobre');
    expect(actions.textContent).toContain('Alix y dit «\u00A0apin\u00A0». Il dure 4 secondes.');
    clickButton(actions, 'Ranger avec une autre prononciation');
    await fixture.whenStable();
    const sheet = element.querySelector('dialog[open]') as HTMLElement;
    expect(sheet.textContent).toContain('Avec quelle prononciation le ranger\u00A0?');
    expect(sheet.querySelectorAll('.word-detail__row')).toHaveLength(1);
    clickButton(sheet, 'pin');
    await fixture.whenStable();

    const pinStage = element.querySelectorAll('.word-detail__stage')[1];
    expect(pinStage.querySelectorAll('app-voice-note')).toHaveLength(2);
    expect(element.querySelector('dialog[open]')).toBeNull();
  });

  it('deletes one sound after confirmation and keeps the others', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    element
      .querySelector<HTMLButtonElement>('[aria-label^="Actions sur le son enregistré le 14"]')
      ?.click();
    await fixture.whenStable();
    clickButton(element.querySelector('dialog[open]') as HTMLElement, 'Supprimer le son');
    await fixture.whenStable();
    const confirm = element.querySelector('dialog[open]') as HTMLElement;
    expect(confirm.textContent).toMatch(
      /Le son enregistré le 14 octobre( 2026)?, où Alix dit «\u00A0apin\u00A0», sera effacé\./,
    );
    clickButton(confirm, 'Oui, supprimer');
    await fixture.whenStable();

    expect(removedSounds).toEqual([8]);
    expect(element.querySelectorAll('app-voice-note')).toHaveLength(1);
    expect(TestBed.inject(ToastQueue).current()?.text).toBe('Son supprimé');
  });

  it('adds a "Bien dit" stage and celebrates the word turning green', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const play = vi.spyOn(TestBed.inject(Celebration), 'play');

    clickButton(element, 'Il le dit mieux\u00A0!');
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
      'Bravo Alix\u00A0! «\u00A0lapin\u00A0» passe au vert',
    );
    expect(element.querySelector('.word-detail__spoken')?.textContent).toContain('lapin');
  });

  /**
   * Opens the new stage sheet, types `spoken` and presses save.
   */
  async function saveNewStage(fixture: ComponentFixture<WordDetailPage>, spoken: string) {
    const element = fixture.nativeElement as HTMLElement;
    clickButton(element, 'Il le dit mieux\u00A0!');
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
