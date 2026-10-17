/**
 * Backend routes of docs/spec.md, declared once here; components never build URLs.
 */
export const API_ENDPOINTS = {
  /**
   * Answers 204 when signed in, 401 otherwise; also sets the CSRF cookie.
   */
  session: '/api/auth/session',

  /**
   * Opens a session with the family password.
   */
  login: '/api/auth/login',

  /**
   * Destroys the current session.
   */
  logout: '/api/auth/logout',

  /**
   * Built-in list of common first words, read-only.
   */
  dictionary: '/api/dictionary',

  /**
   * Every word with its stages and sounds, returned whole.
   */
  words: '/api/words',

  /**
   * One word, to rename or delete it.
   */
  word: (id: number): string => `/api/words/${id}`,

  /**
   * Stages of one word, to add one.
   */
  wordPronunciations: (wordId: number): string => `/api/words/${wordId}/pronunciations`,

  /**
   * One stage, to edit or remove it.
   */
  pronunciation: (id: number): string => `/api/pronunciations/${id}`,

  /**
   * Sound gallery of one word, to add a sound as raw audio.
   */
  wordRecordings: (wordId: number): string => `/api/words/${wordId}/recordings`,

  /**
   * Audio bytes of a recording (immutable, so cached forever), and the route to delete it.
   */
  recording: (id: number): string => `/api/recordings/${id}`,

  /**
   * Every sentence, returned whole.
   */
  sentences: '/api/sentences',

  /**
   * One sentence, to edit or delete it.
   */
  sentence: (id: number): string => `/api/sentences/${id}`,
} as const;
