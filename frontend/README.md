# ABCome frontend

Angular 22 web app, installable as a home-screen shortcut (manifest, no service worker): standalone, zoneless, signals, Tailwind 4 for layout and SCSS for visuals. Conventions are in [CONTRIBUTING.md](../CONTRIBUTING.md).

## Commands

```bash
npx npm@11 install                   # npm 10.9 crashes on jsdom; also links the git pre-commit hook
npm start                            # :4200, proxies /api to :8080
npm test -- --watch=false            # vitest
npm run lint                         # ESLint then Stylelint
npm run format:check                 # Prettier
npm run fix                          # every auto-fix
npm run build                        # production bundle in dist/
```

## Folders

| Folder                        | Role                                                                     |
| ----------------------------- | ------------------------------------------------------------------------ |
| `src/app/core/`               | Data access (`*-api.ts`), models, pure utils; URLs in `api-endpoints.ts` |
| `src/app/shared/`             | Reusable components, one folder each                                     |
| `src/app/pages/`              | One folder per route                                                     |
| `src/styles/tokens/`          | Design tokens: colors, typography, shapes, motion                        |
| `src/styles/scss/_tools.scss` | Sass helpers: `tint()`, breakpoints, `hover`, `motion`, `truncate`       |
| `public/assets/`              | Mascot, status glyphs, confetti, icon sprite                             |
| `public/fonts/`               | Self-hosted Fredoka and Nunito                                           |
| `icons/`                      | App icon sources; `generate.sh` renders `public/icons/`                  |

Imports go `core` <- `shared` <- `pages`, a page never imports another page (ESLint enforces it). Aliases: `@core/*`, `@shared/*`, `@pages/*`.

## Styles

- Tailwind in the template for layout only, about five utilities per element, no arbitrary values.
- Everything visual in the component's `.scss`, which starts with `@use 'tools' as *;` and uses tokens only (no hex or `rgb()`).
- Never set the same property from a utility and from the `.scss`.
- BEM class names written in full (`.word-card__date`, never `&__`), none that Tailwind owns.
- Animations inside `@include motion { ... }` (reduced motion).

## Routes

Lazy-loaded from `app.routes.ts`. URL parameters bind to page inputs (`withComponentInputBinding`).

| Path            | Page               | URL inputs                   | Guard        |
| --------------- | ------------------ | ---------------------------- | ------------ |
| `/connexion`    | `LoginPage`        |                              | `guestGuard` |
| `/`             | `HomePage`         | `onglet` (`phrases`)         | `authGuard`  |
| `/mots/nouveau` | `WordNewPage`      | `mot` (prefills the search)  | `authGuard`  |
| `/mots/:id`     | `WordDetailPage`   | `id`, `kind` (route data)    | `authGuard`  |
| `/phrases/:id`  | `WordDetailPage`   | `id`, `kind` (route data)    | `authGuard`  |
| `/sons/nouveau` | `RecordingNewPage` | `mot` (word id to preselect) | `authGuard`  |

A 401 signs out and redirects to `/connexion`.

## Core

Lists are loaded whole, shared by every screen and patched locally after each write. Read a resource through `resourceValue(resource, fallback)`: `value()` throws on error.

| File                                | Gives                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `core/auth/auth-session.ts`         | `signedIn()`, `ensureChecked()`, `signIn(password)`, `signOut()`       |
| `core/words/words-api.ts`           | `words` resource (words and sentences), entry, stage, recording writes |
| `core/dictionary/dictionary-api.ts` | `entries` resource, in acquisition order                               |
| `core/feedback/`                    | `ToastQueue.show(text)`, `Celebration.play()` (confetti)               |
| `core/words/word.utils.ts`          | Current stage and status, sorting, counting, search                    |
| `core/words/word.constants.ts`      | Statuses and French labels                                             |
| `core/text/text.utils.ts`           | Normalization and search ranking (twin of the backend)                 |
| `core/date/date.utils.ts`           | `todayIso()` (Paris) and date formatting                               |
| `core/http/api-error.utils.ts`      | `apiErrorCode(error)`, `retryAfterSeconds(error)`, `isNotFound(error)` |
| `core/recordings/`                  | Duration and size limits, MIME type choice, decoded waveforms          |

Test factories `aWord()` and `aPronunciation()` are in `core/words/word.fixtures.ts`.

## Shared components

| Component                                                 | Purpose                                              |
| --------------------------------------------------------- | ---------------------------------------------------- |
| `app-button`, `app-icon-button`                           | Pill button and header icon tile on a native element |
| `svg[app-icon]`                                           | Icon from the sprite `public/assets/icons/icons.svg` |
| `app-page-header`                                         | Back link, title, optional action                    |
| `app-action-bar`                                          | Fixed bottom bar for the main actions                |
| `app-mascot`, `app-mascot-bubble`                         | Lapinou, alone or with a speech bubble               |
| `app-bottom-sheet`, `app-confirm-sheet`                   | Modal drawer and yes/no question                     |
| `app-status-badge`, `app-status-dot`, `app-status-picker` | Display and choice of a pronunciation status         |
| `app-search-field`, `app-filter-chips`                    | Search pill and toggle chips                         |
| `app-text-field`, `app-date-field`                        | Labelled input, textarea, date picker                |
| `app-audio-button`                                        | Play/stop a recording                                |
| `app-level-bars`, `app-voice-note`                        | Waveform bars, and a stored sound as a voice note    |
| `app-pronunciation-form`                                  | Spoken form, status and day of a stage               |
| `app-word-picker`                                         | Search over the notebook and the dictionary          |
| `app-toast-outlet`, `app-celebration-burst`               | Mounted once in the app shell                        |

Global motion classes (`src/styles/motion.css`): `enter`, `enter-bottom`, `pop`, `motion-step-N`, `shake`, `press`.
