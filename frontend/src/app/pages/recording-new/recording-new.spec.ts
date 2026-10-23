import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthSession } from '@core/auth/auth-session';
import { DictionaryApi } from '@core/dictionary/dictionary-api';
import { QueuedSound } from '@core/outbox/outbox.model';
import { SoundOutbox } from '@core/outbox/sound-outbox';
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
  let uploadedTypes: string[];
  let created: CreateWordRequest[];
  let addedStages: PronunciationRequest[];
  let words: ReturnType<typeof signal<Word[]>>;
  let uploadError: unknown;
  let kept: QueuedSound[];

  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:clip');
    URL.revokeObjectURL = vi.fn();
    record = vi.fn().mockResolvedValue(clip);
    uploads = [];
    uploadedTypes = [];
    created = [];
    addedStages = [];
    words = signal<Word[]>([lapin]);
    uploadError = null;
    kept = [];
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
              const stage: Pronunciation = {
                id: 12,
                wordId,
                ...request,
                createdAt: '2026-10-19T10:00:00Z',
              };
              words.update((list) => upsertPronunciation(list, stage));
              return Promise.resolve(stage);
            },
            addRecording: (pronunciationId: number, audio: Blob, durationMs: number) => {
              if (uploadError) {
                return Promise.reject(uploadError);
              }
              uploads.push([pronunciationId, durationMs]);
              uploadedTypes.push(audio.type);
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
          provide: SoundOutbox,
          useValue: {
            keep: (sound: QueuedSound) => {
              kept.push(sound);
              return Promise.resolve(true);
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
    TestBed.inject(AuthSession).childName.set('Alix');
  });

  /**
   * Renders the screen, optionally for the word of `?word=`.
   */
  function render(word?: string): ComponentFixture<RecordingNewPage> {
    const fixture = TestBed.createComponent(RecordingNewPage);
    if (word !== undefined) {
      fixture.componentRef.setInput('word', word);
    }
    fixture.detectChanges();
    return fixture;
  }

  /**
   * Lets the browser decode any recording, as 2.4 s of a steady tone at 1 kHz, so it can be trimmed.
   */
  function stubDecoder(): void {
    vi.stubGlobal(
      'OfflineAudioContext',
      class {
        /**
         * Decodes any bytes to the tone.
         */
        public decodeAudioData = () =>
          Promise.resolve({
            getChannelData: () => new Float32Array(2400).fill(0.5),
            sampleRate: 1000,
            duration: 2.4,
          });
      },
    );
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
    expect(element.textContent).toContain('Touche le micro quand Alix commence à parler');

    await press(fixture, "Commencer l'enregistrement");

    expect(record).toHaveBeenCalled();
    expect(element.querySelector('[aria-label="Garder ce son"]')).not.toBeNull();
    expect(element.querySelector('[aria-label="Écouter le son"]')).not.toBeNull();
    expect(element.textContent).toContain('0:02');
    expect(element.textContent).toContain('Recommence autant que tu veux');
    expect(element.textContent).not.toContain('Glisse les poignées');
  });

  it('explains a recording stopped by the 30 seconds cap, until the next one', async () => {
    record.mockResolvedValueOnce({ ...clip, durationMs: 30_000 });
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    await press(fixture, "Commencer l'enregistrement");
    expect(element.textContent).toContain(
      "30 secondes, c'est le maximum\u00A0: l'enregistrement s'est arrêté tout seul.",
    );

    await press(fixture, "Recommencer l'enregistrement");
    expect(element.textContent).not.toContain("c'est le maximum");
  });

  it('trims the start of the sound and files the kept part as WAV', async () => {
    stubDecoder();
    const fixture = render('1');
    const element = fixture.nativeElement as HTMLElement;

    await press(fixture, "Commencer l'enregistrement");
    expect(element.textContent).toContain('Glisse les poignées');
    const start = element.querySelector<HTMLElement>('[aria-label="Début du son gardé"]');
    start?.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp' }));
    await fixture.whenStable();
    expect(element.textContent).toContain('0:01,4');
    expect(element.textContent).toContain('/ 0:02,4');

    await press(fixture, 'Garder ce son');
    await press(fixture, 'apin');

    expect(uploads).toEqual([[11, 1400]]);
    expect(uploadedTypes).toEqual(['audio/wav']);
  });

  it('undoes the cut, back to the whole sound, filed as WAV for older iPhones', async () => {
    stubDecoder();
    const fixture = render('1');
    const element = fixture.nativeElement as HTMLElement;

    await press(fixture, "Commencer l'enregistrement");
    const end = element.querySelector<HTMLElement>('[aria-label="Fin du son gardé"]');
    end?.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }));
    await fixture.whenStable();
    await press(fixture, 'Annuler la coupe');
    expect(element.textContent).not.toContain('Annuler la coupe');
    await press(fixture, 'Garder ce son');
    await press(fixture, 'apin');

    expect(uploads).toEqual([[11, 2400]]);
    expect(uploadedTypes).toEqual(['audio/wav']);
  });

  it('explains a refused microphone', async () => {
    record.mockRejectedValue(new RecorderError('denied'));
    const fixture = render();

    await press(fixture, "Commencer l'enregistrement");

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Le micro est bloqué');
    expect(text).toContain(
      'Sur iPhone\u00A0: ouvre Réglages, cherche «\u00A0Safari\u00A0», puis Micro.',
    );
  });

  it('explains a microphone taken by a call or another app', async () => {
    record.mockRejectedValue(new RecorderError('busy'));
    const fixture = render();

    await press(fixture, "Commencer l'enregistrement");

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Le micro est déjà utilisé',
    );
  });

  it('files the sound under a stage of the word given in the URL, then another one', async () => {
    const fixture = render('1');
    const element = fixture.nativeElement as HTMLElement;

    await press(fixture, "Commencer l'enregistrement");
    await press(fixture, 'Garder ce son');
    expect(element.textContent).toContain('Que dit Alix sur ce son\u00A0?');
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

  it('keeps the sound on the device when the notebook cannot be reached, without a page link', async () => {
    uploadError = new HttpErrorResponse({ status: 0 });
    const fixture = render('1');
    const element = fixture.nativeElement as HTMLElement;

    await press(fixture, "Commencer l'enregistrement");
    await press(fixture, 'Garder ce son');
    await press(fixture, 'apin');

    expect(kept).toEqual([
      {
        audio: clip.blob,
        durationMs: 2400,
        label: 'lapin',
        target: { kind: 'stage', stageId: 11 },
      },
    ]);
    expect(element.textContent).toContain('Son gardé sur ce téléphone');
    expect(element.textContent).toContain('rejoindra «\u00A0lapin\u00A0» tout seul');
    expect(element.querySelector('a[href^="/words/"]')).toBeNull();
  });

  it('reports a refused sound instead of keeping it', async () => {
    uploadError = new HttpErrorResponse({ status: 415, error: { code: 'UNSUPPORTED_MEDIA_TYPE' } });
    const fixture = render('1');

    await press(fixture, "Commencer l'enregistrement");
    await press(fixture, 'Garder ce son');
    await press(fixture, 'apin');

    expect(kept).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Son gardé');
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
