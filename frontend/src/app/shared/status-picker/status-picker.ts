import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { translate, TranslocoPipe } from '@jsverse/transloco';

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
  imports: [NgOptimizedImage, TranslocoPipe],
  templateUrl: './status-picker.html',
  styleUrl: './status-picker.scss',
})
export class StatusPicker {
  /**
   * Selected status, two-way bound.
   */
  public readonly value = model<PronunciationStatus>('almost');

  /**
   * Group legend; "Prononciation" when not given.
   */
  public readonly label = input<string>();

  /**
   * Legend as shown.
   */
  protected readonly shownLabel = computed(() => this.label() ?? translate('statusPicker.label'));

  /**
   * Statuses in picker order, furthest first.
   */
  protected readonly statuses = PRONUNCIATION_STATUSES;

  /**
   * Translation keys of the tile labels.
   */
  protected readonly labels = STATUS_LABELS;

  /**
   * Radio group name of this picker.
   */
  protected readonly name = `status-picker-${nextPickerId++}`;
}
