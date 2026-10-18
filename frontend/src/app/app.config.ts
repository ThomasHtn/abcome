import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { unauthorizedInterceptor } from '@core/auth/unauthorized.interceptor';
import { serverStatusInterceptor } from '@core/http/server-status.interceptor';

import { routes } from './app.routes';

/**
 * Application providers; zoneless by default, so state lives in signals.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // A new screen opens at its top; going back returns to where the list was left.
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    // Same origin as the API: echoes Spring's `XSRF-TOKEN` cookie on every write (docs/spec.md).
    provideHttpClient(
      withFetch(),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
      withInterceptors([unauthorizedInterceptor, serverStatusInterceptor]),
    ),
  ],
};
