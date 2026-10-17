import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { catchError, throwError } from 'rxjs';

import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { loginUrlTree } from './auth.utils';
import { AuthSession } from './auth-session';

/**
 * Calls whose 401 is an answer rather than an expired session: the check and a wrong password.
 */
const EXPECTED_401_URLS: readonly string[] = [API_ENDPOINTS.session, API_ENDPOINTS.login];

/**
 * Sends the visitor back to the login screen when the server refuses the session (expired, password changed).
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (request, next) => {
  if (EXPECTED_401_URLS.includes(request.url)) {
    return next(request);
  }

  const session = inject(AuthSession);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized) {
        session.markSignedOut();
        void router.navigateByUrl(loginUrlTree(router, router.url));
      }
      return throwError(() => error);
    }),
  );
};
