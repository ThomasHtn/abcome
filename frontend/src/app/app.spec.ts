import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { ServerStatus } from '@core/http/server-status';

import { App } from './app';

describe('App', () => {
  // The shell loads the outbox and the milestone drawer apart: let them finish before the test ends.
  afterEach(async () => {
    await import('@core/outbox/sound-outbox');
    await import('@shared/milestone-sheet/milestone-sheet');
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('hosts the screen column and the shared feedback', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('main router-outlet')).not.toBeNull();
    expect(element.querySelector('app-toast-outlet [role="status"]')).not.toBeNull();
    expect(element.querySelector('app-celebration-burst')).not.toBeNull();
  });

  it('shows the outage band with a retry while the server does not answer', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector<HTMLElement>('[role="alert"]')?.hidden).toBe(true);

    TestBed.inject(ServerStatus).down.set(true);
    fixture.detectChanges();

    const band = element.querySelector('[role="alert"]');
    expect(band?.textContent).toContain("Le carnet ne répond pas pour l'instant.");
    expect(band?.querySelector('button')?.textContent?.trim()).toBe('Réessayer');
  });

  it('fades out the start-up screen once the first screen is settled', async () => {
    const splash = document.createElement('div');
    splash.className = 'app-splash';
    document.body.append(splash);
    TestBed.createComponent(App).detectChanges();
    expect(splash.classList).not.toContain('app-splash--leaving');

    await TestBed.inject(Router).navigateByUrl('/');

    expect(splash.classList).toContain('app-splash--leaving');
    splash.remove();
  });
});
