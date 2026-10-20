import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';

import { translate, TranslocoPipe } from '@jsverse/transloco';

import { AuthSession } from '@core/auth/auth-session';
import { Today } from '@core/date/today';
import { Celebration } from '@core/feedback/celebration';
import { ToastQueue } from '@core/feedback/toast-queue';
import {
  milestoneStory,
  milestoneTitle,
  milestoneWhen,
  nextWordStep,
} from '@core/milestones/milestone.utils';
import { MilestoneWatch } from '@core/milestones/milestone-watch';
import { BottomSheet } from '@shared/bottom-sheet/bottom-sheet';
import { Button } from '@shared/button/button';
import { Icon } from '@shared/icon/icon';
import { Mascot } from '@shared/mascot/mascot';
import { MILESTONE_ICONS } from '@shared/milestone-badge/milestone-badge.constants';

/**
 * The big drawer celebrating a milestone: Lapinou jumping over a medal, what the child reached and
 * when, the next step, and confetti. Mounted once by the app shell; `MilestoneWatch` says when.
 */
@Component({
  selector: 'app-milestone-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BottomSheet, Button, Icon, Mascot, NgOptimizedImage, TranslocoPipe],
  templateUrl: './milestone-sheet.html',
  styleUrl: './milestone-sheet.scss',
})
export class MilestoneSheet {
  /**
   * Milestone to celebrate, and the way to close it.
   */
  protected readonly watch = inject(MilestoneWatch);

  /**
   * Child's name and birth date, for the story.
   */
  private readonly session = inject(AuthSession);

  /**
   * Today, so a date of this year leaves the year out.
   */
  private readonly today = inject(Today).iso;

  /**
   * First name of the child, for the thanks button.
   */
  protected readonly childName = this.session.childName;

  /**
   * Everything the drawer says about the current milestone; `null` when none.
   */
  protected readonly view = computed(() => {
    const milestone = this.watch.current();
    if (!milestone) {
      return null;
    }
    const when = milestoneWhen(
      milestone,
      this.session.childBirthDate(),
      Number(this.today().slice(0, 4)),
    );
    const title = milestoneTitle(milestone);
    return {
      title: translate('milestones.sheetTitle', { title }),
      count: milestone.count,
      icon: milestone.kind === 'words' ? null : MILESTONE_ICONS[milestone.kind],
      story: milestoneStory(milestone, this.childName(), when),
      next:
        milestone.count === null
          ? null
          : translate('milestones.next', { count: nextWordStep(milestone.count) }),
    };
  });

  /**
   * Throws the confetti as each milestone comes up, and clears the toast of the save that reached it,
   * which would sit over the drawer saying less.
   */
  constructor() {
    const celebration = inject(Celebration);
    const toasts = inject(ToastQueue);
    effect(() => {
      if (this.watch.current()) {
        // Untracked: `play()` reads its own burst signal, which would rerun this effect forever.
        untracked(() => {
          celebration.play();
          toasts.dismiss();
        });
      }
    });
  }

  /**
   * Closes the drawer when the sheet closes itself (Escape, veil) or on the thanks button.
   */
  protected onOpenChange(open: boolean): void {
    if (!open) {
      this.watch.dismiss();
    }
  }
}
