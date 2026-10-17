import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Lavender calendar tile at the start of a word or sentence card; decorative, the card names the date.
 */
@Component({
  selector: 'app-date-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-tile.html',
  styleUrl: './date-tile.scss',
  host: { 'aria-hidden': 'true' },
})
export class DateTile {
  /**
   * Day of the month ("16").
   */
  public readonly day = input.required<string>();

  /**
   * Short month without its dot ("sept").
   */
  public readonly month = input.required<string>();
}
