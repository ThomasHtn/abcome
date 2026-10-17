import { Resource } from '@angular/core';

import { dayAndMonth, formatLongDate } from '@core/date/date.utils';
import { Sentence } from '@core/sentences/sentence.model';
import { matchesQuery, quote } from '@core/text/text.utils';
import { STATUS_LABELS } from '@core/words/word.constants';
import { Word } from '@core/words/word.model';
import {
  countByStatus,
  currentPronunciation,
  firstSaidDate,
  sortByFirstSaidDesc,
  sortPronunciations,
  wordMatchesQuery,
} from '@core/words/word.utils';

import { SENTENCES_TAB_PARAM, SUMMARY_STATUS_ORDER } from './home.constants';
import {
  HomeSummary,
  HomeTab,
  ListState,
  SentenceCardView,
  StatusFilter,
  WordCardView,
} from './home.model';

/**
 * Tab named by `?onglet=`; anything but `phrases` means the words.
 */
export function tabFromParam(param: string | null | undefined): HomeTab {
  return param === SENTENCES_TAB_PARAM ? 'sentences' : 'words';
}

/**
 * Count with its noun, agreed in number ("1 mot", "3 mots").
 */
export function countWithNoun(count: number, noun: string): string {
  return `${count} ${noun}${count > 1 ? 's' : ''}`;
}

/**
 * Words of the list: newest first, kept when their current status and some form match.
 */
export function visibleWords(words: readonly Word[], query: string, filter: StatusFilter): Word[] {
  return sortByFirstSaidDesc(words).filter(
    (word) =>
      (filter === 'all' || currentPronunciation(word).status === filter) &&
      wordMatchesQuery(word, query),
  );
}

/**
 * Card of a word: first date, current spoken form, stage dots when it has progressed.
 */
export function toWordCard(word: Word): WordCardView {
  const stages = sortPronunciations(word.pronunciations);
  const current = stages[stages.length - 1];
  const first = firstSaidDate(word);
  const { day, month } = dayAndMonth(first);
  return {
    id: word.id,
    label: word.label,
    spoken: current.spoken,
    status: current.status,
    day,
    month,
    stageStatuses: stages.length > 1 ? stages.map((stage) => stage.status) : [],
    ariaLabel: `${current.spoken}, pour ${word.label}, ${STATUS_LABELS[current.status]}, depuis le ${formatLongDate(first)}. Voir sa page`,
  };
}

/**
 * Sentences of the list: newest first, kept when what was said or meant matches.
 */
export function visibleSentences(sentences: readonly Sentence[], query: string): Sentence[] {
  return [...sentences]
    .sort((first, second) => second.date.localeCompare(first.date) || second.id - first.id)
    .filter(
      (sentence) =>
        matchesQuery(sentence.spoken, query) || matchesQuery(sentence.meaning ?? '', query),
    );
}

/**
 * Card of a sentence, with its edit action spelt out for screen readers.
 */
export function toSentenceCard(sentence: Sentence): SentenceCardView {
  const { day, month } = dayAndMonth(sentence.date);
  const meaning = sentence.meaning ? `, ${sentence.meaning}` : '';
  return {
    sentence,
    day,
    month,
    ariaLabel: `${quote(sentence.spoken)}${meaning}, le ${formatLongDate(sentence.date)}. Modifier`,
  };
}

/**
 * Mascot card of the words tab: total, latest word, counts per status once there is a word.
 */
export function wordsSummary(words: readonly Word[]): HomeSummary {
  const [latest] = sortByFirstSaidDesc(words);
  return {
    total: words.length,
    countText: countWithNoun(words.length, 'mot'),
    emptyHeadline: 'Le carnet attend son premier mot !',
    latestLabel: 'Dernier',
    latest: latest ? currentPronunciation(latest).spoken : null,
    statusCounts:
      words.length === 0
        ? null
        : SUMMARY_STATUS_ORDER.map((status) => {
            const count = countByStatus(words, status);
            return { status, count, label: `${count} ${STATUS_LABELS[status]}` };
          }),
  };
}

/**
 * Mascot card of the sentences tab: total and latest sentence.
 */
export function sentencesSummary(sentences: readonly Sentence[]): HomeSummary {
  const [latest] = visibleSentences(sentences, '');
  return {
    total: sentences.length,
    countText: countWithNoun(sentences.length, 'phrase'),
    emptyHeadline: 'Le carnet attend sa première phrase !',
    latestLabel: 'Dernière',
    latest: latest?.spoken ?? null,
    statusCounts: null,
  };
}

/**
 * Why the words list is empty, given the search, the filter and the whole notebook.
 */
export function emptyWordsMessage(query: string, filter: StatusFilter, total: number): string {
  const search = query.trim();
  if (search !== '') {
    return `Côme n'a pas encore dit ${quote(search)}${filter === 'all' ? '.' : ' dans cette couleur.'}`;
  }
  return total === 0
    ? 'Pas encore de mot. Le premier arrive bientôt !'
    : "Aucun mot dans cette couleur pour l'instant.";
}

/**
 * Why the sentences list is empty.
 */
export function emptySentencesMessage(query: string): string {
  const search = query.trim();
  return search === ''
    ? 'Pas encore de phrase. La première arrive bientôt !'
    : `Aucune phrase ne contient ${quote(search)}.`;
}

/**
 * State of a list resource: loading before its first value, error when it failed without one.
 */
export function listState(resource: Resource<unknown>): ListState {
  if (resource.hasValue()) {
    return 'ready';
  }
  return resource.error() ? 'error' : 'loading';
}
