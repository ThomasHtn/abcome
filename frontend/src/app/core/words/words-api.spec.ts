import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthSession } from '@core/auth/auth-session';
import { UNDO_WINDOW_MS } from '@core/feedback/feedback.constants';
import { ToastQueue } from '@core/feedback/toast-queue';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { SeenWords } from './seen-words';
import { aPronunciation, aRecording, aWord } from './word.fixtures';
import { WordsApi } from './words-api';

describe('WordsApi', () => {
  let api: WordsApi;
  let http: HttpTestingController;
  let session: AuthSession;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
      ],
    });
    api = TestBed.inject(WordsApi);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSession);
  });

  afterEach(() => http.verify());

  /**
   * Opens a session and answers the list request with `words`; the resource settles on a macrotask.
   */
  async function loadList(words = [aWord()]): Promise<void> {
    session.status.set('signed-in');
    TestBed.tick();
    http.expectOne(API_ENDPOINTS.words).flush(words);
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  }

  it('fetches nothing while signed out', () => {
    TestBed.tick();
    http.expectNone(API_ENDPOINTS.words);
    expect(api.words.hasValue()).toBe(false);
  });

  it('loads the list once signed in', async () => {
    await loadList();
    expect(api.words.value()?.map((word) => word.label)).toEqual(['lapin']);
  });

  it('fetches the list again on every screen shown, keeping the old one meanwhile', async () => {
    await TestBed.inject(Router).navigateByUrl('/');
    await loadList();

    await TestBed.inject(Router).navigateByUrl('/words/1');
    TestBed.tick();

    expect(api.words.value()?.map((word) => word.label)).toEqual(['lapin']);
    http.expectOne(API_ENDPOINTS.words).flush([aWord(), aWord({ id: 2, label: 'chat' })]);
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    expect(api.words.value()?.map((word) => word.label)).toEqual(['lapin', 'chat']);
  });

  it('keeps the list on a tab or search change, which only touches the query', async () => {
    await TestBed.inject(Router).navigateByUrl('/');
    await loadList();

    await TestBed.inject(Router).navigateByUrl('/?tab=sentences&q=ch');
    TestBed.tick();

    http.expectNone(API_ENDPOINTS.words);
  });

  it('fetches the list again when the app comes back to the screen', async () => {
    await loadList();

    document.dispatchEvent(new Event('visibilitychange'));
    TestBed.tick();

    http.expectOne(API_ENDPOINTS.words).flush([aWord()]);
  });

  it('keeps the shown list when a fetch fails, and fetches again when the network returns', async () => {
    await loadList();

    document.dispatchEvent(new Event('visibilitychange'));
    TestBed.tick();
    http.expectOne(API_ENDPOINTS.words).error(new ProgressEvent('error'));
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    expect(api.words.value()?.map((word) => word.label)).toEqual(['lapin']);

    window.dispatchEvent(new Event('online'));
    TestBed.tick();
    http.expectOne(API_ENDPOINTS.words).flush([aWord(), aWord({ id: 2, label: 'chat' })]);
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    expect(api.words.value()?.map((word) => word.label)).toEqual(['lapin', 'chat']);
  });

  it('forgets the kept list at sign-out', async () => {
    await loadList();
    session.status.set('signed-out');
    TestBed.tick();

    expect(api.words.hasValue()).toBe(false);
  });

  it('appends a created word to the loaded list without fetching it again', async () => {
    await loadList();
    const created = api.create({
      label: 'chat',
      pronunciation: { spoken: 'ka', status: 'learning', date: '2026-10-17' },
    });
    http.expectOne(API_ENDPOINTS.words).flush(aWord({ id: 2, label: 'chat' }));
    await created;

    expect(api.words.value()?.map((word) => word.label)).toEqual(['lapin', 'chat']);
  });

  it('never tags as news a word or a stage this device adds', async () => {
    await loadList();
    const later = '2099-01-01T00:00:00Z';
    const word = aWord({
      id: 2,
      label: 'chat',
      createdAt: later,
      pronunciations: [aPronunciation({ id: 20, wordId: 2, createdAt: later })],
    });
    const created = api.create({
      label: 'chat',
      pronunciation: { spoken: 'ka', status: 'learning', date: '2026-10-17' },
    });
    http.expectOne(API_ENDPOINTS.words).flush(word);
    await created;
    const stage = aPronunciation({ id: 21, wordId: 2, createdAt: '2099-01-02T00:00:00Z' });
    const added = api.addPronunciation(2, { spoken: 'sa', status: 'almost', date: '2026-10-18' });
    http.expectOne(API_ENDPOINTS.wordPronunciations(2)).flush(stage);
    await added;

    const seen = TestBed.inject(SeenWords);
    expect(seen.changeOf(word)).toBeNull();
    expect(seen.changeOf({ ...word, pronunciations: [...word.pronunciations, stage] })).toBeNull();
  });

  it('fetches the list again when a word is created before the list has loaded', async () => {
    session.status.set('signed-in');
    TestBed.tick();
    const stale = http.expectOne({ method: 'GET', url: API_ENDPOINTS.words });
    const created = api.create({
      label: 'chat',
      pronunciation: { spoken: 'ka', status: 'learning', date: '2026-10-17' },
    });
    http
      .expectOne({ method: 'POST', url: API_ENDPOINTS.words })
      .flush(aWord({ id: 2, label: 'chat' }));
    await created;

    // The list sent before the write comes back without the new word.
    stale.flush([aWord()]);
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    http
      .expectOne({ method: 'GET', url: API_ENDPOINTS.words })
      .flush([aWord(), aWord({ id: 2, label: 'chat' })]);
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();

    expect(api.words.value()?.map((word) => word.label)).toEqual(['lapin', 'chat']);
  });

  it('moves a sound to another stage and keeps its place in the word', async () => {
    await loadList([aWord({ recordings: [aRecording({ id: 5 }), aRecording({ id: 6 })] })]);

    const move = api.moveRecording(5, 11);
    const request = http.expectOne(API_ENDPOINTS.recording(5));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ pronunciationId: 11 });
    request.flush(aRecording({ id: 5, pronunciationId: 11 }));
    await move;

    expect(
      api.words
        .value()?.[0]
        .recordings.map((recording) => [recording.id, recording.pronunciationId]),
    ).toEqual([
      [5, 11],
      [6, 10],
    ]);
  });

  it('files a sound under a stage as raw audio with its duration and lists it first in its word', async () => {
    await loadList();
    const audio = new Blob(['x'], { type: 'audio/webm' });

    const upload = api.addRecording(10, audio, 2345.6);
    const request = http.expectOne((req) => req.url === API_ENDPOINTS.pronunciationRecordings(10));
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Content-Type')).toBe('audio/webm');
    expect(request.request.params.get('durationMs')).toBe('2346');
    request.flush(aRecording({ id: 77, wordId: 1 }));
    await upload;

    expect(api.words.value()?.[0].recordings.map((recording) => recording.id)).toEqual([77]);
  });

  describe('deletions', () => {
    afterEach(() => vi.useRealTimers());

    /**
     * Loads `words`, then freezes time so the undo window only ends when a test says so.
     */
    async function loadWithClock(words = [aWord()]): Promise<void> {
      await loadList(words);
      vi.useFakeTimers();
    }

    it('takes a sound away at once and sends its deletion when the undo window ends', async () => {
      await loadWithClock([aWord({ recordings: [aRecording({ id: 5 }), aRecording({ id: 6 })] })]);

      api.removeLater({ kind: 'recording', id: 5 }, 'Son supprimé', 'Raté');
      expect(api.words.value()?.[0].recordings.map((recording) => recording.id)).toEqual([6]);
      expect(TestBed.inject(ToastQueue).current()?.action?.label).toBe('Annuler');
      http.expectNone(API_ENDPOINTS.recording(5));

      vi.advanceTimersByTime(UNDO_WINDOW_MS);
      const request = http.expectOne(API_ENDPOINTS.recording(5));
      expect(request.request.method).toBe('DELETE');
      request.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('puts a word back untouched on undo and never sends its deletion', async () => {
      const lapin = aWord();
      await loadWithClock([lapin]);

      api.removeLater({ kind: 'word', id: 1 }, 'Supprimé', 'Raté');
      expect(api.words.value()).toEqual([]);
      TestBed.inject(ToastQueue).runAction();

      expect(api.words.value()).toEqual([lapin]);
      vi.advanceTimersByTime(UNDO_WINDOW_MS);
      http.expectNone(API_ENDPOINTS.word(1));
    });

    it('keeps a pending deletion out of a list fetched meanwhile', async () => {
      await loadWithClock([aWord(), aWord({ id: 2, label: 'chat' })]);
      api.removeLater({ kind: 'word', id: 2 }, 'Supprimé', 'Raté');
      vi.useRealTimers();

      api.words.reload();
      TestBed.tick();
      http.expectOne(API_ENDPOINTS.words).flush([aWord(), aWord({ id: 2, label: 'chat' })]);
      await new Promise((resolve) => setTimeout(resolve));
      TestBed.tick();

      expect(api.words.value()?.map((word) => word.label)).toEqual(['lapin']);
      const flushed = api.flushRemovals();
      http.expectOne(API_ENDPOINTS.word(2)).flush(null, { status: 204, statusText: 'No Content' });
      await flushed;
    });

    it('puts a stage back and says so when the server refuses its deletion', async () => {
      const lapin = aWord({
        pronunciations: [
          aPronunciation({ id: 10 }),
          aPronunciation({ id: 11, date: '2026-10-12' }),
        ],
      });
      await loadWithClock([lapin]);
      const stageId = 11;

      api.removeLater({ kind: 'pronunciation', id: stageId }, 'Retirée', 'Pas retirée');
      vi.advanceTimersByTime(UNDO_WINDOW_MS);
      http
        .expectOne(API_ENDPOINTS.pronunciation(stageId))
        .flush(null, { status: 500, statusText: 'Server Error' });
      await vi.waitFor(() => expect(api.words.value()).toEqual([lapin]));

      expect(TestBed.inject(ToastQueue).current()).toMatchObject({
        text: 'Pas retirée',
        tone: 'error',
      });
    });

    it('accepts a deletion the server had already made from another phone', async () => {
      await loadWithClock();

      api.removeLater({ kind: 'word', id: 1 }, 'Supprimé', 'Raté');
      vi.advanceTimersByTime(UNDO_WINDOW_MS);
      http.expectOne(API_ENDPOINTS.word(1)).flush(null, { status: 404, statusText: 'Not Found' });
      await Promise.resolve();

      expect(api.words.value()).toEqual([]);
      expect(TestBed.inject(ToastQueue).current()?.tone).not.toBe('error');
    });

    it('sends pending deletions at once when the app leaves the screen', async () => {
      await loadWithClock();
      api.removeLater({ kind: 'word', id: 1 }, 'Supprimé', 'Raté');

      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      document.dispatchEvent(new Event('visibilitychange'));

      http.expectOne(API_ENDPOINTS.word(1)).flush(null, { status: 204, statusText: 'No Content' });
    });
  });
});
