# Little Words frontend

Angular 22 web app, installable as a home-screen shortcut (manifest, no service worker): standalone, zoneless, signals, Tailwind 4 for layout and SCSS for visuals. Conventions are in [CONTRIBUTING.md](../CONTRIBUTING.md).

## Commands

```bash
npx npm@11 install                   # npm 10.9 crashes on jsdom
npm start                            # :4200, proxies /api to :8080
npm test -- --watch=false            # vitest
npm run lint                         # ESLint then Stylelint
npm run format:check                 # Prettier
npm run fix                          # every auto-fix
npm run build                        # production bundle in dist/
npm run e2e                          # Playwright against http://localhost:8000 (`make up` first)
```

Browser tests (`e2e/`, `*.e2e.ts`) drive the real app, French locale, mobile viewport, reduced motion and a fake microphone. A setup project signs in once (the backend checks two passwords at once) and every test writes its own word. `E2E_BASE_URL` and `E2E_PASSPHRASE` point them at another stack; the delivery runs them against `compose.yaml`.

Production image: nginx serves the bundle, relays `/api/*` and `/readyz` to `BACKEND_URL` (`http://backend:8080` by default) and answers `/healthz` for the Docker `HEALTHCHECK` and uptime probes. Its config is `nginx.conf.template`, filled in at startup. Deployment and monitoring: [backend/README.md](../backend/README.md#deployment).

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
| `public/icons/`               | App icons (PNG) for the manifest and the home screen                     |

Imports go `core` <- `shared` <- `pages`, a page never imports another page (ESLint enforces it). Aliases: `@core/*`, `@shared/*`, `@pages/*`.

## Styles

- Tailwind in the template for layout only, about five utilities per element, no arbitrary values.
- Everything visual in the component's `.scss`, which starts with `@use 'tools' as *;` and uses tokens only (no hex or `rgb()`).
- Never set the same property from a utility and from the `.scss`.
- BEM class names written in full (`.word-card__date`, never `&__`), none that Tailwind owns.
- Animations inside `@include motion { ... }` (reduced motion).

## Translations

[Transloco](https://jsverse.gitbook.io/transloco): texts live in `src/i18n/fr.json` and `src/i18n/en.json`, the code only holds keys. `provideI18n()` (`core/i18n/`) picks the first browser language the app speaks (French otherwise) and loads its file before the first screen. No switch at runtime; a reload picks the language again.

- Keys are grouped by screen or feature (`login.tagline`, `home.wordCard.ariaLabel`), parameters are named (`{{ childName }}`).
- Templates: `{{ 'login.tagline' | transloco }}`, `[attr.aria-label]="'key' | transloco"`, `{{ 'key' | transloco: { childName: childName() } }}`.
- TS: `translate('key', { name: value })` at use time, never in a module-level constant (translations load after the imports); constants hold keys.
- Plurals go through `isSingular(count)` and two keys. A sentence wrapping a styled `<span>` is split into `...Before` and `...After` keys around it.
- A text change edits both files. A spec checks they have the same keys and parameters.
- Specs run in French (`src/test-providers.ts`); a key missing from `fr.json` fails the spec.

## Routes

Lazy-loaded from `app.routes.ts`. URL parameters bind to page inputs (`withComponentInputBinding`).

| Path              | Page               | URL inputs                                                            | Guard        |
| ----------------- | ------------------ | --------------------------------------------------------------------- | ------------ |
| `/login`          | `LoginPage`        | `returnUrl`                                                           | `guestGuard` |
| `/`               | `HomePage`         | `tab` (`sentences`), `q`, `filter` (`mastered`, `almost`, `learning`) | `authGuard`  |
| `/words/new`      | `WordNewPage`      | `word` (prefills the search)                                          | `authGuard`  |
| `/words/:id`      | `WordDetailPage`   | `id`, `kind` (route data)                                             | `authGuard`  |
| `/sentences/:id`  | `WordDetailPage`   | `id`, `kind` (route data)                                             | `authGuard`  |
| `/recordings/new` | `RecordingNewPage` | `word` (word id to preselect)                                         | `authGuard`  |

A 401 signs out and redirects to `/login`.

## Core

Lists are loaded whole, shared by every screen and patched locally after each write. Read a resource through `resourceValue(resource, fallback)`: `value()` throws on error.

| File                                | Gives                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `core/auth/auth-session.ts`         | `signedIn()`, `ensureChecked()`, `signIn(password)`, `signOut()`                                                           |
| `core/words/words-api.ts`           | `words` resource, entry, stage, sound writes; `removeLater()` deletes after the undo toast                                 |
| `core/milestones/`                  | `milestonesOf(words)` (10, 50, 100 words then every 50, first "Bien dit", first sentence), `MilestoneWatch` for the drawer |
| `core/outbox/`                      | `SoundOutbox`: sounds kept in IndexedDB when offline, sent on their own                                                    |
| `core/startup/`                     | `hideSplash()`: fades the start-up screen of `index.html` out                                                              |
| `core/dictionary/dictionary-api.ts` | `entries` resource, in acquisition order                                                                                   |
| `core/feedback/`                    | `ToastQueue.show(text, tone, action?)`, `Celebration.play()` (confetti)                                                    |
| `core/words/word.utils.ts`          | Current stage and status, sorting, counting, search                                                                        |
| `core/words/seen-words.ts`          | Seen marks, tag kept until opened: `changeOf(word)`, `markSeen(word)`                                                      |
| `core/words/word.constants.ts`      | Statuses and their labels                                                                                                  |
| `core/text/text.utils.ts`           | Normalization and search ranking (twin of the backend)                                                                     |
| `core/date/date.utils.ts`           | `todayIso()` in the family's zone, `setFamilyTimeZone()`, formatting                                                       |
| `core/http/api-error.utils.ts`      | `apiErrorCode(error)`, `retryAfterSeconds(error)`, `isNotFound(error)`                                                     |
| `core/http/resource.utils.ts`       | `resourceValue(resource, fallback)`, `keepValueOnError(resource)`                                                          |
| `core/http/stale-build.utils.ts`    | Reloads a screen whose lazy bundle went away with a deployment                                                             |
| `core/recordings/`                  | Duration and size limits, MIME type choice, decoded waveforms                                                              |
| `core/branding/`                    | `provideBranding()` loads name and zone before the first screen                                                            |
| `core/i18n/`                        | `provideI18n()`, `activeLocale()`, `isSingular(count)` for plurals                                                         |

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
| `app-milestone-sheet`, `app-milestone-badge`              | Milestone drawer (app shell, deferred) and its badge |

Global motion classes (`src/styles/motion.css`): `enter`, `enter-bottom`, `pop`, `motion-step-N`, `shake`, `press`.
