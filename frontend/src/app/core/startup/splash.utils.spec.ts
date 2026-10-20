import { SPLASH_FADE_MS, SPLASH_LEAVING_CLASS } from './splash.constants';
import { hideSplash } from './splash.utils';

describe('hideSplash', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fades the start-up screen out, then takes it off the page', () => {
    const splash = document.createElement('div');
    splash.className = 'app-splash';
    document.body.append(splash);

    hideSplash(document);
    expect(splash.classList).toContain(SPLASH_LEAVING_CLASS);
    expect(splash.isConnected).toBe(true);

    vi.advanceTimersByTime(SPLASH_FADE_MS);
    expect(splash.isConnected).toBe(false);
  });

  it('does nothing once the screen is gone', () => {
    expect(() => hideSplash(document)).not.toThrow();
  });
});
