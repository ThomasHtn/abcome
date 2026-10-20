import { Resource } from '@angular/core';

import { translate } from '@jsverse/transloco';

import {
  ageInMonths,
  dayAndMonth,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  monthsUnit,
  todayIso,
} from '@core/date/date.utils';
import { isSingular } from '@core/i18n/i18n.utils';
import { Milestone } from '@core/milestones/milestone.model';
import { markerLabel } from '@core/milestones/milestone.utils';
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
  CardContext,
  CardTile,
  HomeSummary,
  HomeTab,
  ListState,
  MilestoneMarkerView,
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
 * Cards without a birth date nor markers, judged today: the context of a list before the session says more.
 */
export function plainCardContext(): CardContext {
  return { birthDate: null, today: todayIso(), markers: new Map() };
}

/**
 * Markers of the milestones, under the entry that reached each; one entry may hold several.
 */
export function markersByEntry(
  milestones: readonly Milestone[],
  birthDate: string | null,
  today: string,
): Map<number, MilestoneMarkerView[]> {
  const currentYear = Number(today.slice(0, 4));
  const markers = new Map<number, MilestoneMarkerView[]>();
  // Newest first, like the list, so two markers above one card read top down.
  for (const milestone of [...milestones].reverse()) {
    const marker: MilestoneMarkerView = {
      key: milestone.key,
      kind: milestone.kind,
      count: milestone.count,
      label: markerLabel(milestone, birthDate, currentYear),
    };
    markers.set(milestone.entry.id, [...(markers.get(milestone.entry.id) ?? []), marker]);
  }
  return markers;
}

/**
 * Tile of a card: the child's age on its first day when his birth date is known, else that day.
 */
function cardTile(first: string, birthDate: string | null): CardTile {
  if (birthDate) {
    const months = ageInMonths(birthDate, first);
    return { value: String(months), unit: monthsUnit(months), age: true };
  }
  const { day, month } = dayAndMonth(first);
  return { value: day, unit: month, age: false };
}

/**
 * Card of a word or a sentence: the age or the day of the first time, its label, its current spoken
 * form and status, whether it keeps sounds, what changed since this device last looked, and the
 * milestones it reached.
 */
export function toWordCard(
  word: Word,
  change: WordChange | null = null,
  context: CardContext = plainCardContext(),
): WordCardView {
  const current = currentPronunciation(word);
  const first = firstSaidDate(word);
  const currentYear = Number(context.today.slice(0, 4));
  const news = change ? `, ${translate(CHANGE_LABELS[word.kind][change])}` : '';
  const soundCount = word.recordings.length;
  const sounds =
    soundCount === 0
      ? ''
      : translate(
          isSingular(soundCount) ? 'home.wordCard.soundsOne' : 'home.wordCard.soundsOther',
          {
            count: soundCount,
          },
        );
  return {
    id: word.id,
    path: entryPath(word),
    label: word.label,
    spoken: current.spoken,
    status: current.status,
    tile: cardTile(first, context.birthDate),
    saidOn: context.birthDate
      ? translate('home.wordCard.saidOn', { date: formatShortDate(first, currentYear) })
      : null,
    markers: context.markers.get(word.id) ?? [],
    change,
    hasSound: soundCount > 0,
    ariaLabel: translate('home.wordCard.ariaLabel', {
      spoken: current.spoken,
      label: word.label,
      status: statusLabel(current.status),
      date: formatLongDate(first),
      sounds,
      news,
    }),
  };
}

/**
 * The list cut into months of first-said date, in the order given (newest first), each titled and
 * counted with the noun of `kind` ("mot", "phrase"); `changeOf` tells what changed in each entry, and
 * `context` what every card needs besides it.
 */
export function groupByMonth(
  words: readonly Word[],
  kind: WordKind,
  changeOf: (word: Word) => WordChange | null = () => null,
  context: CardContext = plainCardContext(),
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
    group.cards.push(toWordCard(word, changeOf(word), context));
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
