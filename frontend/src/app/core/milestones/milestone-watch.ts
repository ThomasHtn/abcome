import { effect, inject, Service, signal, untracked } from '@angular/core';

import { AuthSession } from '@core/auth/auth-session';
import { resourceValue } from '@core/http/resource.utils';
import { Word } from '@core/words/word.model';
import { WordsApi } from '@core/words/words-api';

import { Milestone } from './milestone.model';
import { milestonesOf } from './milestone.utils';
import { SeenMilestones } from './seen-milestones';

/**
 * Notices a milestone this device has not celebrated yet, whether noted here (a new word just saved)
 * or on another phone (seen at the next opening), and holds it for the drawer.
 */
@Service()
export class MilestoneWatch {
  /**
   * The notebook the milestones come from.
   */
  private readonly wordsApi = inject(WordsApi);

  /**
   * Celebrations happen inside the notebook only.
   */
  private readonly session = inject(AuthSession);

  /**
   * What this device already celebrated.
   */
  private readonly seen = inject(SeenMilestones);

  /**
   * Milestone to celebrate now, `null` when none.
   */
  public readonly current = signal<Milestone | null>(null);

  /**
   * Looks again each time the list changes, after a write here or a fetch bringing others' notes.
   */
  constructor() {
    effect(() => {
      const words = this.session.signedIn() ? resourceValue(this.wordsApi.words, null) : null;
      if (words) {
        untracked(() => this.check(words));
      }
    });
  }

  /**
   * Closes the celebration.
   */
  public dismiss(): void {
    this.current.set(null);
  }

  /**
   * Picks the newest milestone not celebrated yet; several at once (back after a while) celebrate the
   * latest only, the others staying in the list as markers.
   */
  private check(words: readonly Word[]): void {
    const milestones = milestonesOf(words);
    const fresh = this.seen.takeUnseen(milestones.map((milestone) => milestone.key));
    const newest = milestones.filter((milestone) => fresh.includes(milestone.key)).at(-1);
    if (newest && !this.current()) {
      this.current.set(newest);
    }
  }
}
