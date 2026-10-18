import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthSession } from '@core/auth/auth-session';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { aRecording, aWord } from './word.fixtures';
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

    await TestBed.inject(Router).navigateByUrl('/mots/1');
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

    await TestBed.inject(Router).navigateByUrl('/?onglet=phrases&q=ch');
    TestBed.tick();

    http.expectNone(API_ENDPOINTS.words);
  });

  it('fetches the list again when the app comes back to the screen', async () => {
    await loadList();

    document.dispatchEvent(new Event('visibilitychange'));
    TestBed.tick();

    http.expectOne(API_ENDPOINTS.words).flush([aWord()]);
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

  it('removes a deleted sound from its word gallery', async () => {
    await loadList([aWord({ recordings: [aRecording({ id: 5 }), aRecording({ id: 6 })] })]);

    const removal = api.removeRecording(5);
    const request = http.expectOne(API_ENDPOINTS.recording(5));
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await removal;

    expect(api.words.value()?.[0].recordings.map((recording) => recording.id)).toEqual([6]);
  });

  it('removes a deleted word from the list', async () => {
    await loadList();
    const removal = api.remove(1);
    http.expectOne(API_ENDPOINTS.word(1)).flush(null, { status: 204, statusText: 'No Content' });
    await removal;

    expect(api.words.value()).toEqual([]);
  });
});
