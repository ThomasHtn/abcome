import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { authGuard, editorGuard, guestGuard } from './auth.guards';
import { AuthSession } from './auth-session';

/**
 * Runs a functional guard in the test injector with empty route snapshots.
 */
function run(guard: CanActivateFn, url = '/'): Promise<unknown> {
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  ) as Promise<unknown>;
}

/**
 * Configures the test injector with a session that answers `signedIn`.
 */
function withSession(signedIn: boolean): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthSession, useValue: { ensureChecked: () => Promise.resolve(signedIn) } },
    ],
  });
}

describe('authGuard', () => {
  it('lets a signed-in visitor through', async () => {
    withSession(true);
    expect(await run(authGuard)).toBe(true);
  });

  it('sends a signed-out visitor to the login screen', async () => {
    withSession(false);
    const result = await run(authGuard);
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result)).toBe('/login');
  });

  it('remembers the page a signed-out visitor wanted', async () => {
    withSession(false);
    expect(String(await run(authGuard, '/words/3'))).toBe('/login?returnUrl=%2Fwords%2F3');
  });
});

describe('editorGuard', () => {
  /**
   * Configures the test injector with a session whose visitor `readOnly` or not.
   */
  function withReader(readOnly: boolean): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthSession, useValue: { readOnly: signal(readOnly) } },
      ],
    });
  }

  it('lets a family member reach a screen that writes', async () => {
    withReader(false);
    expect(await run(editorGuard, '/words/new')).toBe(true);
  });

  it('sends a reader home', async () => {
    withReader(true);
    expect(String(await run(editorGuard, '/words/new'))).toBe('/');
  });
});

describe('guestGuard', () => {
  it('lets a signed-out visitor see the login screen', async () => {
    withSession(false);
    expect(await run(guestGuard)).toBe(true);
  });

  it('sends a signed-in visitor home', async () => {
    withSession(true);
    expect(String(await run(guestGuard))).toBe('/');
  });
});
