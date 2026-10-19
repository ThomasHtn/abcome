import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';

import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { BrandedTitleStrategy } from './branded-title-strategy';

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

  /**
   * Lets the branding resource settle on its macrotask.
   */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  }

  it('follows the page title with the app name once the server gives it', async () => {
    await router.navigateByUrl('/words');
    TestBed.tick();
    expect(document.title).toBe('Mot');

    http.expectOne(API_ENDPOINTS.branding).flush({ name: 'ABLéa', nameAccent: 'Léa' });
    await settle();
    expect(document.title).toBe('Mot · ABLéa');

    await router.navigateByUrl('/');
    TestBed.tick();
    expect(document.title).toBe('ABLéa');
  });
});
