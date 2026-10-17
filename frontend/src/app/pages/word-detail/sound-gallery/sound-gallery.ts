import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Recording } from '@core/words/word.model';
import { AudioButton } from '@shared/audio-button/audio-button';
import { Button } from '@shared/button/button';
import { Icon } from '@shared/icon/icon';
import { IconButton } from '@shared/icon-button/icon-button';
import { QuotePipe } from '@shared/quote/quote.pipe';

import { GallerySound } from '../word-detail.model';

/**
 * "Ses sons": the word's recordings, newest first, each playable and deletable, or an invitation
 * to record the first one.
 */
@Component({
  selector: 'app-sound-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuotePipe, RouterLink, AudioButton, Button, Icon, IconButton],
  templateUrl: './sound-gallery.html',
  styleUrl: './sound-gallery.scss',
})
export class SoundGallery {
  /**
   * The sounds, ready to render, newest first.
   */
  public readonly sounds = input.required<GallerySound[]>();

  /**
   * The word, quoted in the empty state.
   */
  public readonly label = input.required<string>();

  /**
   * Word id, preselected on the recording screen.
   */
  public readonly wordId = input.required<number>();

  /**
   * Asks the page to confirm the deletion of a sound.
   */
  public readonly remove = output<Recording>();
}
