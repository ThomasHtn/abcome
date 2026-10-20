import { SPLASH_FADE_MS, SPLASH_LEAVING_CLASS, SPLASH_SELECTOR } from './splash.constants';

/**
 * Fades the start-up screen out, then removes it; a timer rather than `transitionend`, which reduced
 * motion or a hidden tab may never fire.
 */
export function hideSplash(document: Document): void {
  const splash = document.querySelector(SPLASH_SELECTOR);
  if (!splash) {
    return;
  }
  splash.classList.add(SPLASH_LEAVING_CLASS);
  setTimeout(() => splash.remove(), SPLASH_FADE_MS);
}
