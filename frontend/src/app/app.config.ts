import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';

import { unauthorizedInterceptor } from '@core/auth/unauthorized.interceptor';
import { serverStatusInterceptor } from '@core/http/server-status.interceptor';
import { reloadOnStaleBuild } from '@core/http/stale-build.utils';

import { routes } from './app.routes';

/**
 * Application providers; zoneless by default, so state lives in signals.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // A new screen opens at its top; going back returns to where the list was left; a screen whose
    // bundle went away with a deployment is loaded afresh.
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      withNavigationErrorHandler(reloadOnStaleBuild),
    ),
    // Same origin as the API: echoes Spring's `XSRF-TOKEN` cookie on every write.
    provideHttpClient(
      withFetch(),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
      withInterceptors([unauthorizedInterceptor, serverStatusInterceptor]),
    ),
  ],
};
