import { Resource } from '@angular/core';

import { dayAndMonth, formatLongDate, formatMonthYear } from '@core/date/date.utils';
import { quote } from '@core/text/text.utils';
import { PRONUNCIATION_STATUSES, STATUS_LABELS } from '@core/words/word.constants';
import { Word, WordChange } from '@core/words/word.model';
import {
  countByStatus,
  currentPronunciation,
  entryPath,
  firstSaidDate,
  sortByFirstSaidDesc,
  wordMatchesQuery,
} from '@core/words/word.utils';

import {
  CHANGE_LABELS,
  NEWS_NOUN,
  SENTENCES_TAB_PARAM,
  SUMMARY_STATUS_ORDER,
} from './home.constants';
import {
  HomeSummary,
  HomeTab,
  ListState,
  MonthGroup,
  StatusFilter,
  WordCardView,
} from './home.model';

/**
 * Tab named by `?tab=`; anything but `sentences` means the words.
 */
export function tabFromParam(param: string | null | undefined): HomeTab {
  return param === SENTENCES_TAB_PARAM ? 'sentences' : 'words';
}

/**
 * Status filter named by `?filter=`; anything unknown means every status.
 */
export function filterFromParam(param: string | null | undefined): StatusFilter {
  return PRONUNCIATION_STATUSES.find((status) => status === param) ?? 'all';
}

/**
 * Count with its noun, agreed in number ("1 mot", "3 mots").
 */
export function countWithNoun(count: number, noun: string): string {
  return `${count} ${noun}${count > 1 ? 's' : ''}`;
}

/**
 * Words or sentences of the list: newest first, kept when their current status and some form match.
 */
export function visibleWords(words: readonly Word[], query: string, filter: StatusFilter): Word[] {
  return sortByFirstSaidDesc(words).filter(
    (word) =>
      (filter === 'all' || currentPronunciation(word).status === filter) &&
      wordMatchesQuery(word, query),
  );
}

/**
 * Card of a word or a sentence: first date, its label, its current spoken form and status, and what
 * changed since this device last looked.
 */
export function toWordCard(word: Word, change: WordChange | null = null): WordCardView {
  const current = currentPronunciation(word);
  const first = firstSaidDate(word);
  const { day, month } = dayAndMonth(first);
  const news = change ? `, ${CHANGE_LABELS[word.kind][change]}` : '';
  return {
    id: word.id,
    path: entryPath(word),
    label: word.label,
    spoken: current.spoken,
    status: current.status,
    day,
    month,
    change,
    ariaLabel: `${current.spoken}, pour ${word.label}, ${STATUS_LABELS[current.status]}, depuis le ${formatLongDate(first)}${news}. Voir sa page`,
  };
}

/**
 * The list cut into months of first-said date, in the order given (newest first), each titled and
 * counted with `noun` ("mot", "phrase"); `changeOf` tells what changed in each entry.
 */
export function groupByMonth(
  words: readonly Word[],
  noun: string,
  changeOf: (word: Word) => WordChange | null = () => null,
): MonthGroup[] {
  const groups: MonthGroup[] = [];
  words.forEach((word, index) => {
    const first = firstSaidDate(word);
    const key = first.slice(0, 7);
    let group = groups.at(-1);
    if (group?.key !== key) {
      group = { key, title: formatMonthYear(first), countText: '', cards: [], offset: index };
      groups.push(group);
    }
    group.cards.push(toWordCard(word, changeOf(word)));
  });
  return groups.map((group) => ({ ...group, countText: countWithNoun(group.cards.length, noun) }));
}

/**
 * Mascot card of a tab: total, latest entry, counts per status once there is one, and how many
 * entries changed since this device last looked.
 */
function summaryOf(
  entries: readonly Word[],
  noun: string,
  emptyHeadline: string,
  latestLabel: string,
  spokenVerb: string,
  newsCount: number,
): HomeSummary {
  const [latest] = sortByFirstSaidDesc(entries);
  return {
    total: entries.length,
    countText: countWithNoun(entries.length, noun),
    emptyHeadline,
    latestLabel,
    latest: latest
      ? `${latest.label}, ${spokenVerb} ${quote(currentPronunciation(latest).spoken)}`
      : null,
    statusCounts:
      entries.length === 0
        ? null
        : SUMMARY_STATUS_ORDER.map((status) => {
            const count = countByStatus(entries, status);
            return { status, count, label: `${count} ${STATUS_LABELS[status]}` };
          }),
    newsText: newsCount > 0 ? `${countWithNoun(newsCount, NEWS_NOUN)} depuis ta visite` : null,
  };
}

/**
 * Mascot card of the words tab, `newsCount` of them changed since this device last looked.
 */
export function wordsSummary(words: readonly Word[], newsCount = 0): HomeSummary {
  return summaryOf(words, 'mot', 'Le carnet attend son premier mot !', 'Dernier', 'dit', newsCount);
}

/**
 * Mascot card of the sentences tab, `newsCount` of them changed since this device last looked.
 */
export function sentencesSummary(sentences: readonly Word[], newsCount = 0): HomeSummary {
  return summaryOf(
    sentences,
    'phrase',
    'Le carnet attend sa première phrase !',
    'Dernière',
    'dite',
    newsCount,
  );
}

/**
 * Why the words list is empty, given the search, the filter and the whole notebook.
 */
export function emptyWordsMessage(
  query: string,
  filter: StatusFilter,
  total: number,
  childName: string,
): string {
  const search = query.trim();
  if (search !== '') {
    return `${childName} n'a pas encore dit ${quote(search)}${filter === 'all' ? '.' : ' dans cette couleur.'}`;
  }
  return total === 0
    ? 'Pas encore de mot. Le premier arrive bientôt !'
    : "Aucun mot dans cette couleur pour l'instant.";
}

/**
 * Why the sentences list is empty, given the search, the filter and every sentence.
 */
export function emptySentencesMessage(query: string, filter: StatusFilter, total: number): string {
  const search = query.trim();
  if (search !== '') {
    return `Aucune phrase ne contient ${quote(search)}${filter === 'all' ? '.' : ' dans cette couleur.'}`;
  }
  return total === 0
    ? 'Pas encore de phrase. La première arrive bientôt !'
    : "Aucune phrase dans cette couleur pour l'instant.";
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
