import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Tile at the start of a word or sentence card: the child's age the first time ("17" over "mois"),
 * salmon, or the day when his birth date is unknown ("16" over "sept"), lavender. Decorative, the card
 * names the date.
 */
@Component({
  selector: 'app-date-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-tile.html',
  styleUrl: './date-tile.scss',
  host: { 'aria-hidden': 'true', '[class.date-tile--age]': 'age()' },
})
export class DateTile {
  /**
   * Big number: months of age, or day of the month ("17", "16").
   */
  public readonly value = input.required<string>();

  /**
   * Small word under it ("mois", "sept").
   */
  public readonly unit = input.required<string>();

  /**
   * Whether it tells the age, drawn salmon with its unit in lower case.
   */
  public readonly age = input(false);
}
