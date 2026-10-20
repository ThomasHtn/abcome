import { DOCUMENT } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { effect, inject, Service, signal, untracked } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { translate } from '@jsverse/transloco';
import { distinctUntilChanged, filter, firstValueFrom, map, skip } from 'rxjs';

import { AuthSession } from '@core/auth/auth-session';
import { UNDO_WINDOW_MS } from '@core/feedback/feedback.constants';
import { ToastQueue } from '@core/feedback/toast-queue';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { isNotFound } from '@core/http/api-error.utils';
import { keepValueOnError, resourcePatcher, resourceValue } from '@core/http/resource.utils';

import { SeenWords } from './seen-words';
import {
  CreateWordRequest,
  MoveRecordingRequest,
  PendingRemoval,
  Pronunciation,
  PronunciationRequest,
  Recording,
  RemovalTarget,
  UpdateWordRequest,
  Word,
} from './word.model';
import {
  addRecording,
  applyRemoval,
  ownerOf,
  replaceRecording,
  upsertPronunciation,
  upsertWord,
} from './word.utils';

/**
 * Words, their stages and sounds: one shared list for every screen, patched locally after each change
 * and fetched again on every screen shown, so what another phone added appears like on a web page.
 * The list is small (hundreds of words), so it is loaded whole and a word page reads it from here.
 */
@Service()
export class WordsApi {
  /**
   * Sends the write calls.
   */
  private readonly http = inject(HttpClient);

  /**
   * Gates the list on an open session.
   */
  private readonly session = inject(AuthSession);

  /**
   * Keeps what this device adds from being tagged as news on its own list.
   */
  private readonly seen = inject(SeenWords);

  /**
   * Says a deletion happened, with its undo button, or that the server refused it.
   */
  private readonly toasts = inject(ToastQueue);

  /**
   * Deletions already gone from the list but not yet sent, still undoable.
   */
  private readonly pendingRemovals = signal<readonly PendingRemoval[]>([]);

  /**
   * Timer sending each pending deletion when its undo window ends.
   */
  private readonly removalTimers = new Map<PendingRemoval, ReturnType<typeof setTimeout>>();

  /**
   * Every word with its stages and sounds; idle while signed out, so nothing leaks before login.
   * Read it through `resourceValue(words, [])`.
   */
  public readonly words = httpResource<Word[]>(() =>
    this.session.signedIn() ? API_ENDPOINTS.words : undefined,
  );

  /**
   * Applies a change to the loaded list instead of fetching it again (see `resourcePatcher`).
   */
  private readonly patch = resourcePatcher(this.words);

  /**
   * Fetches the list again on each new screen (not the first, which loads it, nor a tab or search
   * change, which only touch the query), when the app comes back to the screen and when the network
   * returns; a load already running is kept, and the shown list stays until the fresh one arrives,
   * or after it fails. A fresh list still holding a pending deletion loses it again, and leaving the
   * app sends the pending deletions at once, since a closed page would drop them.
   */
  constructor() {
    keepValueOnError(this.words);
    effect(() => {
      const pending = this.pendingRemovals();
      const words = resourceValue(this.words, undefined);
      const back = words ? pending.filter((removal) => ownerOf(words, removal.target)) : [];
      if (back.length > 0) {
        untracked(() =>
          this.patch((list) =>
            back.reduce((rest, removal) => applyRemoval(rest, removal.target), list),
          ),
        );
      }
    });
    const document = inject(DOCUMENT);
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map((event) => event.urlAfterRedirects.split(/[?#]/u)[0]),
        distinctUntilChanged(),
        skip(1),
      )
      .subscribe(() => this.words.reload());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.words.reload();
      } else {
        void this.flushRemovals();
      }
    });
    document.defaultView?.addEventListener('online', () => this.words.reload());
  }

  /**
   * Adds a word with its first stage; rejects with `WORD_ALREADY_EXISTS` on a duplicate.
   */
  public async create(request: CreateWordRequest): Promise<Word> {
    const word = await firstValueFrom(this.http.post<Word>(API_ENDPOINTS.words, request));
    this.patch((words) => upsertWord(words, word));
    this.seen.markSeen(word);
    return word;
  }

  /**
   * Renames a word; rejects with `WORD_ALREADY_EXISTS` when the new label is taken.
   */
  public async rename(id: number, request: UpdateWordRequest): Promise<Word> {
    const word = await firstValueFrom(this.http.put<Word>(API_ENDPOINTS.word(id), request));
    this.patch((words) => upsertWord(words, word));
    return word;
  }

  /**
   * Adds a stage to a word.
   */
  public async addPronunciation(
    wordId: number,
    request: PronunciationRequest,
  ): Promise<Pronunciation> {
    const stage = await firstValueFrom(
      this.http.post<Pronunciation>(API_ENDPOINTS.wordPronunciations(wordId), request),
    );
    this.patch((words) => upsertPronunciation(words, stage));
    this.seen.markSeenAt(stage.wordId, Date.parse(stage.createdAt));
    return stage;
  }

  /**
   * Edits a stage.
   */
  public async updatePronunciation(
    id: number,
    request: PronunciationRequest,
  ): Promise<Pronunciation> {
    const stage = await firstValueFrom(
      this.http.put<Pronunciation>(API_ENDPOINTS.pronunciation(id), request),
    );
    this.patch((words) => upsertPronunciation(words, stage));
    return stage;
  }

  /**
   * Files a sound under a stage, uploaded as raw audio.
   * Rejects with `PAYLOAD_TOO_LARGE` or `UNSUPPORTED_MEDIA_TYPE` when the browser recorded something unusual.
   */
  public async addRecording(
    pronunciationId: number,
    audio: Blob,
    durationMs: number,
  ): Promise<Recording> {
    const recording = await firstValueFrom(
      this.http.post<Recording>(API_ENDPOINTS.pronunciationRecordings(pronunciationId), audio, {
        headers: { 'Content-Type': audio.type },
        params: { durationMs: Math.round(durationMs) },
      }),
    );
    this.patch((words) => addRecording(words, recording));
    this.seen.markSeenAt(recording.wordId, Date.parse(recording.createdAt));
    return recording;
  }

  /**
   * Files a sound under another stage of its word; rejects with `INVALID_REQUEST` when that stage is gone.
   */
  public async moveRecording(id: number, pronunciationId: number): Promise<Recording> {
    const request: MoveRecordingRequest = { pronunciationId };
    const recording = await firstValueFrom(
      this.http.put<Recording>(API_ENDPOINTS.recording(id), request),
    );
    this.patch((words) => replaceRecording(words, recording));
    return recording;
  }

  /**
   * Deletes a word with its stages and sounds, a stage (its sounds going to a neighbour, never the
   * word's only one) or a sound: gone from the list at once, sent once the undo window ends.
   * The toast says `done` with an undo button; a refusal then puts it back and says `failure`.
   */
  public removeLater(target: RemovalTarget, done: string, failure: string): void {
    const before = ownerOf(resourceValue(this.words, []) ?? [], target);
    if (!before) {
      return;
    }
    const removal: PendingRemoval = { target, before, failure };
    this.patch((words) => applyRemoval(words, target));
    this.pendingRemovals.update((pending) => [...pending, removal]);
    this.removalTimers.set(
      removal,
      setTimeout(() => void this.commitRemoval(removal), UNDO_WINDOW_MS),
    );
    this.toasts.show(done, 'success', {
      label: translate('feedback.undo'),
      run: () => this.undoRemoval(removal),
    });
  }

  /**
   * Sends every pending deletion now, before signing out or when the app leaves the screen.
   */
  public async flushRemovals(): Promise<void> {
    await Promise.all(this.pendingRemovals().map((removal) => this.commitRemoval(removal)));
  }

  /**
   * Puts back what a pending deletion took, as it was; too late once sent.
   */
  private undoRemoval(removal: PendingRemoval): void {
    if (!this.forgetRemoval(removal)) {
      return;
    }
    this.patch((words) => upsertWord(words, removal.before));
  }

  /**
   * Sends a pending deletion; already gone on the server is fine, any other failure puts it back.
   */
  private async commitRemoval(removal: PendingRemoval): Promise<void> {
    if (!this.forgetRemoval(removal)) {
      return;
    }
    try {
      await firstValueFrom(this.http.delete<void>(removalUrl(removal.target)));
    } catch (error) {
      if (!isNotFound(error)) {
        this.patch((words) => upsertWord(words, removal.before));
        this.toasts.show(removal.failure, 'error');
      }
    }
  }

  /**
   * Drops a deletion from the pending ones with its timer; `false` when it was no longer pending.
   */
  private forgetRemoval(removal: PendingRemoval): boolean {
    if (!this.pendingRemovals().includes(removal)) {
      return false;
    }
    clearTimeout(this.removalTimers.get(removal));
    this.removalTimers.delete(removal);
    this.pendingRemovals.update((pending) => pending.filter((other) => other !== removal));
    return true;
  }
}

/**
 * API route deleting a removal target.
 */
function removalUrl(target: RemovalTarget): string {
  switch (target.kind) {
    case 'word':
      return API_ENDPOINTS.word(target.id);
    case 'pronunciation':
      return API_ENDPOINTS.pronunciation(target.id);
    case 'recording':
      return API_ENDPOINTS.recording(target.id);
  }
}
