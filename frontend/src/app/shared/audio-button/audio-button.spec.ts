import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastQueue } from '@core/feedback/toast-queue';

import { AudioButton } from './audio-button';

/**
 * Players created by the component, to inspect and finish them.
 */
const players: FakeAudio[] = [];

/**
 * What the next `play` returns, so a test can make it fail.
 */
let playResult: () => Promise<void> = () => Promise.resolve();

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
  public readonly play = vi.fn(() => playResult());

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
    playResult = () => Promise.resolve();
    vi.stubGlobal('Audio', FakeAudio);
  });

  afterEach(() => vi.unstubAllGlobals());

  /**
   * Renders a button for a sound, then taps it.
   */
  async function renderAndTap(): Promise<ComponentFixture<AudioButton>> {
    const fixture = TestBed.createComponent(AudioButton);
    fixture.componentRef.setInput('src', '/api/recordings/7');
    fixture.componentRef.setInput('label', 'Écouter');
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  /**
   * Name of the button, which tells whether it plays.
   */
  function label(fixture: ComponentFixture<AudioButton>): string | null | undefined {
    return (fixture.nativeElement as HTMLElement)
      .querySelector('button')
      ?.getAttribute('aria-label');
  }

  it('says when the device cannot play the sound, back to the play icon', async () => {
    playResult = () => Promise.reject(new DOMException('no decoder', 'NotSupportedError'));
    const fixture = await renderAndTap();

    expect(label(fixture)).toBe('Écouter');
    expect(TestBed.inject(ToastQueue).current()).toMatchObject({
      text: "Ce son n'a pas pu être lu sur cet appareil.",
      tone: 'error',
    });
  });

  it('tells a failure while playing only once, even when the start then fails too', async () => {
    let refuse: (error: unknown) => void = () => undefined;
    playResult = () => new Promise<void>((_, reject) => (refuse = reject));
    const show = vi.spyOn(TestBed.inject(ToastQueue), 'show');
    const fixture = await renderAndTap();
    expect(label(fixture)).toBe('Arrêter le son');

    players[0].dispatchEvent(new Event('error'));
    refuse(new DOMException('network', 'NotSupportedError'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(label(fixture)).toBe('Écouter');
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when a stop interrupts the start', async () => {
    playResult = () => Promise.reject(new DOMException('interrupted by pause', 'AbortError'));
    const fixture = await renderAndTap();

    expect(label(fixture)).toBe('Écouter');
    expect(TestBed.inject(ToastQueue).current()).toBeNull();
  });

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

  it('stops the sound of another button when it starts, so two never overlap', async () => {
    const buttons = ['/api/recordings/7', '/api/recordings/8'].map((src) => {
      const fixture = TestBed.createComponent(AudioButton);
      fixture.componentRef.setInput('src', src);
      fixture.componentRef.setInput('label', 'Écouter');
      fixture.detectChanges();
      return fixture;
    });
    const tap = async (index: number): Promise<void> => {
      (buttons[index].nativeElement as HTMLElement).querySelector('button')?.click();
      await buttons[index].whenStable();
      buttons[index].detectChanges();
    };

    await tap(0);
    await tap(1);
    buttons[0].detectChanges();

    expect(players[0].pause).toHaveBeenCalled();
    expect(players[1].pause).not.toHaveBeenCalled();
    const label = (index: number) =>
      (buttons[index].nativeElement as HTMLElement)
        .querySelector('button')
        ?.getAttribute('aria-label');
    expect(label(0)).toBe('Écouter');
    expect(label(1)).toBe('Arrêter le son');
  });

  it('reports the playback position while playing, and 0 once stopped', async () => {
    const fixture = TestBed.createComponent(AudioButton);
    fixture.componentRef.setInput('src', '/api/recordings/7');
    fixture.componentRef.setInput('label', 'Écouter');
    fixture.detectChanges();
    const positions: number[] = [];
    fixture.componentInstance.positionChange.subscribe((position) => positions.push(position));

    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
    await fixture.whenStable();
    players[0].currentTime = 1.2;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    players[0].dispatchEvent(new Event('ended'));

    expect(positions).toContain(1200);
    expect(positions.at(-1)).toBe(0);
  });
});
