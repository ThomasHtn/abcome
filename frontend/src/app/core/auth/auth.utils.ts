import { Router, UrlTree } from '@angular/router';

import { HOME_ROUTE, LOGIN_ROUTE, RETURN_URL_PARAM } from './auth.constants';

/**
 * Login screen remembering `returnUrl`, so signing in again lands where the visitor was.
 * Home and the login screen itself are not worth remembering.
 */
export function loginUrlTree(router: Router, returnUrl: string): UrlTree {
  const remembered = isSafeReturnUrl(returnUrl) && returnUrl !== HOME_ROUTE;
  return router.createUrlTree([LOGIN_ROUTE], {
    queryParams: remembered ? { [RETURN_URL_PARAM]: returnUrl } : {},
  });
}

/**
 * Page to open after signing in: the `returnUrl` parameter when it is an in-app path, else home.
 */
export function returnUrlFrom(param: string | null | undefined): string {
  return param && isSafeReturnUrl(param) ? param : HOME_ROUTE;
}

/**
 * Only in-app paths, never another origin (`//host`, `https:`) nor the login screen itself.
 */
function isSafeReturnUrl(url: string): boolean {
  return (
    url.startsWith('/') &&
    !url.startsWith('//') &&
    !url.startsWith('/\\') &&
    !url.startsWith(LOGIN_ROUTE)
  );
}
