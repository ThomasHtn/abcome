import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { HOME_ROUTE } from './auth.constants';
import { loginUrlTree } from './auth.utils';
import { AuthSession } from './auth-session';

/**
 * Keeps the notebook behind a session; the API stays the real guard, this only avoids an empty screen.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  // Injected before awaiting: the injection context ends at the first `await`.
  const session = inject(AuthSession);
  const router = inject(Router);
  return (await session.ensureChecked()) ? true : loginUrlTree(router, state.url);
};

/**
 * Sends a visitor who is already signed in from the login screen to the home screen.
 */
export const guestGuard: CanActivateFn = async () => {
  // Injected before awaiting: the injection context ends at the first `await`.
  const session = inject(AuthSession);
  const router = inject(Router);
  return (await session.ensureChecked()) ? router.parseUrl(HOME_ROUTE) : true;
};
