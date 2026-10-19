import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';

import { LevelBars } from '@shared/level-bars/level-bars';

import { TRIM_STEPS_MS } from '../recording-new.constants';
import { TrimEdge, TrimGrab, TrimRange } from '../recording-new.model';
import { moveTrimEdge, spokenSeconds } from '../recording-new.utils';

/**
 * Waveform of a fresh recording framed by two handles, like a soundboard editor: dragging them, or
 * the arrow keys, cuts the start and the end; the cut parts are dimmed.
 */
@Component({
  selector: 'app-recording-trim',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LevelBars, TranslocoPipe],
  templateUrl: './recording-trim.html',
  styleUrl: './recording-trim.scss',
})
export class RecordingTrim {
  /**
   * Strip the handles slide along, measured to turn a pointer position into a time.
   */
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  /**
   * Handle held by the pointer, `null` when none.
   */
  private grabbed: TrimGrab | null = null;

  /**
   * Loudness of the whole recording, 0 to 1.
   */
  public readonly levels = input.required<readonly number[]>();

  /**
   * Length of the whole recording, the scale of the handles.
   */
  public readonly durationMs = input.required<number>();

  /**
   * Playback position inside the kept part, `null` while it is not playing.
   */
  public readonly positionMs = input<number | null>(null);

  /**
   * Kept part, updated live while a handle moves.
   */
  public readonly range = model.required<TrimRange>();

  /**
   * Emitted once a handle is let go or moved by a key, with the new kept part.
   */
  public readonly settled = output<TrimRange>();

  /**
   * Handle being dragged, to show it held.
   */
  protected readonly dragging = signal<TrimEdge | null>(null);

  /**
   * Start of the kept part across the strip, in %.
   */
  protected readonly startPercent = computed(() => this.percent(this.range().startMs));

  /**
   * End of the kept part across the strip, in %.
   */
  protected readonly endPercent = computed(() => this.percent(this.range().endMs));

  /**
   * Playback line across the strip, in %, `null` while silent.
   */
  protected readonly playheadPercent = computed(() => {
    const position = this.positionMs();
    return position === null ? null : this.percent(this.range().startMs + position);
  });

  /**
   * Share of the strip already played, to darken the bars up to the playback line.
   */
  protected readonly progress = computed(() => (this.playheadPercent() ?? 0) / 100);

  /**
   * Screen reader value of each handle ("1,4 seconde").
   */
  protected readonly valueTexts = computed(() => ({
    start: spokenSeconds(this.range().startMs),
    end: spokenSeconds(this.range().endMs),
  }));

  /**
   * Catches a handle under the pointer; it follows the pointer even outside the strip.
   */
  protected grab(edge: TrimEdge, event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    // No text selection nor scroll while dragging; focus is given back by hand for the keys.
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    handle.focus();
    const range = this.range();
    const edgePx = this.toPx(edge === 'start' ? range.startMs : range.endMs);
    this.grabbed = { edge, offsetPx: event.clientX - edgePx, from: range };
    this.dragging.set(edge);
  }

  /**
   * Moves the held handle with the pointer.
   */
  protected drag(event: PointerEvent): void {
    if (!this.grabbed) {
      return;
    }
    const { left, width } = this.track().nativeElement.getBoundingClientRect();
    const ms = ((event.clientX - this.grabbed.offsetPx - left) / width) * this.durationMs();
    this.range.set(moveTrimEdge(this.range(), this.grabbed.edge, ms, this.durationMs()));
  }

  /**
   * Lets the handle go and reports the new kept part when it moved.
   */
  protected release(): void {
    if (!this.grabbed) {
      return;
    }
    const { from } = this.grabbed;
    this.grabbed = null;
    this.dragging.set(null);
    const range = this.range();
    if (range.startMs !== from.startMs || range.endMs !== from.endMs) {
      this.settled.emit(range);
    }
  }

  /**
   * Moves a handle with the keys of a slider: arrows by a tenth, Page Up/Down by a second,
   * Home/End to the ends.
   */
  protected nudge(edge: TrimEdge, event: KeyboardEvent): void {
    const range = this.range();
    const target = this.keyTarget(event.key, edge === 'start' ? range.startMs : range.endMs);
    if (target === null) {
      return;
    }
    event.preventDefault();
    const next = moveTrimEdge(range, edge, target, this.durationMs());
    if (next.startMs !== range.startMs || next.endMs !== range.endMs) {
      this.range.set(next);
      this.settled.emit(next);
    }
  }

  /**
   * Time a key sends the handle to, `null` for a key that is not a slider key.
   */
  private keyTarget(key: string, current: number): number | null {
    switch (key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        return current - TRIM_STEPS_MS.fine;
      case 'ArrowRight':
      case 'ArrowUp':
        return current + TRIM_STEPS_MS.fine;
      case 'PageDown':
        return current - TRIM_STEPS_MS.coarse;
      case 'PageUp':
        return current + TRIM_STEPS_MS.coarse;
      case 'Home':
        return 0;
      case 'End':
        return this.durationMs();
      default:
        return null;
    }
  }

  /**
   * Position of `ms` across the strip, in %.
   */
  private percent(ms: number): number {
    const duration = this.durationMs();
    return duration > 0 ? (ms / duration) * 100 : 0;
  }

  /**
   * Position of `ms` on the screen, in px.
   */
  private toPx(ms: number): number {
    const { left, width } = this.track().nativeElement.getBoundingClientRect();
    return left + (this.percent(ms) / 100) * width;
  }
}
