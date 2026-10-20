import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthSession } from '@core/auth/auth-session';
import { ToastQueue } from '@core/feedback/toast-queue';
import { aPronunciation, aRecording, aWord } from '@core/words/word.fixtures';
import { Word } from '@core/words/word.model';
import { WordsApi } from '@core/words/words-api';

import { QueuedSound } from './outbox.model';
import { OutboxStore } from './outbox-store';
import { SoundOutbox } from './sound-outbox';

/**
 * Store kept in memory, standing for IndexedDB.
 */
class MemoryStore {
  /**
   * Stored sounds by key.
   */
  public readonly sounds = new Map<number, QueuedSound>();

  /**
   * Next key handed out.
   */
  private nextKey = 1;

  /**
   * Every sound, oldest first.
   */
  public all(): Promise<QueuedSound[]> {
    return Promise.resolve([...this.sounds.values()]);
  }

  /**
   * Stores or replaces a sound.
   */
  public put(sound: QueuedSound): Promise<number> {
    const key = sound.key ?? this.nextKey++;
    this.sounds.set(key, { ...sound, key });
    return Promise.resolve(key);
  }

  /**
   * Forgets a sound.
   */
  public remove(key: number): Promise<void> {
    this.sounds.delete(key);
    return Promise.resolve();
  }
}

describe('SoundOutbox', () => {
  let store: MemoryStore;
  let calls: string[];
  let words: ReturnType<typeof signal<Word[]>>;
  let uploadError: unknown;
  let createError: unknown;

  beforeEach(() => {
    store = new MemoryStore();
    calls = [];
    words = signal<Word[]>([]);
    uploadError = null;
    createError = null;
    TestBed.configureTestingModule({
      providers: [
        { provide: OutboxStore, useValue: store },
        {
          provide: WordsApi,
          useValue: {
            words: { hasValue: () => true, value: words },
            create: () => {
              calls.push('create');
              return createError
                ? Promise.reject(createError)
                : Promise.resolve(aWord({ id: 3, pronunciations: [aPronunciation({ id: 30 })] }));
            },
            addPronunciation: (wordId: number) => {
              calls.push(`stage of ${wordId}`);
              return Promise.resolve(aPronunciation({ id: 40, wordId }));
            },
            addRecording: (stageId: number) => {
              calls.push(`sound under ${stageId}`);
              return uploadError ? Promise.reject(uploadError) : Promise.resolve(aRecording());
            },
          },
        },
      ],
    });
    TestBed.inject(AuthSession).status.set('signed-in');
  });

  /**
   * A kept sound of "lapin" going to `target`.
   */
  function aQueuedSound(target: QueuedSound['target']): QueuedSound {
    return { audio: new Blob(['bits']), durationMs: 1200, label: 'lapin', target };
  }

  it('sends a kept sound under its stage, forgets it and says it arrived', async () => {
    const outbox = TestBed.inject(SoundOutbox);
    await outbox.keep(aQueuedSound({ kind: 'stage', stageId: 12 }));

    await outbox.send();

    expect(calls).toEqual(['sound under 12']);
    expect(store.sounds.size).toBe(0);
    expect(TestBed.inject(ToastQueue).current()?.text).toBe(
      'Le son de « lapin » gardé sur ce téléphone est bien arrivé dans le carnet.',
    );
  });

  it('creates the word first, and keeps that step when the upload still fails', async () => {
    const outbox = TestBed.inject(SoundOutbox);
    const stage = { spoken: 'apin', status: 'almost' as const, date: '2026-10-12' };
    await outbox.keep(aQueuedSound({ kind: 'new-word', label: 'lapin', stage }));
    uploadError = new HttpErrorResponse({ status: 0 });

    await outbox.send();
    expect(calls).toEqual(['create', 'sound under 30']);
    expect([...store.sounds.values()][0].target).toEqual({ kind: 'stage', stageId: 30 });

    uploadError = null;
    await outbox.send();
    expect(calls).toEqual(['create', 'sound under 30', 'sound under 30']);
    expect(store.sounds.size).toBe(0);
  });

  it('adds a stage to a word another phone created meanwhile instead of a duplicate', async () => {
    const outbox = TestBed.inject(SoundOutbox);
    words.set([aWord({ id: 5, label: 'lapin' })]);
    createError = new HttpErrorResponse({ status: 409, error: { code: 'WORD_ALREADY_EXISTS' } });
    const stage = { spoken: 'apin', status: 'almost' as const, date: '2026-10-12' };
    await outbox.keep(aQueuedSound({ kind: 'new-word', label: 'lapin', stage }));

    await outbox.send();

    expect(calls).toEqual(['create', 'stage of 5', 'sound under 40']);
    expect(store.sounds.size).toBe(0);
  });

  it('drops a sound the server refuses for good and says so', async () => {
    const outbox = TestBed.inject(SoundOutbox);
    await outbox.keep(aQueuedSound({ kind: 'stage', stageId: 12 }));
    uploadError = new HttpErrorResponse({ status: 404, error: { code: 'NOT_FOUND' } });

    await outbox.send();

    expect(store.sounds.size).toBe(0);
    expect(TestBed.inject(ToastQueue).current()?.tone).toBe('error');
  });

  it('sends nothing for a reader, who cannot write', async () => {
    const outbox = TestBed.inject(SoundOutbox);
    TestBed.inject(AuthSession).readOnly.set(true);
    await outbox.keep(aQueuedSound({ kind: 'stage', stageId: 12 }));

    await outbox.send();

    expect(calls).toEqual([]);
    expect(store.sounds.size).toBe(1);
  });

  it('sends the kept sounds again when the network returns', async () => {
    const outbox = TestBed.inject(SoundOutbox);
    await outbox.keep(aQueuedSound({ kind: 'stage', stageId: 12 }));

    window.dispatchEvent(new Event('online'));
    await outbox.send();

    expect(calls).toEqual(['sound under 12']);
  });
});
