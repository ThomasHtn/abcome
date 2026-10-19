import { AppLocale } from '@core/i18n/i18n.model';

/**
 * Backend routes, declared once here; components never build URLs.
 */
export const API_ENDPOINTS = {
  /**
   * Answers the session when signed in, 401 otherwise; also sets the CSRF cookie.
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
   * Name of the app, open without a session.
   */
  branding: '/api/branding',

  /**
   * Built-in list of common first words in one language, read-only.
   */
  dictionary: (language: AppLocale): string => `/api/dictionary?language=${language}`,

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
   * Sounds of one stage, to add a sound as raw audio.
   */
  pronunciationRecordings: (pronunciationId: number): string =>
    `/api/pronunciations/${pronunciationId}/recordings`,

  /**
   * Audio bytes of a recording (immutable, so cached forever), and the route to move or delete it.
   */
  recording: (id: number): string => `/api/recordings/${id}`,
} as const;
