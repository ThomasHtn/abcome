import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ServerStatus } from '@core/http/server-status';

import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
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
});
