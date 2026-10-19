import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthSession } from '@core/auth/auth-session';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { DictionaryApi } from './dictionary-api';

describe('DictionaryApi', () => {
  let api: DictionaryApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(DictionaryApi);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthSession).status.set('signed-in');
    TestBed.tick();
  });

  afterEach(() => http.verify());

  /**
   * Lets the resource settle on its macrotask.
   */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  }

  it('retries a failed load when the network returns', async () => {
    http.expectOne(API_ENDPOINTS.dictionary('fr')).error(new ProgressEvent('error'));
    await settle();

    window.dispatchEvent(new Event('online'));
    TestBed.tick();
    http.expectOne(API_ENDPOINTS.dictionary('fr')).flush([]);
    await settle();

    expect(api.entries.hasValue()).toBe(true);
  });

  it('loads once while it succeeds, even when the app comes back to the screen', async () => {
    http.expectOne(API_ENDPOINTS.dictionary('fr')).flush([]);
    await settle();

    document.dispatchEvent(new Event('visibilitychange'));
    TestBed.tick();

    http.expectNone(API_ENDPOINTS.dictionary('fr'));
  });
});

describe('DictionaryApi in English', () => {
  afterEach(() => {
    document.documentElement.lang = '';
  });

  it('asks for the dictionary of the interface language', () => {
    document.documentElement.lang = 'en';
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(DictionaryApi);
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthSession).status.set('signed-in');
    TestBed.tick();

    http.expectOne('/api/dictionary?language=en').flush([]);
    http.verify();
  });
});
