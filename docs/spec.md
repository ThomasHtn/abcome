# ABCome functional spec

The UI is in French; quoted strings are shown as the app displays them. "The child" is the toddler whose words the notebook keeps; `[child]` in a quoted string stands for their first name.

## Users and access

- The family shares one password to open the notebook ("Ouvrir le carnet").
- Everyone sees and edits the same data, from any device.
- A web app, kept as a home-screen shortcut (manifest, no service worker): every new screen, and the app coming back to the screen, fetches the notebook again, so what another phone changed shows up.
- The child's first name is never in the repository: it is `CHILD_NAME` in the backend `.env`, sent only to a signed-in visitor (session check and login answers). The login screen and the manifest never show it; an app opened without reaching the server says "Bébé" until it is reloaded.
- Logout asks for confirmation; data stays on the server. When the server cannot close the session (offline, down), the visitor stays in the notebook and is told so.

## Security rules

Every rule is mandatory. Any change goes through this section first.

### Family password

- Only its Argon2id hash is stored, in `FAMILY_PASSWORD_HASH`. The password never appears in the repository, database, logs or error messages.
- Passphrase of 16 characters or more, shared out of band.
- Changing it means replacing the hash and restarting: every session is invalidated.
- Compared by Spring Security's encoder (constant time), never with `equals`.
- Hash memory cost at most 32 MiB (`-m 15`); the backend refuses to start above it.

### Login

- `POST /api/auth/login` is the only public write route. A wrong password always gets the same response and delay.
- Each attempt is counted before the check, so parallel guesses cannot exceed the budget.
- Per-address lockout after 5 failures, on top of the Traefik rate limit: 1 minute, then doubling (2, 4, 8) up to 15 minutes. A right password resets the address; an address quiet for 15 minutes is forgotten. `Retry-After` gives the remaining wait.
- `LOGIN_LOCKOUT_ENABLED=false` disables the lockout in development only; it defaults to on.
- At most 2 password checks run at once; beyond that, `429 TOO_MANY_ATTEMPTS` with `Retry-After: 1`.
- `FORWARD_HEADERS_STRATEGY=framework` is mandatory behind Traefik, otherwise every caller looks like the proxy and one attacker locks out the family.
- Failed attempts are logged with address and timestamp, never with the submitted value.

### Session

- Server-side, stored in PostgreSQL: survives a restart, can be revoked.
- Cookie `__Host-` prefixed, `HttpOnly`, `Secure`, `SameSite=Strict`, no `Domain`, `Max-Age` equal to the timeout, renewed at each session check. Idle timeout 30 days.
- Id regenerated at login, destroyed at logout.
- No token in `localStorage` or `sessionStorage`.

### Requests

- Every `/api/**` route needs a session except login, session check and health. Deny by default.
- CSRF on: Spring Security cookie token, read by Angular's `HttpClient`.
- Inputs validated with Bean Validation. Audio uploads checked for size (2 MB), MIME type (`audio/webm`, `audio/mp4`, `audio/wav`) and duration (15 s).
- Errors go through `GlobalExceptionHandler`: no stack trace, SQL or internal detail.
- Swagger UI off in production (`API_DOCS_ENABLED=false`).

### Delivery

- nginx answers `/api/*` itself only when the backend is down (Traefik routes it otherwise): a JSON `503` with code `UNAVAILABLE`, never the app shell.
- A database outage fails a request within seconds (connection wait 3 s), not after Hikari's default 30 s.
- nginx sends the security headers: CSP without `unsafe-inline` scripts, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` allowing only the microphone. Traefik handles HTTPS and HSTS.
- Containers run unprivileged; only Traefik is exposed.
- Secrets in uncommitted `.env` files; `.env.example` documents every key.
- Dependabot: grouped weekly updates, security advisories as separate pull requests.

## Outage

- No network on the device: a red band on top of every screen, "Pas de connexion internet. Le carnet se remettra à jour dès son retour."
- The server not answering (no answer, or a 5xx): the band says "Le carnet ne répond pas pour l'instant. Réessaie dans quelques minutes." with "Réessayer", which reloads the page.
- The band goes at the next answer from the server, or when the network comes back.
- A screen whose notebook failed to load says "Le carnet n'a pas pu s'ouvrir." with "Réessayer", and Lapinou greets ("Coucou !") rather than calling the notebook empty.

## Pronunciation status

Each status has a color, an icon and a label. Lists draw it as a small colored dot, the label written next to it or read by screen readers in the element's accessible name; the word page's hero shows the badge with icon and label.

| Status   | Color  | Label    | Meaning                             | Example           |
| -------- | ------ | -------- | ----------------------------------- | ----------------- |
| learning | red    | En route | Only parents recognize it           | chat → « ka »     |
| almost   | orange | Presque  | Recognizable, a syllable is missing | lapin → « apin »  |
| mastered | green  | Bien dit | Said like a grown-up                | maman → « maman » |

## Screens

A text field that must be filled to save (what the child says, what a sentence means) has a salmon asterisk after its label and is marked required for screen readers.

### 1. Login (Connexion)

- Password field with show/hide toggle; error and shake on a wrong password.
- Under the field, until something is tried: "C'est le mot de passe de la famille : demande-le aux parents."
- A lockout says it holds on this network, for the whole home, and for how many minutes.
- Lapinou covers its eyes while the password is typed.

### 2. Home (Accueil)

- Tabs "Mots" and "Phrases", built alike: a sentence is a notebook entry like a word, labelled by what the child meant.
- Header: total, the latest entry and how the child says it ("renard, dit « enard »"), count per status, for the open tab.
- Entries sorted by first-said date, newest first; filters by current status ("Tous", "Toutes" on sentences), kept in the URL; search on the label and every spoken form, ignoring accents and case.
- The list is cut into months of first-said date, each under its title ("Octobre 2026") and its count ("5 mots"); the title stays at the top of the screen while its month scrolls by.
- The search hides behind a magnifier next to the tabs; opening it swaps the tabs for the field, closing it (cross or Escape) clears it. A search kept in the URL opens it.
- An empty search offers to add the searched word.
- Word and sentence card: first-said date, the word or what the sentence means as its title, "[child] dit « apin »" below with the spoken form in salmon, current status as a small dot at the end (the card's accessible name reads it).
- A tap on a card opens the word's or the sentence's page.
- What changed since this device last looked: an entry, a stage or a sound added elsewhere puts a small lavender tag after the card's title, holding one outlined icon, the same size for all: a sparkle for a new word or sentence, a speech bubble for a new stage, a microphone for a new sound (one tag per card, in that order). The card's accessible name says it ("nouveau mot", "nouvelle phrase", "nouvelle prononciation", "nouveau son").
- Lapinou's bubble counts the changed entries of the open tab ("3 nouveautés depuis ta visite"); the other tab carries a lavender dot when it has some.
- These marks are kept per device, in browser storage (entry ids and instants only): opening an entry's page marks it seen, and so does adding a word, a sentence, a stage or a sound from this device. The first visit on a device marks nothing, and a change older than 14 days is no longer shown. Editing a stage, renaming an entry, moving or deleting a sound mark nothing.
- Actions: add a word, add a sentence (a bottom sheet: what the child meant, then what they said, its status and day), record a sound, logout.

### 3. Add a word (Ajout)

- Search the dictionary: prefix matches first, then contains matches; words already said are flagged.
- "Mots fréquents à cet âge": the first 8 `frequent` words not said yet.
- A word outside the dictionary can be added (category "mot perso").
- The chosen word is shown with a picture of its category and its category name, with a way back to the search.
- An existing word is never duplicated: link to its page to add a stage.
- Form: spoken form, status, first-said date (today by default).

### 4. Word or sentence page (Mot, Phrase)

The same page for both; its wording names a word or a sentence.

- Hero tinted by the current status, with Lapinou, the word and its status in a white badge (status icon and label).
- Stages, newest first, each titled with its date ("Aujourd'hui" or "Maintenant", "Étape n", "Première fois").
- Each stage is one white card: its header (status dot, date, spoken form, a quiet chevron; a tap edits it), then its sounds, newest first, under a hairline. Each sound is a voice note (play, time played, waveform decoded from the audio in the browser, scaled so a single click does not flatten the voice, and flat when it cannot be, darkening from the left as it plays, length; one sound plays at a time, and a sound the device cannot play says so) with a quiet "⋮" opening its actions: move to another stage of the word (when it has several), delete (with confirmation). No limit. A word without any sound says how to record one.
- Tap a stage to edit it; add a stage; delete one with confirmation, which names the stage receiving its sounds: the stage just before it, or just after it for the oldest. "Garder" goes back to the stage form, edits kept.
- Menu: rename the word ("Modifier la phrase" for a sentence) or delete it (with its stages and sounds, after confirmation).

### 5. Record a sound (Son)

- Record up to 15 s, play back, retry or keep; a recording stopped by the 15 s cap says so. The clock sits above the waveform: elapsed out of 15 s while recording, then the kept length to the tenth. A microphone blocked, missing or already in use gets its own message.
- Trim before keeping: two handles on the waveform cut the start and the end (at least 0.5 s kept), the cut parts dimmed; playback plays the kept part only, and "Annuler la coupe" restores the whole sound. A trimmed sound is cut in the browser and sent as WAV (mono, 22 050 Hz, 16 bit); an untouched one is sent as recorded. A line under the waveform explains the handles. Where the browser cannot decode its own recording, the handles are not offered.
- Pick the word or sentence: an existing one (or `?mot=`) then offers its stages, newest first, or "Il le dit autrement" to note a new stage that receives the sound; a new word also needs its first stage, which receives the sound.
- "Enregistrer un autre son" records several in a row.

## Data model

- **word** (a notebook entry): id, kind (`word` or `sentence`, never changes), label (a word 1 to 40 chars, what a sentence means 1 to 200), normalized_label (lower case, no accents, never empty; unique among words only, two sentences may mean the same), category (`custom` for a sentence), created_at.
- **pronunciation** (stage): id, word_id (cascade delete), spoken (1 to 60 chars for a word, 200 for a sentence), status, date (from 2020-01-01, catching a mistyped year, and not in the future), created_at.
- **recording**: id, word_id (cascade delete, indexed), pronunciation_id (the stage it is filed under, indexed; no cascade, a deleted stage hands its sounds to a neighbour), data (`bytea`, loaded only on playback), mime_type (`audio/webm`, `audio/mp4` or `audio/wav`), size_bytes, duration_ms (300 to 15 000), created_at.
- **dictionary_entry**: label (unique), category, frequent, acquisition_rank (unique), source (`ifdc` or `abcome`). Read-only, seeded from `docs/dictionary/dictionary.csv` (736 words).
- Spring Session JDBC tables.

Typed texts are trimmed and inner spaces collapsed before the length check, and stored that way.

Categories (code / UI label): `sounds` bruits et onomatopées, `games_routines` jeux et routines, `vehicles` véhicules, `animals` animaux, `toys` jouets, `clothing` vêtements, `outside` dehors, `places` lieux, `household` objets de la maison, `body_parts` corps, `food_drink` à manger et à boire, `furniture_rooms` meubles et pièces, `people` personnes, `descriptive_words` mots pour décrire, `action_words` actions, `time_words` le temps, `helping_verbs` petits verbes, `question_words` questions, `prepositions` petits mots de lieu, `quantifiers` quantités, `pronouns` pronoms, `connecting_words` mots de liaison, `custom` mot perso.

A word's current status is its latest stage (by date, then id); its first-said date is its oldest stage. A word always keeps at least one stage.

Volumes are small: lists are returned whole, without pagination; search, filters and counts run in the browser.

## REST API

JSON under `/api`, same origin. Dates `yyyy-MM-dd`, enums in lower case. Errors are `ApiErrorResponse` with a stable `code`. Every write needs `X-XSRF-TOKEN` (from the `XSRF-TOKEN` cookie), otherwise `403 FORBIDDEN`.

| Method and path                                        | Body                                                              | Success                                                               | Errors                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `GET /api/auth/session`                                |                                                                   | `200 {childName}` if signed in, sets the CSRF cookie                  | `401 UNAUTHENTICATED`                                               |
| `POST /api/auth/login`                                 | `{password}`                                                      | `200 {childName}`, session cookie                                     | `401 INVALID_CREDENTIALS`, `429 TOO_MANY_ATTEMPTS`                  |
| `POST /api/auth/logout`                                |                                                                   | `204`                                                                 |                                                                     |
| `GET /api/dictionary`                                  |                                                                   | `200 [{label, category, frequent}]` by acquisition rank, cached 1 day |                                                                     |
| `GET /api/words`                                       |                                                                   | `200 [Word]`                                                          |                                                                     |
| `GET /api/words/{id}`                                  |                                                                   | `200 Word`                                                            | `404 NOT_FOUND`                                                     |
| `POST /api/words`                                      | `{kind?, label, pronunciation: {spoken, status, date}}`           | `201 Word` + `Location`                                               | `400 INVALID_REQUEST`, `409 WORD_ALREADY_EXISTS`                    |
| `PUT /api/words/{id}`                                  | `{label}`                                                         | `200 Word`                                                            | `400`, `404`, `409 WORD_ALREADY_EXISTS`                             |
| `DELETE /api/words/{id}`                               |                                                                   | `204`                                                                 | `404`                                                               |
| `POST /api/words/{id}/pronunciations`                  | `{spoken, status, date}`                                          | `201 Pronunciation`                                                   | `400`, `404`                                                        |
| `PUT /api/pronunciations/{id}`                         | `{spoken, status, date}`                                          | `200 Pronunciation`                                                   | `400`, `404`                                                        |
| `DELETE /api/pronunciations/{id}`                      |                                                                   | `204`                                                                 | `404`, `409 LAST_PRONUNCIATION`                                     |
| `POST /api/pronunciations/{id}/recordings?durationMs=` | raw audio, `audio/webm`, `audio/mp4` or `audio/wav` (codec parameters allowed) | `201 Recording` + `Location`                                          | `400`, `404`, `413 PAYLOAD_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE` |
| `GET /api/recordings/{id}`                             |                                                                   | `200` audio (`206` for `Range`), cached 1 year, immutable             | `404`                                                               |
| `PUT /api/recordings/{id}`                             | `{pronunciationId}`, a stage of the same word                     | `200 Recording`                                                       | `400` (stage unknown or of another word), `404`                     |
| `DELETE /api/recordings/{id}`                          |                                                                   | `204`                                                                 | `404`                                                               |

Shapes:

- `Word`: `{id, kind, label, category, createdAt, pronunciations, recordings}`, `kind` `word` (the default on creation) or `sentence`, stages by date then id, recordings newest first (metadata only).
- `Pronunciation`: `{id, wordId, spoken, status, date, createdAt}`.
- `Recording`: `{id, wordId, pronunciationId, mimeType, durationMs, createdAt}`.

Caching: dictionary `private, max-age=86400`; recordings `private, max-age=31536000, immutable` with `Accept-Ranges: bytes`. A sound for a new word takes two calls: create the word, then add the recording.

## Frontend routes

| Path            | Screen                                  | Access                                |
| --------------- | --------------------------------------- | ------------------------------------- |
| `/connexion`    | Login                                   | Public, signed-in visitor sent to `/` |
| `/`             | Home (`?onglet=phrases`, `?q=`, `?filtre=bien-dit\|presque\|en-route`) | Session |
| `/mots/nouveau` | Add a word (`?mot=<label>` prefills)    | Session                               |
| `/mots/:id`     | Word page                               | Session                               |
| `/phrases/:id`  | Sentence page (the word page)           | Session                               |
| `/sons/nouveau` | Record a sound (`?mot=<id>` preselects) | Session                               |

Any `401` sends the visitor back to `/connexion`. A sentence opened under `/mots/:id`, or a word under `/phrases/:id`, is sent to its own path.

## Design tokens

Light mode only. Mobile reference 390x844.

### Colors

| Token                | Hex     |
| -------------------- | ------- |
| salmon-50            | #FFF5F1 |
| salmon-100           | #FFE6DD |
| salmon-200           | #FFD0C1 |
| salmon-300 (primary) | #FFB49E |
| salmon-400           | #F7957C |
| salmon-700           | #B4513B |
| lavender-50          | #F5F3FE |
| lavender-100         | #E8E4FB |
| lavender-200         | #D2CBF6 |
| lavender-300         | #B3A9EC |
| lavender-400         | #9488DF |
| lavender-700         | #5246A8 |
| background           | #FFF9F6 |
| border               | #EFE6E2 |
| text-muted           | #6E6882 |
| ink                  | #2F2A40 |

| Status   | Background | Dot     | Text    |
| -------- | ---------- | ------- | ------- |
| mastered | #DDF4E4    | #3FB26A | #1D6B3C |
| almost   | #FFEBD2    | #F29A38 | #9A4F00 |
| learning | #FFE1E1    | #E5534B | #A8231C |

### Typography

- Display: Fredoka (700 / 34 page title, 600 / 24 section title, 500 / 20 word).
- Body: Nunito (400 / 16 body, 600 / 14 meta).

### Shapes

Radii: 12 chip, 20 card, 28 block, pill for buttons. Soft shadows.

### Motion

- Float: mascot breathes (3 s loop).
- Pop: a new word bounces into the list (0.6 s).
- Celebration: salmon and lavender confetti when a word becomes mastered, or a sentence or sound is added.
- Change tag: pops in with its card, then its icon sways briefly every 5 s.
- Entry: screens cascade in (0.5 s), bottom bar slides up.
- Press: buttons squash; tapping Lapinou makes it jump.
- Sheet: rises with a light bounce, backdrop fades in.
- All motion off under `prefers-reduced-motion`.
