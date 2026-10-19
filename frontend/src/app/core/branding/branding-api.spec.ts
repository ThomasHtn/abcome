import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DEFAULT_TIME_ZONE } from '@core/date/date.constants';
import { setFamilyTimeZone, todayIso } from '@core/date/date.utils';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { BrandingApi } from './branding-api';

describe('BrandingApi', () => {
  let api: BrandingApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(BrandingApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    setFamilyTimeZone(DEFAULT_TIME_ZONE);
  });

  it('gives the name and judges today in the zone of the server', async () => {
    const loaded = api.load();
    http
      .expectOne(API_ENDPOINTS.branding)
      .flush({ name: 'ABLéa', nameAccent: 'Léa', timeZone: 'America/Montreal' });
    await loaded;

    expect(api.name()).toBe('ABLéa');
    expect(api.nameAccent()).toBe('Léa');
    // 03:00 UTC on 17 October is still 16 October in Montreal.
    expect(todayIso(new Date('2026-10-17T03:00:00Z'))).toBe('2026-10-16');
  });

  it('keeps the defaults when the server does not answer', async () => {
    const loaded = api.load();
    http.expectOne(API_ENDPOINTS.branding).flush(null, { status: 503, statusText: 'Unavailable' });
    await loaded;

    expect(api.name()).toBe('');
    expect(todayIso(new Date('2026-10-17T03:00:00Z'))).toBe('2026-10-17');
  });
});
