import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { AuthSession } from '@core/auth/auth-session';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { resourcePatcher } from '@core/http/resource.utils';

import { Sentence, SentenceRequest } from './sentence.model';

/**
 * Sentences: one shared list, patched locally after each change.
 */
@Service()
export class SentencesApi {
  /**
   * Sends the write calls.
   */
  private readonly http = inject(HttpClient);

  /**
   * Gates the list on an open session.
   */
  private readonly session = inject(AuthSession);

  /**
   * Every sentence; idle while signed out. Read it through `resourceValue(sentences, [])`.
   */
  public readonly sentences = httpResource<Sentence[]>(() =>
    this.session.signedIn() ? API_ENDPOINTS.sentences : undefined,
  );

  /**
   * Applies a change to the loaded list instead of fetching it again (see `resourcePatcher`).
   */
  private readonly patch = resourcePatcher(this.sentences);

  /**
   * Adds a sentence.
   */
  public async create(request: SentenceRequest): Promise<Sentence> {
    const sentence = await firstValueFrom(
      this.http.post<Sentence>(API_ENDPOINTS.sentences, request),
    );
    this.patch((sentences) => [...sentences, sentence]);
    return sentence;
  }

  /**
   * Edits a sentence.
   */
  public async update(id: number, request: SentenceRequest): Promise<Sentence> {
    const sentence = await firstValueFrom(
      this.http.put<Sentence>(API_ENDPOINTS.sentence(id), request),
    );
    this.patch((sentences) =>
      sentences.map((existing) => (existing.id === id ? sentence : existing)),
    );
    return sentence;
  }

  /**
   * Deletes a sentence.
   */
  public async remove(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(API_ENDPOINTS.sentence(id)));
    this.patch((sentences) => sentences.filter((sentence) => sentence.id !== id));
  }
}
