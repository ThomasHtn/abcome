import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';

import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { BrandedTitleStrategy } from './branded-title-strategy';
import { BrandingApi } from './branding-api';

/**
 * Empty screen for the test routes.
 */
@Component({ template: '' })
class Blank {}

describe('BrandedTitleStrategy', () => {
  let router: Router;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: Blank },
          { path: 'words', title: 'routes.word', component: Blank },
        ]),
        { provide: TitleStrategy, useExisting: BrandedTitleStrategy },
      ],
    });
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('follows the page title with the app name once the server gives it', async () => {
    await router.navigateByUrl('/words');
    TestBed.tick();
    expect(document.title).toBe('Mot');

    const loaded = TestBed.inject(BrandingApi).load();
    http
      .expectOne(API_ENDPOINTS.branding)
      .flush({ name: 'ABLéa', nameAccent: 'Léa', timeZone: 'Europe/Paris' });
    await loaded;
    TestBed.tick();
    expect(document.title).toBe('Mot · ABLéa');

    await router.navigateByUrl('/');
    TestBed.tick();
    expect(document.title).toBe('ABLéa');
  });
});
