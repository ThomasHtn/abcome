import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';

import { tap } from 'rxjs';

import { isServerFailure } from './api-error.utils';
import { ServerStatus } from './server-status';

/**
 * Records whether the server answers: any response clears the outage, a network or server error
 * (0, 5xx) raises it; a 4xx is an answer about the request, so the server is up.
 */
export const serverStatusInterceptor: HttpInterceptorFn = (request, next) => {
  const status = inject(ServerStatus);
  return next(request).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          status.report(false);
        }
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          status.report(isServerFailure(error));
        }
      },
    }),
  );
};
