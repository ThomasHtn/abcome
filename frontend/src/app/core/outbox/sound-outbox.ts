import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { effect, inject, Service, untracked } from '@angular/core';

import { translate } from '@jsverse/transloco';

import { AuthSession } from '@core/auth/auth-session';
import { ToastQueue } from '@core/feedback/toast-queue';
import { apiErrorCode, isServerFailure } from '@core/http/api-error.utils';
import { resourceValue } from '@core/http/resource.utils';
import { quote } from '@core/text/text.utils';
import { findWordByLabel } from '@core/words/word.utils';
import { WordsApi } from '@core/words/words-api';

import { OutboxTarget, QueuedSound, StageTarget } from './outbox.model';
import { OutboxStore } from './outbox-store';

/**
 * Sounds recorded while the notebook could not be reached, kept on this device and sent on their own
 * once it answers: at sign-in, when the network returns and when the app comes back to the screen.
 * Nothing to do for the family; a toast says when a kept sound arrived.
 */
@Service()
export class SoundOutbox {
  /**
   * Where the sounds wait.
   */
  private readonly store = inject(OutboxStore);

  /**
   * Creates the word or stage, then uploads the sound, patching the shared list.
   */
  private readonly wordsApi = inject(WordsApi);

  /**
   * Only a family session may send them.
   */
  private readonly session = inject(AuthSession);

  /**
   * Says a kept sound arrived, or could not.
   */
  private readonly toasts = inject(ToastQueue);

  /**
   * Running send, shared by triggers that fire together.
   */
  private sending: Promise<void> | null = null;

  /**
   * Sends the kept sounds once a family session opens, when the network returns and when the app
   * comes back to the screen.
   */
  constructor() {
    effect(() => {
      if (this.session.signedIn() && !this.session.readOnly()) {
        untracked(() => void this.send());
      }
    });
    const document = inject(DOCUMENT);
    document.defaultView?.addEventListener('online', () => void this.send());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.send();
      }
    });
  }

  /**
   * Keeps a sound for later; `false` when this browser cannot store it, so the screen says it failed.
   */
  public async keep(sound: QueuedSound): Promise<boolean> {
    try {
      await this.store.put(sound);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sends every kept sound, oldest first, stopping at the first the server still cannot take.
   */
  public send(): Promise<void> {
    if (!this.session.signedIn() || this.session.readOnly()) {
      return Promise.resolve();
    }
    this.sending ??= this.sendAll().finally(() => (this.sending = null));
    return this.sending;
  }

  /**
   * Reads the kept sounds and sends them one by one.
   */
  private async sendAll(): Promise<void> {
    let sounds: QueuedSound[];
    try {
      sounds = await this.store.all();
    } catch {
      return;
    }
    for (const sound of sounds) {
      if (!(await this.sendOne(sound))) {
        return;
      }
    }
  }

  /**
   * Takes one sound through its remaining steps, storing each step done so none is made twice;
   * `false` when it has to wait, after which the next sounds wait too.
   * A refusal no retry would fix (word deleted meanwhile, sound rejected) drops it and says so.
   */
  private async sendOne(sound: QueuedSound): Promise<boolean> {
    let current = sound;
    try {
      while (current.target.kind !== 'stage') {
        current = { ...current, target: await this.advance(current.target) };
        await this.store.put(current);
      }
      const target: StageTarget = current.target;
      await this.wordsApi.addRecording(target.stageId, current.audio, current.durationMs);
      await this.forget(current);
      this.toasts.show(translate('outbox.sent', { label: quote(current.label) }));
      return true;
    } catch (error) {
      if (mustWait(error)) {
        return false;
      }
      await this.forget(current);
      this.toasts.show(translate('outbox.lost', { label: quote(current.label) }), 'error');
      return true;
    }
  }

  /**
   * Does the next step of a target: creates its word, or its stage.
   * A word added meanwhile from another phone gets the stage instead of a duplicate.
   */
  private async advance(target: OutboxTarget): Promise<OutboxTarget> {
    switch (target.kind) {
      case 'stage':
        return target;
      case 'new-stage': {
        const stage = await this.wordsApi.addPronunciation(target.wordId, target.stage);
        return { kind: 'stage', stageId: stage.id };
      }
      case 'new-word':
        try {
          const word = await this.wordsApi.create({
            label: target.label,
            pronunciation: target.stage,
          });
          return { kind: 'stage', stageId: word.pronunciations[0].id };
        } catch (error) {
          const existing = findWordByLabel(
            resourceValue(this.wordsApi.words, []) ?? [],
            target.label,
          );
          if (apiErrorCode(error) !== 'WORD_ALREADY_EXISTS' || !existing) {
            throw error;
          }
          return { kind: 'new-stage', wordId: existing.id, stage: target.stage };
        }
    }
  }

  /**
   * Removes a sent or dropped sound from the device.
   */
  private async forget(sound: QueuedSound): Promise<void> {
    if (sound.key !== undefined) {
      await this.store.remove(sound.key);
    }
  }
}

/**
 * Whether a failure only means "not now": no network, server down, signed out, or a word that exists
 * but is not in the loaded list yet.
 */
function mustWait(error: unknown): boolean {
  return (
    isServerFailure(error) ||
    (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized) ||
    apiErrorCode(error) === 'WORD_ALREADY_EXISTS' ||
    !(error instanceof HttpErrorResponse)
  );
}
