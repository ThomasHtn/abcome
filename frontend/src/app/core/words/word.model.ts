/**
 * What a notebook entry is: a single word, or a sentence labelled by what Côme meant.
 */
export type WordKind = 'word' | 'sentence';

/**
 * How close a spoken form is to the word: "En route", "Presque", "Bien dit".
 */
export type PronunciationStatus = 'learning' | 'almost' | 'mastered';

/**
 * Dictionary category of a word (the IFDC ones, docs/spec.md); `custom` for a word outside the dictionary.
 */
export type WordCategory =
  | 'sounds'
  | 'games_routines'
  | 'vehicles'
  | 'animals'
  | 'toys'
  | 'clothing'
  | 'outside'
  | 'places'
  | 'household'
  | 'body_parts'
  | 'food_drink'
  | 'furniture_rooms'
  | 'people'
  | 'descriptive_words'
  | 'action_words'
  | 'time_words'
  | 'helping_verbs'
  | 'question_words'
  | 'prepositions'
  | 'quantifiers'
  | 'pronouns'
  | 'connecting_words'
  | 'custom';

/**
 * One stage of a word: what Côme said on a given day.
 */
export interface Pronunciation {
  /**
   * Server identifier.
   */
  id: number;

  /**
   * Word this stage belongs to.
   */
  wordId: number;

  /**
   * What Côme actually said ("apin").
   */
  spoken: string;

  /**
   * How close it was to the word.
   */
  status: PronunciationStatus;

  /**
   * Day it was said, `yyyy-MM-dd`.
   */
  date: string;
}

/**
 * A sound of the word filed under one of its stages, without its bytes: those are played from
 * `API_ENDPOINTS.recording(id)`.
 */
export interface Recording {
  /**
   * Server identifier; a recording never changes, so its URL is cached for good.
   */
  id: number;

  /**
   * Word it belongs to.
   */
  wordId: number;

  /**
   * Stage it is filed under.
   */
  pronunciationId: number;

  /**
   * Audio type, `audio/webm` or `audio/mp4`.
   */
  mimeType: string;

  /**
   * Length measured by the browser that recorded it.
   */
  durationMs: number;

  /**
   * Instant it was recorded, ISO 8601.
   */
  createdAt: string;
}

/**
 * A word Côme says, with every stage of its pronunciation and its sounds.
 */
export interface Word {
  /**
   * Server identifier.
   */
  id: number;

  /**
   * Word or sentence; both have stages and sounds alike.
   */
  kind: WordKind;

  /**
   * The word itself ("lapin"), or what a sentence means ("Il n'y a plus de gâteau").
   */
  label: string;

  /**
   * Category from the dictionary, `custom` otherwise and for a sentence.
   */
  category: WordCategory;

  /**
   * Instant it was added to the notebook, ISO 8601.
   */
  createdAt: string;

  /**
   * Stages sorted by date then id; never empty.
   */
  pronunciations: Pronunciation[];

  /**
   * Sounds, newest first; any number.
   */
  recordings: Recording[];
}

/**
 * Body of a stage creation or edit.
 */
export interface PronunciationRequest {
  /**
   * What Côme said, 1 to 60 characters.
   */
  spoken: string;

  /**
   * How close it was.
   */
  status: PronunciationStatus;

  /**
   * Day it was said, not in the future.
   */
  date: string;
}

/**
 * Body of a word or sentence creation, which always comes with its first stage.
 */
export interface CreateWordRequest {
  /**
   * Word (the default) or sentence.
   */
  kind?: WordKind;

  /**
   * The word, 1 to 40 characters and unique once normalized, or what a sentence means, up to 200.
   */
  label: string;

  /**
   * Its first stage.
   */
  pronunciation: PronunciationRequest;
}

/**
 * Body of a sound move to another stage of its word.
 */
export interface MoveRecordingRequest {
  /**
   * Stage receiving the sound.
   */
  pronunciationId: number;
}

/**
 * Body of a word rename.
 */
export interface UpdateWordRequest {
  /**
   * New label, unique once normalized.
   */
  label: string;
}
