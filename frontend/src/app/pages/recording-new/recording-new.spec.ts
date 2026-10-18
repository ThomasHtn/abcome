import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DictionaryApi } from '@core/dictionary/dictionary-api';
import { aPronunciation, aRecording, aWord } from '@core/words/word.fixtures';
import {
  CreateWordRequest,
  Pronunciation,
  PronunciationRequest,
  Word,
} from '@core/words/word.model';
import { addRecording, upsertPronunciation, upsertWord } from '@core/words/word.utils';
import { WordsApi } from '@core/words/words-api';

import { AudioRecorder } from './audio-recorder';
import { RecorderError } from './recorder-error';
import { RecordingNewPage } from './recording-new';
import { RecordedClip } from './recording-new.model';

describe('RecordingNewPage', () => {
  const lapin = aWord({
    id: 1,
    label: 'lapin',
    pronunciations: [aPronunciation({ id: 11, wordId: 1, spoken: 'apin', status: 'almost' })],
  });
  const clip: RecordedClip = {
    blob: new Blob(['abc'], { type: 'audio/webm' }),
    durationMs: 2400,
    levels: [0.2, 0.8],
  };
  let record: ReturnType<typeof vi.fn>;
  let uploads: [number, number][];
  let created: CreateWordRequest[];
  let addedStages: PronunciationRequest[];
  let words: ReturnType<typeof signal<Word[]>>;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:clip');
    URL.revokeObjectURL = vi.fn();
    record = vi.fn().mockResolvedValue(clip);
    uploads = [];
    created = [];
    addedStages = [];
    words = signal<Word[]>([lapin]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: WordsApi,
          useValue: {
            words: { hasValue: () => true, value: words, reload: () => true },
            create: (request: CreateWordRequest) => {
              created.push(request);
              const word = aWord({
                id: 2,
                label: request.label,
                pronunciations: [aPronunciation({ id: 20, wordId: 2 })],
              });
              words.update((list) => upsertWord(list, word));
              return Promise.resolve(word);
            },
            addPronunciation: (wordId: number, request: PronunciationRequest) => {
              addedStages.push(request);
              const stage: Pronunciation = { id: 12, wordId, ...request };
              words.update((list) => upsertPronunciation(list, stage));
              return Promise.resolve(stage);
            },
            addRecording: (pronunciationId: number, _audio: Blob, durationMs: number) => {
              uploads.push([pronunciationId, durationMs]);
              const wordId = pronunciationId === 20 ? 2 : 1;
              const recording = aRecording({
                id: 100 + uploads.length,
                wordId,
                pronunciationId,
                durationMs,
              });
              words.update((list) => addRecording(list, recording));
              return Promise.resolve(recording);
            },
          },
        },
        {
          provide: DictionaryApi,
          useValue: { entries: { hasValue: () => true, value: signal([]) } },
        },
      ],
    });
    TestBed.overrideComponent(RecordingNewPage, {
      set: {
        providers: [
          {
            provide: AudioRecorder,
            useValue: { record, stop: vi.fn(), levels: signal([]), elapsedMs: signal(0) },
          },
        ],
      },
    });
  });

  /**
   * Renders the screen, optionally for the word of `?mot=`.
   */
  function render(mot?: string): ComponentFixture<RecordingNewPage> {
    const fixture = TestBed.createComponent(RecordingNewPage);
    if (mot !== undefined) {
      fixture.componentRef.setInput('mot', mot);
    }
    fixture.detectChanges();
    return fixture;
  }

  /**
   * Clicks the button named `label`, then lets the screen settle.
   */
  async function press(fixture: ComponentFixture<RecordingNewPage>, label: string): Promise<void> {
    const element = fixture.nativeElement as HTMLElement;
    const button = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) =>
        candidate.getAttribute('aria-label') === label || candidate.textContent?.includes(label),
    );
    button?.click();
    await fixture.whenStable();
  }

  it('records, then offers to listen, retry or keep the sound', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Touche le micro quand Côme commence à parler');

    await press(fixture, "Commencer l'enregistrement");

    expect(record).toHaveBeenCalled();
    expect(element.querySelector('[aria-label="Garder ce son"]')).not.toBeNull();
    expect(element.querySelector('[aria-label="Écouter le son"]')).not.toBeNull();
    expect(element.textContent).toContain('0:02');
  });

  it('explains a refused microphone', async () => {
    record.mockRejectedValue(new RecorderError('denied'));
    const fixture = render();

    await press(fixture, "Commencer l'enregistrement");

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Le micro est bloqué');
  });

  it('files the sound under a stage of the word given in the URL, then another one', async () => {
    const fixture = render('1');
    const element = fixture.nativeElement as HTMLElement;

    await press(fixture, "Commencer l'enregistrement");
    await press(fixture, 'Garder ce son');
    expect(element.textContent).toContain('Que dit Côme sur ce son ?');
    await press(fixture, 'apin');

    expect(uploads).toEqual([[11, 2400]]);
    expect(element.textContent).toContain('Son ajouté à «\u00A0lapin\u00A0»\u00A0!');
    expect(element.textContent).toContain('Tu le retrouves sur sa page.');

    await press(fixture, 'Enregistrer un autre son');
    await press(fixture, "Commencer l'enregistrement");
    await press(fixture, 'Garder ce son');
    await press(fixture, 'apin');

    expect(uploads).toEqual([
      [11, 2400],
      [11, 2400],
    ]);
    expect(element.textContent).toContain('Il a maintenant 2 sons.');
  });

  it('files the sound under a stage of a word picked in the search', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    await press(fixture, "Commencer l'enregistrement");
    await press(fixture, 'Garder ce son');

    const search = element.querySelector<HTMLInputElement>('input[type="search"]');
    if (search) {
      search.value = 'lap';
      search.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    await press(fixture, 'lapin');
    await press(fixture, 'apin');

    expect(uploads).toEqual([[11, 2400]]);
    expect(created).toEqual([]);
    expect(element.textContent).toContain('Son ajouté à «\u00A0lapin\u00A0»\u00A0!');
  });

  it('creates a new word for the sound, then adds the sound to its gallery', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    await press(fixture, "Commencer l'enregistrement");
    await press(fixture, 'Garder ce son');

    const search = element.querySelector<HTMLInputElement>('input[type="search"]');
    if (search) {
      search.value = 'Lulu';
      search.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    await press(fixture, 'ajouter «\u00A0Lulu\u00A0» quand même');

    const spoken = element.querySelector<HTMLInputElement>('input[type="text"]');
    if (spoken) {
      spoken.value = 'lulu';
      spoken.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    await press(fixture, 'Enregistrer le mot');

    expect(created.map((request) => request.label)).toEqual(['Lulu']);
    expect(uploads).toEqual([[20, 2400]]);
    expect(element.textContent).toContain('«\u00A0Lulu\u00A0» est dans ses mots\u00A0!');
  });

  it('notes a new stage of the word for the sound, then files the sound under it', async () => {
    const fixture = render('1');
    const element = fixture.nativeElement as HTMLElement;
    await press(fixture, "Commencer l'enregistrement");
    await press(fixture, 'Garder ce son');
    await press(fixture, 'Il le dit autrement');

    expect(element.textContent).toContain('Nouvelle prononciation de');
    const spoken = element.querySelector<HTMLInputElement>('input[type="text"]');
    if (spoken) {
      spoken.value = 'lapin';
      spoken.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    await press(fixture, 'Enregistrer la prononciation');

    expect(addedStages.map((request) => request.spoken)).toEqual(['lapin']);
    expect(uploads).toEqual([[12, 2400]]);
    expect(element.textContent).toContain('Nouvelle prononciation de «\u00A0lapin\u00A0»\u00A0!');
  });
});
