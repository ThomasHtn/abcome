import { matchesQuery, normalizeText } from '@core/text/text.utils';

import {
  Pronunciation,
  PronunciationStatus,
  Recording,
  Word,
  WordChange,
  WordKind,
} from './word.model';

/**
 * Stages oldest first, by date then id, the order the API also guarantees.
 */
export function sortPronunciations(pronunciations: readonly Pronunciation[]): Pronunciation[] {
  return [...pronunciations].sort(
    (first, second) => first.date.localeCompare(second.date) || first.id - second.id,
  );
}

/**
 * Latest stage of a word: its current pronunciation.
 */
export function currentPronunciation(word: Word): Pronunciation {
  const stages = sortPronunciations(word.pronunciations);
  return stages[stages.length - 1];
}

/**
 * Oldest stage of a word: the first time the child said it.
 */
export function firstPronunciation(word: Word): Pronunciation {
  return sortPronunciations(word.pronunciations)[0];
}

/**
 * Current status of a word, from its latest stage.
 */
export function currentStatus(word: Word): PronunciationStatus {
  return currentPronunciation(word).status;
}

/**
 * Day the child first said the word, `yyyy-MM-dd`.
 */
export function firstSaidDate(word: Word): string {
  return firstPronunciation(word).date;
}

/**
 * Words most recently said for the first time first, as the home list shows them.
 */
export function sortByFirstSaidDesc(words: readonly Word[]): Word[] {
  return [...words].sort(
    (first, second) =>
      firstSaidDate(second).localeCompare(firstSaidDate(first)) || second.id - first.id,
  );
}

/**
 * Number of words whose current status is `status`.
 */
export function countByStatus(words: readonly Word[], status: PronunciationStatus): number {
  return words.filter((word) => currentStatus(word) === status).length;
}

/**
 * Whether the word or any of its spoken forms matches a search, ignoring case and accents.
 */
export function wordMatchesQuery(word: Word, query: string): boolean {
  return (
    matchesQuery(word.label, query) ||
    word.pronunciations.some((pronunciation) => matchesQuery(pronunciation.spoken, query))
  );
}

/**
 * Word with the same label once normalized, the duplicate the API would refuse; `undefined` when none.
 * Sentences are never duplicates.
 */
export function findWordByLabel(words: readonly Word[], label: string): Word | undefined {
  const needle = normalizeText(label);
  return words.find((word) => word.kind === 'word' && normalizeText(word.label) === needle);
}

/**
 * Page of an entry: `/mots/7` for a word, `/phrases/7` for a sentence.
 */
export function entryPath(word: Pick<Word, 'id' | 'kind'>): string {
  return `${word.kind === 'sentence' ? '/phrases' : '/mots'}/${word.id}`;
}

/**
 * Entries of one kind: the words, or the sentences.
 */
export function entriesOfKind(words: readonly Word[], kind: WordKind): Word[] {
  return words.filter((word) => word.kind === kind);
}

/**
 * Copy of the list with `word` replacing the entry of the same id, or appended when new.
 */
export function upsertWord(words: readonly Word[], word: Word): Word[] {
  return words.some((existing) => existing.id === word.id)
    ? words.map((existing) => (existing.id === word.id ? word : existing))
    : [...words, word];
}

/**
 * Copy of the list where the word owning `pronunciation` holds it, added or replaced, stages re-sorted.
 */
export function upsertPronunciation(words: readonly Word[], pronunciation: Pronunciation): Word[] {
  return words.map((word) => {
    if (word.id !== pronunciation.wordId) {
      return word;
    }
    const others = word.pronunciations.filter((existing) => existing.id !== pronunciation.id);
    return { ...word, pronunciations: sortPronunciations([...others, pronunciation]) };
  });
}

/**
 * Stage receiving the sounds of a deleted one, as the API picks it: the stage just before, else just after.
 */
export function heirStage(word: Word, pronunciationId: number): Pronunciation | undefined {
  const stages = sortPronunciations(word.pronunciations);
  const index = stages.findIndex((pronunciation) => pronunciation.id === pronunciationId);
  return index < 0 ? undefined : stages[index > 0 ? index - 1 : 1];
}

/**
 * Copy of the list without the stage `pronunciationId`, its sounds filed under its heir.
 */
export function removePronunciation(words: readonly Word[], pronunciationId: number): Word[] {
  return words.map((word) => {
    const heir = heirStage(word, pronunciationId);
    if (!heir) {
      return word;
    }
    return {
      ...word,
      pronunciations: word.pronunciations.filter(
        (pronunciation) => pronunciation.id !== pronunciationId,
      ),
      recordings: word.recordings.map((recording) =>
        recording.pronunciationId === pronunciationId
          ? { ...recording, pronunciationId: heir.id }
          : recording,
      ),
    };
  });
}

/**
 * Copy of the list where the word owning `recording` lists it first, sounds being newest first.
 */
export function addRecording(words: readonly Word[], recording: Recording): Word[] {
  return words.map((word) =>
    word.id === recording.wordId
      ? {
          ...word,
          recordings: [
            recording,
            ...word.recordings.filter((existing) => existing.id !== recording.id),
          ],
        }
      : word,
  );
}

/**
 * Copy of the list where `recording` replaces the sound of the same id, in place.
 */
export function replaceRecording(words: readonly Word[], recording: Recording): Word[] {
  return words.map((word) =>
    word.id === recording.wordId
      ? {
          ...word,
          recordings: word.recordings.map((existing) =>
            existing.id === recording.id ? recording : existing,
          ),
        }
      : word,
  );
}

/**
 * Copy of the list without the sound `recordingId`.
 */
export function removeRecording(words: readonly Word[], recordingId: number): Word[] {
  return words.map((word) =>
    word.recordings.some((recording) => recording.id === recordingId)
      ? { ...word, recordings: word.recordings.filter((recording) => recording.id !== recordingId) }
      : word,
  );
}

/**
 * Instant of the entry's latest addition (itself, a stage or a sound), in epoch milliseconds.
 */
export function latestChangeAt(word: Word): number {
  return Math.max(
    Date.parse(word.createdAt),
    ...word.pronunciations.map((stage) => Date.parse(stage.createdAt)),
    ...word.recordings.map((recording) => Date.parse(recording.createdAt)),
  );
}

/**
 * Most telling addition to the entry after `since` (epoch milliseconds), `null` when nothing is newer.
 */
export function changeSince(word: Word, since: number): WordChange | null {
  const isNewer = (instant: string): boolean => Date.parse(instant) > since;
  if (isNewer(word.createdAt)) {
    return 'entry';
  }
  if (word.pronunciations.some((stage) => isNewer(stage.createdAt))) {
    return 'pronunciation';
  }
  return word.recordings.some((recording) => isNewer(recording.createdAt)) ? 'recording' : null;
}
