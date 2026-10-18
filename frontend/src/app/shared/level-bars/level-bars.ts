import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { barCapacity, fitLevels } from './level-bars.utils';

/**
 * Height range of a bar, in pixels, per size.
 */
const BAR_HEIGHTS = { lg: { min: 6, max: 84 }, sm: { min: 4, max: 38 } } as const;

/**
 * Width of a bar in rem per size, as in the stylesheet, so the count follows the text zoom.
 */
const BAR_WIDTHS_REM = { lg: 0.3125, sm: 0.25 } as const;

/**
 * Waveform of a sound: one bar per loudness level (0 to 1), the bars already heard darker while it
 * plays. Decorative, the clock and the buttons say the state.
 */
@Component({
  selector: 'app-level-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './level-bars.html',
  styleUrl: './level-bars.scss',
})
export class LevelBars {
  /**
   * Host element, measured to know how many bars fit.
   */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Bars that fit across the host, `null` until measured (and in tests, without layout).
   */
  private readonly capacity = signal<number | null>(null);

  /**
   * Loudness of each bar, 0 to 1.
   */
  public readonly levels = input.required<readonly number[]>();

  /**
   * `idle` grey before recording, `live` red while recording, `clip` lavender once recorded,
   * `played` dark lavender while it plays.
   */
  public readonly tone = input<'idle' | 'live' | 'clip' | 'played'>('idle');

  /**
   * `lg` main waveform, `sm` the strip next to a play button.
   */
  public readonly size = input<'lg' | 'sm'>('lg');

  /**
   * Share of the sound already played, 0 to 1, drawn as darker bars sweeping across.
   */
  public readonly progress = input(0);

  /**
   * Levels drawn: all of them, or fewer and merged when the screen is too narrow or zoomed in.
   */
  protected readonly shownLevels = computed(() => fitLevels(this.levels(), this.capacity()));

  /**
   * Number of bars already played, from the left.
   */
  protected readonly playedBars = computed(() =>
    Math.round(this.shownLevels().length * Math.min(1, Math.max(0, this.progress()))),
  );

  /**
   * Measures the room for bars after the first render and whenever the host is resized.
   */
  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => this.measure());
      observer.observe(this.host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /**
   * Height of a bar for `level`, never flat so silence still draws a line.
   */
  protected height(level: number): number {
    const { min, max } = BAR_HEIGHTS[this.size()];
    return Math.round(min + (max - min) * Math.min(1, Math.max(0, level)));
  }

  /**
   * Bars of this size, with the gap of the row, that fit across the host.
   */
  private measure(): void {
    const element = this.host.nativeElement;
    const row = element.firstElementChild;
    if (!row) {
      return;
    }
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    this.capacity.set(barCapacity(element.clientWidth, BAR_WIDTHS_REM[this.size()] * rem, gap));
  }
}
