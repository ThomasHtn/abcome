import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';

import { unauthorizedInterceptor } from '@core/auth/unauthorized.interceptor';
import { BrandedTitleStrategy } from '@core/branding/branded-title-strategy';
import { serverStatusInterceptor } from '@core/http/server-status.interceptor';
import { reloadOnStaleBuild } from '@core/http/stale-build.utils';
import { provideI18n } from '@core/i18n/i18n.providers';

import { routes } from './app.routes';

/**
 * Application providers; zoneless by default, so state lives in signals.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Texts in the browser's language, loaded before the first screen.
    provideI18n(),
    // A new screen opens at its top; going back returns to where the list was left; a screen whose
    // bundle went away with a deployment is loaded afresh.
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      withNavigationErrorHandler(reloadOnStaleBuild),
    ),
    // Tab titles end with the app name, set per deployment.
    { provide: TitleStrategy, useExisting: BrandedTitleStrategy },
    // Same origin as the API: echoes Spring's `XSRF-TOKEN` cookie on every write.
    provideHttpClient(
      withFetch(),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
      withInterceptors([unauthorizedInterceptor, serverStatusInterceptor]),
    ),
  ],
};
