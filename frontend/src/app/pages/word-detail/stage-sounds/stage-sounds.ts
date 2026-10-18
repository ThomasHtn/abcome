import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Recording } from '@core/words/word.model';
import { Icon } from '@shared/icon/icon';
import { VoiceNote } from '@shared/voice-note/voice-note';

import { GallerySound } from '../word-detail.model';

/**
 * Sounds filed under one stage of the word, newest first, inside its card: each a voice note with a
 * quiet "⋮" opening its actions.
 */
@Component({
  selector: 'app-stage-sounds',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, VoiceNote],
  templateUrl: './stage-sounds.html',
  styleUrl: './stage-sounds.scss',
})
export class StageSounds {
  /**
   * The stage's sounds, ready to render, newest first.
   */
  public readonly sounds = input.required<GallerySound[]>();

  /**
   * Screen reader name of the list, naming the stage ("Sons de « apin »").
   */
  public readonly label = input.required<string>();

  /**
   * Asks the page to offer a sound's actions (move, delete).
   */
  public readonly actions = output<Recording>();
}
