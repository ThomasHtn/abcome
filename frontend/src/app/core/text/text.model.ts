/**
 * Search key of a text with, for each key character, the index of the original character it came from.
 */
export interface SearchKey {
  /**
   * The text as a search sees it.
   */
  key: string;

  /**
   * Index in the original text of each character of `key`.
   */
  origins: number[];
}

/**
 * Half-open range of indexes in a text, `end` excluded.
 */
export interface TextRange {
  /**
   * First index of the range.
   */
  start: number;

  /**
   * Index just after the range.
   */
  end: number;
}
