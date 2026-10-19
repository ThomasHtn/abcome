import { DOCUMENT } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { distinctUntilChanged, filter, firstValueFrom, map, skip } from 'rxjs';

import { AuthSession } from '@core/auth/auth-session';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { keepValueOnError, resourcePatcher } from '@core/http/resource.utils';

import { SeenWords } from './seen-words';
import {
  CreateWordRequest,
  MoveRecordingRequest,
  Pronunciation,
  PronunciationRequest,
  Recording,
  UpdateWordRequest,
  Word,
} from './word.model';
import {
  addRecording,
  removePronunciation,
  removeRecording,
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
   * or after it fails.
   */
  constructor() {
    keepValueOnError(this.words);
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
   * Deletes a word with all its stages and sounds.
   */
  public async remove(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(API_ENDPOINTS.word(id)));
    this.patch((words) => words.filter((word) => word.id !== id));
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
   * Removes a stage, its sounds going to a neighbour; rejects with `LAST_PRONUNCIATION` when it is the
   * word's only one.
   */
  public async removePronunciation(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(API_ENDPOINTS.pronunciation(id)));
    this.patch((words) => removePronunciation(words, id));
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
   * Deletes a sound.
   */
  public async removeRecording(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(API_ENDPOINTS.recording(id)));
    this.patch((words) => removeRecording(words, id));
  }
}
