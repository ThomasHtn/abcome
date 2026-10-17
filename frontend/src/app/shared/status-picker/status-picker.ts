import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { PRONUNCIATION_STATUSES, STATUS_LABELS } from '@core/words/word.constants';
import { PronunciationStatus } from '@core/words/word.model';

/**
 * Unique radio group name per picker, so two pickers on one page never share a selection.
 */
let nextPickerId = 0;

/**
 * Three large status tiles, built on native radio buttons (arrow keys, screen readers and forms
 * work as usual); each tile shows its glyph and label, never color alone.
 * Usage: `<app-status-picker [(value)]="status" />`.
 */
@Component({
  selector: 'app-status-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  templateUrl: './status-picker.html',
  styleUrl: './status-picker.scss',
})
export class StatusPicker {
  /**
   * Selected status, two-way bound.
   */
  public readonly value = model<PronunciationStatus>('almost');

  /**
   * Group legend.
   */
  public readonly label = input('Prononciation');

  /**
   * Statuses in picker order, furthest first.
   */
  protected readonly statuses = PRONUNCIATION_STATUSES;

  /**
   * French labels of the tiles.
   */
  protected readonly labels = STATUS_LABELS;

  /**
   * Radio group name of this picker.
   */
  protected readonly name = `status-picker-${nextPickerId++}`;
}
