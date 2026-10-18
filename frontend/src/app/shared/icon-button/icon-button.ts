import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Square white header button holding one icon (back, log out) on a native `<button>` or `<a>`, a flat
 * lavender disc with `tint` (search toggle), a flat red tile with `danger`, or the icon alone with
 * `ghost` (log out, an action rarely wanted); `sm` for row actions.
 * The caller gives the `aria-label`: an icon alone says nothing to a screen reader.
 */
@Component({
  selector: 'button[app-icon-button], a[app-icon-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
  host: {
    class: 'icon-button',
    '[class.icon-button--danger]': "tone() === 'danger'",
    '[class.icon-button--tint]': "tone() === 'tint'",
    '[class.icon-button--ghost]': "tone() === 'ghost'",
    '[class.icon-button--sm]': "size() === 'sm'",
  },
})
export class IconButton {
  /**
   * `danger` is a flat red tile, for a destructive action; `tint` is a flat lavender disc; `ghost`
   * is the icon alone, for an action that should not draw the eye.
   */
  public readonly tone = input<'default' | 'danger' | 'tint' | 'ghost'>('default');

  /**
   * `md` 48 px header button, `sm` 44 px rounded tile for actions inside a row or card.
   */
  public readonly size = input<'md' | 'sm'>('md');
}
