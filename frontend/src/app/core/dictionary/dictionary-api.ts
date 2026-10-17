import { httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';

import { AuthSession } from '@core/auth/auth-session';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { DictionaryEntry } from './dictionary.model';

/**
 * Built-in dictionary of first words (IFDC based), sorted by acquisition rank, read-only, loaded once per session.
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
}
