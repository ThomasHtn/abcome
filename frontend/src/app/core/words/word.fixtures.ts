import { Pronunciation, Recording, Word } from './word.model';

/**
 * Stage with sensible defaults, overridden field by field.
 */
export function aPronunciation(overrides: Partial<Pronunciation> = {}): Pronunciation {
  return {
    id: 1,
    wordId: 1,
    spoken: 'apin',
    status: 'almost',
    date: '2026-10-12',
    createdAt: '2026-10-12T18:00:00Z',
    ...overrides,
  };
}

/**
 * Sound with sensible defaults, overridden field by field.
 */
export function aRecording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 1,
    wordId: 1,
    pronunciationId: 10,
    mimeType: 'audio/webm',
    durationMs: 3200,
    createdAt: '2026-10-17T09:30:00Z',
    ...overrides,
  };
}

/**
 * Word with one stage and no sound by default, overridden field by field.
 */
export function aWord(overrides: Partial<Word> = {}): Word {
  const id = overrides.id ?? 1;
  return {
    id,
    kind: 'word',
    label: 'lapin',
    category: 'animals',
    createdAt: '2026-09-16T08:00:00Z',
    pronunciations: [aPronunciation({ id: id * 10, wordId: id })],
    recordings: [],
    ...overrides,
  };
}
