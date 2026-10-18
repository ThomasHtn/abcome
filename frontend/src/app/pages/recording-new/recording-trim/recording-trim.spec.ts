import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrimRange } from '../recording-new.model';
import { RecordingTrim } from './recording-trim';

describe('RecordingTrim', () => {
  let settled: TrimRange[];

  /**
   * Renders a 3 s recording kept whole.
   */
  function render(): ComponentFixture<RecordingTrim> {
    settled = [];
    const fixture = TestBed.createComponent(RecordingTrim);
    fixture.componentRef.setInput('levels', [0.2, 0.8, 0.5]);
    fixture.componentRef.setInput('durationMs', 3000);
    fixture.componentRef.setInput('range', { startMs: 0, endMs: 3000 });
    fixture.componentInstance.settled.subscribe((range) => settled.push(range));
    fixture.detectChanges();
    return fixture;
  }

  /**
   * The handle named `label`.
   */
  function handle(fixture: ComponentFixture<RecordingTrim>, label: string): HTMLElement {
    const element = fixture.nativeElement as HTMLElement;
    const found = element.querySelector<HTMLElement>(`[aria-label="${label}"]`);
    if (!found) {
      throw new Error(`No handle ${label}`);
    }
    return found;
  }

  it('offers both ends as sliders read in seconds', () => {
    const fixture = render();

    const start = handle(fixture, 'Début du son gardé');
    const end = handle(fixture, 'Fin du son gardé');
    expect(start.getAttribute('role')).toBe('slider');
    expect(start.getAttribute('aria-valuetext')).toBe('0 seconde');
    expect(end.getAttribute('aria-valuetext')).toBe('3 secondes');
  });

  it('moves a handle with the keys, by a tenth or a second, never closer than half a second', () => {
    const fixture = render();
    const start = handle(fixture, 'Début du son gardé');
    const end = handle(fixture, 'Fin du son gardé');

    start.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    start.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp' }));
    end.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    start.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    fixture.detectChanges();

    expect(settled).toEqual([
      { startMs: 100, endMs: 3000 },
      { startMs: 1100, endMs: 3000 },
      { startMs: 1100, endMs: 1600 },
    ]);
    expect(end.getAttribute('aria-valuetext')).toBe('1,6 seconde');
  });

  it('follows the pointer while a handle is held and reports the cut once let go', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const track = element.querySelector<HTMLElement>('.recording-trim');
    vi.spyOn(track as HTMLElement, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 100, width: 300 }),
    );
    const end = handle(fixture, 'Fin du son gardé');
    end.setPointerCapture = vi.fn();
    const pointer = (type: string, clientX: number) =>
      end.dispatchEvent(new MouseEvent(type, { clientX, button: 0, bubbles: true }));

    pointer('pointerdown', 410);
    pointer('pointermove', 360);
    expect(settled).toEqual([]);
    pointer('pointermove', 310);
    pointer('pointerup', 310);

    expect(settled).toEqual([{ startMs: 0, endMs: 2000 }]);
  });
});
