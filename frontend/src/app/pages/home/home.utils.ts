import { Resource } from '@angular/core';

import { translate } from '@jsverse/transloco';

import { dayAndMonth, formatLongDate, formatMonthYear } from '@core/date/date.utils';
import { isSingular } from '@core/i18n/i18n.utils';
import { quote } from '@core/text/text.utils';
import { PRONUNCIATION_STATUSES } from '@core/words/word.constants';
import { Word, WordChange, WordKind } from '@core/words/word.model';
import {
  countByStatus,
  currentPronunciation,
  entryPath,
  firstSaidDate,
  sortByFirstSaidDesc,
  statusLabel,
  wordMatchesQuery,
} from '@core/words/word.utils';

import {
  CHANGE_LABELS,
  SENTENCES_TAB_PARAM,
  SUMMARY_EMPTY_HEADLINES,
  SUMMARY_LATEST_LABELS,
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
 * Count of words or sentences with its noun, agreed in number ("1 mot", "3 phrases").
 */
export function countWithNoun(count: number, kind: WordKind): string {
  const singular = isSingular(count);
  if (kind === 'word') {
    return translate(singular ? 'home.countWordOne' : 'home.countWordOther', { count });
  }
  return translate(singular ? 'home.countSentenceOne' : 'home.countSentenceOther', { count });
}

/**
 * Entries changed since this device last looked, in the mascot card ("3 nouveautés depuis ta visite").
 */
function newsText(count: number): string {
  return translate(isSingular(count) ? 'home.summary.newsOne' : 'home.summary.newsOther', {
    count,
  });
}

/**
 * The latest entry and how the child says it, the participle agreed with its noun ("renard, dit « enard »").
 */
function latestText(latest: Word): string {
  const spoken = quote(currentPronunciation(latest).spoken);
  return translate(
    latest.kind === 'word' ? 'home.summary.latestWord' : 'home.summary.latestSentence',
    { label: latest.label, spoken },
  );
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
  const news = change ? `, ${translate(CHANGE_LABELS[word.kind][change])}` : '';
  return {
    id: word.id,
    path: entryPath(word),
    label: word.label,
    spoken: current.spoken,
    status: current.status,
    day,
    month,
    change,
    ariaLabel: translate('home.wordCard.ariaLabel', {
      spoken: current.spoken,
      label: word.label,
      status: statusLabel(current.status),
      date: formatLongDate(first),
      news,
    }),
  };
}

/**
 * The list cut into months of first-said date, in the order given (newest first), each titled and
 * counted with the noun of `kind` ("mot", "phrase"); `changeOf` tells what changed in each entry.
 */
export function groupByMonth(
  words: readonly Word[],
  kind: WordKind,
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
  return groups.map((group) => ({ ...group, countText: countWithNoun(group.cards.length, kind) }));
}

/**
 * Mascot card of a tab: total, latest entry, counts per status once there is one, and how many
 * entries changed since this device last looked.
 */
function summaryOf(entries: readonly Word[], kind: WordKind, newsCount: number): HomeSummary {
  const [latest] = sortByFirstSaidDesc(entries);
  return {
    total: entries.length,
    countText: countWithNoun(entries.length, kind),
    emptyHeadline: translate(SUMMARY_EMPTY_HEADLINES[kind]),
    latestLabel: translate(SUMMARY_LATEST_LABELS[kind]),
    latest: latest ? latestText(latest) : null,
    statusCounts:
      entries.length === 0
        ? null
        : SUMMARY_STATUS_ORDER.map((status) => {
            const count = countByStatus(entries, status);
            return { status, count, label: `${count} ${statusLabel(status)}` };
          }),
    newsText: newsCount > 0 ? newsText(newsCount) : null,
  };
}

/**
 * Mascot card of the words tab, `newsCount` of them changed since this device last looked.
 */
export function wordsSummary(words: readonly Word[], newsCount = 0): HomeSummary {
  return summaryOf(words, 'word', newsCount);
}

/**
 * Mascot card of the sentences tab, `newsCount` of them changed since this device last looked.
 */
export function sentencesSummary(sentences: readonly Word[], newsCount = 0): HomeSummary {
  return summaryOf(sentences, 'sentence', newsCount);
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
    return translate(filter === 'all' ? 'home.emptyWordsSearch' : 'home.emptyWordsSearchFiltered', {
      childName,
      query: quote(search),
    });
  }
  return translate(total === 0 ? 'home.emptyWords' : 'home.emptyWordsFiltered');
}

/**
 * Why the sentences list is empty, given the search, the filter and every sentence.
 */
export function emptySentencesMessage(query: string, filter: StatusFilter, total: number): string {
  const search = query.trim();
  if (search !== '') {
    return translate(
      filter === 'all' ? 'home.emptySentencesSearch' : 'home.emptySentencesSearchFiltered',
      { query: quote(search) },
    );
  }
  return translate(total === 0 ? 'home.emptySentences' : 'home.emptySentencesFiltered');
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
