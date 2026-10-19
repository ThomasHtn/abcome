import { DOCUMENT } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';

import { AuthSession } from '@core/auth/auth-session';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { DictionaryEntry } from './dictionary.model';

/**
 * Built-in dictionary of first words (IFDC based), sorted by acquisition rank, read-only, loaded once per session
 * (again only after a failed load).
 */
@Service()
export class DictionaryApi {
  /**
   * Gates the list on an open session.
   */
  private readonly session = inject(AuthSession);

  /**
   * Every entry; read it through `resourceValue(entries, [])`.
   */
  public readonly entries = httpResource<DictionaryEntry[]>(() =>
    this.session.signedIn() ? API_ENDPOINTS.dictionary : undefined,
  );

  /**
   * Retries a failed load when the network returns or the app comes back to the screen, so the
   * suggestions do not stay missing until a full reload.
   */
  constructor() {
    const document = inject(DOCUMENT);
    const retry = (): void => {
      if (this.entries.status() === 'error') {
        this.entries.reload();
      }
    };
    document.defaultView?.addEventListener('online', retry);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        retry();
      }
    });
  }
}
