import { DOCUMENT } from '@angular/common';
import { inject, Service, signal } from '@angular/core';

import { CHANGE_RETENTION_MS, SEEN_STORAGE_KEY } from './word.constants';
import { SeenMarks, Word, WordChange } from './word.model';
import { changeSince, latestChangeAt } from './word.utils';

/**
 * What this device has already seen of the notebook, so the list can tag what changed elsewhere.
 * Kept in browser storage, per device: the family shares one password, so there is no user to key it on.
 * Marks are instants from the server, never the device clock, except the first visit and the expiry.
 */
@Service()
export class SeenWords {
  /**
   * Browser storage, `null` where it is blocked (private mode): marks then last until the tab closes.
   */
  private readonly storage = storageOf(inject(DOCUMENT));

  /**
   * Current marks; the list recomputes its tags when they change.
   */
  private readonly marks = signal<SeenMarks>(this.load());

  /**
   * What changed in `word` since this device last looked, `null` when nothing or only older than 14 days.
   */
  public changeOf(word: Word): WordChange | null {
    const marks = this.marks();
    const cutoff = Math.max(
      marks.since,
      marks.entries[word.id] ?? 0,
      Date.now() - CHANGE_RETENTION_MS,
    );
    return changeSince(word, cutoff);
  }

  /**
   * Marks everything `word` holds as seen: its page was opened, or this device just added to it.
   */
  public markSeen(word: Word): void {
    this.markSeenAt(word.id, latestChangeAt(word));
  }

  /**
   * Marks entry `id` as seen up to `instant` (epoch milliseconds), dropping marks too old to matter.
   */
  public markSeenAt(id: number, instant: number): void {
    const { since, entries } = this.marks();
    if ((entries[id] ?? 0) >= instant) {
      return;
    }
    const cutoff = Date.now() - CHANGE_RETENTION_MS;
    const kept = Object.fromEntries(Object.entries(entries).filter(([, seen]) => seen > cutoff));
    this.save({ since, entries: { ...kept, [id]: instant } });
  }

  /**
   * Marks from storage; a first visit, or unreadable marks, start from now with nothing tagged.
   */
  private load(): SeenMarks {
    const stored = parseMarks(this.read());
    if (stored) {
      return stored;
    }
    const fresh: SeenMarks = { since: Date.now(), entries: {} };
    this.write(fresh);
    return fresh;
  }

  /**
   * Applies and stores new marks.
   */
  private save(marks: SeenMarks): void {
    this.marks.set(marks);
    this.write(marks);
  }

  /**
   * Stored text, `null` when absent or when storage refuses to be read.
   */
  private read(): string | null {
    try {
      return this.storage?.getItem(SEEN_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Stores the marks; a full or blocked storage only loses them at the next visit.
   */
  private write(marks: SeenMarks): void {
    try {
      this.storage?.setItem(SEEN_STORAGE_KEY, JSON.stringify(marks));
    } catch {
      // Marks are a convenience: losing them only tags again what was already seen.
    }
  }
}

/**
 * Local storage of the page, `null` when the browser blocks even reaching it.
 */
function storageOf(document: Document): Storage | null {
  try {
    return document.defaultView?.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Marks read back from storage, `null` when missing or not in the expected shape.
 */
function parseMarks(text: string | null): SeenMarks | null {
  if (text === null) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(text);
    return isMarks(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Whether a parsed value has the shape of the marks.
 */
function isMarks(value: unknown): value is SeenMarks {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { since, entries } = value as Partial<SeenMarks>;
  return (
    typeof since === 'number' &&
    typeof entries === 'object' &&
    entries !== null &&
    Object.values(entries).every((seen) => typeof seen === 'number')
  );
}
