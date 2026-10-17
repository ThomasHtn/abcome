import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { authGuard, guestGuard } from './auth.guards';
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
    expect(String(result)).toBe('/connexion');
  });

  it('remembers the page a signed-out visitor wanted', async () => {
    withSession(false);
    expect(String(await run(authGuard, '/mots/3'))).toBe('/connexion?retour=%2Fmots%2F3');
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
