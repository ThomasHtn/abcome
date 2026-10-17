import { TestBed } from '@angular/core/testing';

import { AudioButton } from './audio-button';

/**
 * Players created by the component, to inspect and finish them.
 */
const players: FakeAudio[] = [];

/**
 * Stand-in for `Audio`: jsdom cannot play sound, so `play` resolves at once.
 */
class FakeAudio extends EventTarget {
  /**
   * Playback position, reset by the component before each play.
   */
  public currentTime = 0;

  /**
   * Starts "playing".
   */
  public readonly play = vi.fn(() => Promise.resolve());

  /**
   * Pauses.
   */
  public readonly pause = vi.fn();

  /**
   * Records the player so the test can reach it.
   */
  constructor(public readonly src: string) {
    super();
    players.push(this);
  }
}

describe('AudioButton', () => {
  beforeEach(() => {
    players.length = 0;
    vi.stubGlobal('Audio', FakeAudio);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('plays its source on tap, then offers to stop, and comes back at the end', async () => {
    const fixture = TestBed.createComponent(AudioButton);
    fixture.componentRef.setInput('src', '/api/recordings/7');
    fixture.componentRef.setInput('label', 'Écouter le son de « apin »');
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.getAttribute('aria-label')).toBe('Écouter le son de « apin »');

    button?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(players[0].src).toBe('/api/recordings/7');
    expect(players[0].play).toHaveBeenCalled();
    expect(button?.getAttribute('aria-label')).toBe('Arrêter le son');

    players[0].dispatchEvent(new Event('ended'));
    fixture.detectChanges();
    expect(button?.getAttribute('aria-label')).toBe('Écouter le son de « apin »');
  });
});
