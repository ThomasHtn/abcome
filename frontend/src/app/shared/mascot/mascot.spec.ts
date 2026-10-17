import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mascot } from './mascot';
import { MASCOT_JUMP_MS } from './mascot.constants';

describe('Mascot', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /**
   * Renders the mascot with the given inputs.
   */
  function render(inputs: Record<string, unknown>): ComponentFixture<Mascot> {
    const fixture = TestBed.createComponent(Mascot);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('shows the asset of the requested state with its description', () => {
    const element = render({ state: 'hiding', size: 80 }).nativeElement as HTMLElement;

    const image = element.querySelector('img');
    expect(image?.getAttribute('src')).toContain('assets/mascot/hiding.svg');
    expect(image?.getAttribute('alt')).toBe('Lapinou se cache les yeux');
    expect(image?.getAttribute('height')).toBe('100');
  });

  it("loads the asset first when it is the screen's largest image", () => {
    const element = render({ priority: true }).nativeElement as HTMLElement;

    expect(element.querySelector('img')?.getAttribute('fetchpriority')).toBe('high');
  });

  it('jumps on tap with a fresh image, then returns to its state', () => {
    const fixture = render({ tappable: true });
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector('button');
    expect(button?.getAttribute('aria-label')).toBe('Faire coucou à Lapinou');

    button?.click();
    fixture.detectChanges();
    const firstJump = element.querySelector('img');
    expect(firstJump?.getAttribute('src')).toContain('jump.svg');

    button?.click();
    fixture.detectChanges();
    expect(element.querySelector('img')).not.toBe(firstJump);

    vi.advanceTimersByTime(MASCOT_JUMP_MS);
    fixture.detectChanges();
    expect(element.querySelector('img')?.getAttribute('src')).toContain('idle.svg');
  });
});
