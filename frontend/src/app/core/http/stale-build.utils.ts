import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { NavigationError } from '@angular/router';

import {
  STALE_BUILD_ERROR,
  STALE_BUILD_RELOAD_KEY,
  STALE_BUILD_RELOAD_PAUSE_MS,
} from './stale-build.constants';

/**
 * Loads the target screen afresh when its bundle is gone after a deployment, as an app left open
 * for days still names the old ones; once per pause, and only online, so a lasting failure or a
 * missing network never loops. Runs in the router's injection context.
 */
export function reloadOnStaleBuild(error: NavigationError): void {
  const window = inject(DOCUMENT).defaultView;
  if (!window?.navigator.onLine || !isStaleBuildError(error.error) || reloadedLately(window)) {
    return;
  }
  try {
    window.sessionStorage.setItem(STALE_BUILD_RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
  window.location.assign(error.url);
}

/**
 * Whether a navigation failed on a lazy bundle the server no longer has.
 */
export function isStaleBuildError(error: unknown): boolean {
  return error instanceof Error && STALE_BUILD_ERROR.test(error.message);
}

/**
 * Whether a stale build reload happened within the pause; unreadable storage counts as yes.
 */
function reloadedLately(window: Window): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(STALE_BUILD_RELOAD_KEY));
    return Date.now() - last < STALE_BUILD_RELOAD_PAUSE_MS;
  } catch {
    return true;
  }
}
