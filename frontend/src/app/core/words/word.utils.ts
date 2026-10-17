import { matchesQuery, normalizeText } from '@core/text/text.utils';

import { Pronunciation, PronunciationStatus, Recording, Word } from './word.model';

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
 * Oldest stage of a word: the first time Côme said it.
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
 * Day Côme first said the word, `yyyy-MM-dd`.
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
 */
export function findWordByLabel(words: readonly Word[], label: string): Word | undefined {
  const needle = normalizeText(label);
  return words.find((word) => normalizeText(word.label) === needle);
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
 * Copy of the list without the stage `pronunciationId`.
 */
export function removePronunciation(words: readonly Word[], pronunciationId: number): Word[] {
  return words.map((word) =>
    word.pronunciations.some((pronunciation) => pronunciation.id === pronunciationId)
      ? {
          ...word,
          pronunciations: word.pronunciations.filter(
            (pronunciation) => pronunciation.id !== pronunciationId,
          ),
        }
      : word,
  );
}

/**
 * Copy of the list where the word owning `recording` lists it first, the gallery being newest first.
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
 * Copy of the list without the sound `recordingId`.
 */
export function removeRecording(words: readonly Word[], recordingId: number): Word[] {
  return words.map((word) =>
    word.recordings.some((recording) => recording.id === recordingId)
      ? { ...word, recordings: word.recordings.filter((recording) => recording.id !== recordingId) }
      : word,
  );
}
