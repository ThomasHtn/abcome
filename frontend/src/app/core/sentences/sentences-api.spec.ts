import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthSession } from '@core/auth/auth-session';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { Sentence } from './sentence.model';
import { SentencesApi } from './sentences-api';

/**
 * Sentence with what Côme meant.
 */
const SENTENCE: Sentence = {
  id: 1,
  spoken: 'a pu ato',
  meaning: "Il n'y a plus de gâteau",
  date: '2026-10-14',
};

describe('SentencesApi', () => {
  let api: SentencesApi;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SentencesApi);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthSession).status.set('signed-in');
    TestBed.tick();
    http.expectOne(API_ENDPOINTS.sentences).flush([SENTENCE]);
    // The resource settles on a macrotask.
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  });

  afterEach(() => http.verify());

  it('replaces an edited sentence in place', async () => {
    const update = api.update(1, { spoken: 'a pu gato', meaning: null, date: '2026-10-14' });
    http
      .expectOne(API_ENDPOINTS.sentence(1))
      .flush({ ...SENTENCE, spoken: 'a pu gato', meaning: null });
    await update;

    expect(api.sentences.value()).toEqual([{ ...SENTENCE, spoken: 'a pu gato', meaning: null }]);
  });

  it('fetches the list again when a sentence is added while the list is in error', async () => {
    api.sentences.reload();
    TestBed.tick();
    http
      .expectOne({ method: 'GET', url: API_ENDPOINTS.sentences })
      .flush(null, { status: 500, statusText: 'Server Error' });
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    expect(api.sentences.hasValue()).toBe(false);

    const added = api.create({ spoken: 'encore', meaning: null, date: '2026-10-15' });
    http
      .expectOne({ method: 'POST', url: API_ENDPOINTS.sentences })
      .flush({ id: 2, spoken: 'encore', meaning: null, date: '2026-10-15' });
    await added;
    TestBed.tick();

    http.expectOne({ method: 'GET', url: API_ENDPOINTS.sentences }).flush([SENTENCE]);
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    expect(api.sentences.value()).toEqual([SENTENCE]);
  });

  it('drops a deleted sentence', async () => {
    const removal = api.remove(1);
    http
      .expectOne(API_ENDPOINTS.sentence(1))
      .flush(null, { status: 204, statusText: 'No Content' });
    await removal;

    expect(api.sentences.value()).toEqual([]);
  });
});
