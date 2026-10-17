import { SearchKey, TextRange } from './text.model';

/**
 * Runs of whitespace, collapsed to one space as the backend does.
 */
const WHITESPACE = /\s+/gu;

/**
 * Combining marks left by the NFD decomposition: the accents.
 */
const COMBINING_MARKS = /\p{M}+/gu;

/**
 * Comparison key of a label, the exact twin of the backend's `Labels.normalize`, so "Gâteau " and
 * "gateau" or "sœur" and "soeur" are the same word on both sides.
 */
export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(WHITESPACE, ' ')
    .toLowerCase()
    .replaceAll('œ', 'oe')
    .replaceAll('æ', 'ae')
    .replaceAll('\u2019', "'")
    .normalize('NFD')
    .replace(COMBINING_MARKS, '');
}

/**
 * Characters a search ignores: straight and curly apostrophes ("sil" finds "s'il").
 */
const SEARCH_DROPPED = /['\u2019]/u;

/**
 * Characters a search reads as a space: hyphens ("la bas" finds "là-bas").
 */
const SEARCH_SPACED = /[-\u2010\u2011]/u;

/**
 * Search key of a text, built character by character so each key position knows the index of the
 * original character it came from (`origins`); used to highlight a match in the original label.
 */
function searchKey(text: string): SearchKey {
  let key = '';
  const origins: number[] = [];
  Array.from(text).reduce((index, character) => {
    const piece = SEARCH_DROPPED.test(character)
      ? ''
      : SEARCH_SPACED.test(character) || /\s/u.test(character)
        ? ' '
        : normalizeText(character);
    for (const output of piece) {
      // Collapses runs of spaces and drops leading ones.
      if (output === ' ' && (key === '' || key.endsWith(' '))) {
        continue;
      }
      key += output;
      origins.push(index);
    }
    return index + character.length;
  }, 0);
  return { key, origins };
}

/**
 * Search key of a text: `normalizeText`, then apostrophes dropped, hyphens read as spaces and spaces
 * collapsed. For searching only, never for duplicate detection (that stays `normalizeText`).
 */
export function normalizeForSearch(text: string): string {
  return searchKey(text).key.trimEnd();
}

/**
 * Where `query` appears in `text` for a search, as indexes in the original `text`; null when absent.
 */
export function findQueryRange(text: string, query: string): TextRange | null {
  const needle = normalizeForSearch(query);
  const { key, origins } = searchKey(text);
  const position = needle === '' ? -1 : key.indexOf(needle);
  if (position < 0) {
    return null;
  }
  const last = origins[position + needle.length - 1] ?? position;
  const end = last + (Array.from(text.slice(last))[0]?.length ?? 1);
  return { start: origins[position] ?? 0, end };
}

/**
 * Whether `text` contains `query` for a search (case, accents, apostrophes and hyphens ignored);
 * an empty query matches everything.
 */
export function matchesQuery(text: string, query: string): boolean {
  return normalizeForSearch(text).includes(normalizeForSearch(query));
}

/**
 * Items whose label matches `query` for a search, those starting with it first, each group in input order.
 */
export function rankByQuery<T>(
  items: readonly T[],
  label: (item: T) => string,
  query: string,
): T[] {
  const needle = normalizeForSearch(query);
  if (needle === '') {
    return [];
  }
  const starts: T[] = [];
  const contains: T[] = [];
  for (const item of items) {
    const position = normalizeForSearch(label(item)).indexOf(needle);
    if (position === 0) {
      starts.push(item);
    } else if (position > 0) {
      contains.push(item);
    }
  }
  return [...starts, ...contains];
}

/**
 * No-break space kept inside French guillemets, so « and » never end up alone at a line break.
 */
const NO_BREAK_SPACE = '\u00A0';

/**
 * Quotes a word or a sentence the French way, the one way UI copy quotes: « lapin ».
 */
export function quote(text: string): string {
  return `\u00AB${NO_BREAK_SPACE}${text}${NO_BREAK_SPACE}\u00BB`;
}
