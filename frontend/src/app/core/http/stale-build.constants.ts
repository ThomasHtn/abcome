/**
 * Messages of a failed lazy bundle import (Chrome, Firefox, Safari): the build it names is gone.
 */
export const STALE_BUILD_ERROR = /dynamically imported module|module script failed/iu;

/**
 * Session storage key of the last reload for a stale build, so a lasting failure cannot loop.
 */
export const STALE_BUILD_RELOAD_KEY = 'littlewords.stale-build-reload';

/**
 * Time after a stale build reload during which another one is not tried: 30 seconds.
 */
export const STALE_BUILD_RELOAD_PAUSE_MS = 30_000;
