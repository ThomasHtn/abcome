import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';

import { OUTBOX_DATABASE, OUTBOX_STORE, OUTBOX_VERSION } from './outbox.constants';
import { QueuedSound } from './outbox.model';

/**
 * The kept sounds in IndexedDB, which survives a closed tab and stores audio as is.
 * Every call rejects where the browser offers no database (some private windows).
 */
@Service()
export class OutboxStore {
  /**
   * The browser's IndexedDB, `undefined` where it has none.
   */
  private readonly indexedDb = inject(DOCUMENT).defaultView?.indexedDB;

  /**
   * The open database, opened on first use.
   */
  private database: Promise<IDBDatabase> | null = null;

  /**
   * Every kept sound, oldest first.
   */
  public async all(): Promise<QueuedSound[]> {
    const store = await this.store('readonly');
    return request(store.getAll() as IDBRequest<QueuedSound[]>);
  }

  /**
   * Stores a sound, or replaces it when it has a key; resolves with its key.
   */
  public async put(sound: QueuedSound): Promise<number> {
    const store = await this.store('readwrite');
    return request(store.put(sound) as IDBRequest<number>);
  }

  /**
   * Forgets a sound.
   */
  public async remove(key: number): Promise<void> {
    const store = await this.store('readwrite');
    await request(store.delete(key));
  }

  /**
   * The sound store, in a transaction of its own.
   */
  private async store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const database = await this.open();
    return database.transaction(OUTBOX_STORE, mode).objectStore(OUTBOX_STORE);
  }

  /**
   * Opens the database once, creating its store the first time.
   */
  private open(): Promise<IDBDatabase> {
    const indexedDb = this.indexedDb;
    if (!indexedDb) {
      return Promise.reject(new Error('IndexedDB is not available'));
    }
    this.database ??= new Promise((resolve, reject) => {
      const opening = indexedDb.open(OUTBOX_DATABASE, OUTBOX_VERSION);
      opening.onupgradeneeded = (): void => {
        opening.result.createObjectStore(OUTBOX_STORE, { keyPath: 'key', autoIncrement: true });
      };
      opening.onsuccess = (): void => resolve(opening.result);
      opening.onerror = (): void => reject(opening.error ?? new Error('IndexedDB did not open'));
    });
    return this.database;
  }
}

/**
 * Settles with the result of an IndexedDB request.
 */
function request<T>(pending: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    pending.onsuccess = (): void => resolve(pending.result);
    pending.onerror = (): void => reject(pending.error ?? new Error('IndexedDB request failed'));
  });
}
