import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Square white header button holding one icon (back, log out, delete) on a native `<button>` or `<a>`.
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
  },
})
export class IconButton {
  /**
   * `danger` draws the icon in red, for a destructive action.
   */
  public readonly tone = input<'default' | 'danger'>('default');
}
