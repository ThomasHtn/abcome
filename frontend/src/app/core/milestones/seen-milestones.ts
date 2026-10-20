import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';

import { storageOf } from '@core/storage/storage.utils';

import { SEEN_MILESTONES_STORAGE_KEY } from './milestone.constants';

/**
 * Milestones this device has already celebrated, kept in browser storage like the seen marks: each
 * phone celebrates each milestone once, whoever noted it.
 */
@Service()
export class SeenMilestones {
  /**
   * Browser storage, `null` where it is blocked: nothing is then celebrated twice in the same tab.
   */
  private readonly storage = storageOf(inject(DOCUMENT));

  /**
   * Keys celebrated in this tab when storage is blocked.
   */
  private memory: string[] | null = null;

  /**
   * Keys among `keys` this device has not celebrated yet, all marked as celebrated from now on.
   * The first time a device looks, everything already reached counts as seen, so an existing
   * notebook does not set off a burst of old celebrations.
   */
  public takeUnseen(keys: readonly string[]): string[] {
    const seen = this.read();
    this.write([...new Set([...(seen ?? []), ...keys])]);
    return seen === null ? [] : keys.filter((key) => !seen.includes(key));
  }

  /**
   * Keys stored, `null` on the first visit or when unreadable.
   */
  private read(): string[] | null {
    try {
      const text = this.storage?.getItem(SEEN_MILESTONES_STORAGE_KEY) ?? null;
      const value: unknown = text === null ? this.memory : JSON.parse(text);
      return Array.isArray(value) && value.every((key) => typeof key === 'string') ? value : null;
    } catch {
      return this.memory;
    }
  }

  /**
   * Stores the keys; a blocked storage keeps them for this tab only.
   */
  private write(keys: string[]): void {
    this.memory = keys;
    try {
      this.storage?.setItem(SEEN_MILESTONES_STORAGE_KEY, JSON.stringify(keys));
    } catch {
      // Celebrations are a convenience: a lost record at worst celebrates again on the next visit.
    }
  }
}
