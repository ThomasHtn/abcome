import { TestBed } from '@angular/core/testing';
import { NavigationError } from '@angular/router';

import { STALE_BUILD_RELOAD_KEY } from './stale-build.constants';
import { isStaleBuildError, reloadOnStaleBuild } from './stale-build.utils';

describe('isStaleBuildError', () => {
  it('recognises a missing lazy bundle in Chrome, Firefox and Safari', () => {
    expect(isStaleBuildError(new TypeError('Failed to fetch dynamically imported module: x'))).toBe(
      true,
    );
    expect(isStaleBuildError(new TypeError('error loading dynamically imported module'))).toBe(
      true,
    );
    expect(isStaleBuildError(new TypeError('Importing a module script failed.'))).toBe(true);
  });

  it('leaves other navigation errors alone', () => {
    expect(isStaleBuildError(new Error('Cannot match any routes'))).toBe(false);
    expect(isStaleBuildError('dynamically imported module')).toBe(false);
  });
});

describe('reloadOnStaleBuild', () => {
  /**
   * Navigation to `/words/new` that failed on a missing bundle.
   */
  const staleNavigation = new NavigationError(
    1,
    '/words/new',
    new TypeError('Failed to fetch dynamically imported module: chunk-ABC.js'),
  );

  /**
   * Replaces `location.assign`, which would leave the test page.
   */
  let assign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    assign = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ assign } as unknown as Location);
  });

  afterEach(() => vi.restoreAllMocks());

  /**
   * Hands the error to the handler in an injection context, like the router does.
   */
  function handle(error: NavigationError): void {
    TestBed.runInInjectionContext(() => reloadOnStaleBuild(error));
  }

  it('loads the target screen afresh, once per pause', () => {
    handle(staleNavigation);
    handle(staleNavigation);

    expect(assign).toHaveBeenCalledOnce();
    expect(assign).toHaveBeenCalledWith('/words/new');
    expect(sessionStorage.getItem(STALE_BUILD_RELOAD_KEY)).not.toBeNull();
  });

  it('does nothing offline, where a reload would show the browser error page', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    handle(staleNavigation);

    expect(assign).not.toHaveBeenCalled();
  });
});
