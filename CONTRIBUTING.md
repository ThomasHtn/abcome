# Contributing

Where things live, which rules the code follows and which tools enforce them.

## Workflow

1. Write a failing test, then the code.
2. Run the fixers (`npm run fix`, `./mvnw spotless:apply`) before committing.

## Setup

```bash
make setup     # once: backend/.env from .env.example (demo passphrase littlewords-demo-passphrase), npm install
make dev       # PostgreSQL in Docker on :5433, API on :8080 (actuator :8081), app on :4200
```

`make` alone lists every target; each one wraps a command of this file, so nothing requires it. Without make:

```bash
cp backend/.env.example backend/.env
docker compose up --detach --wait postgres            # development database on localhost:5433
cd backend && ./mvnw spring-boot:run
cd frontend && npx npm@11 install && npm start
```

Requirements: Java 25, Node 22 (`engines` in `package.json`), Docker. A native PostgreSQL 16+ works too: point `DB_URL` at it in `backend/.env`.

Whole app from its images, as deployed (http://localhost:8000, `backend/.env` when present, the demo settings otherwise):

```bash
make up        # docker compose up --build --detach --wait; `make down` stops, `make reset` drops the database
make e2e       # browser tests against it (E2E_PASSPHRASE when backend/.env has another passphrase)
```

## Repository

| Path | Role |
|---|---|
| `backend/` | Spring Boot REST API |
| `frontend/` | Angular app served by nginx, which relays `/api` to the backend |
| `tools/dictionary/` | Word dictionaries (French, English) and their build scripts |
| `docs/media/` | Tour video, poster, screenshots and icons shown in the README |
| `compose.yaml` | Whole app from its images on localhost, started by every delivery, and the development database |
| `Makefile` | Shortcuts for the commands of this file |
| `.github/` | CI workflows and Dependabot (below) |

## General rules

- UI in French, translated into English (see [frontend/README.md](frontend/README.md#translations)); code, comments, tests, logs and docs in English.
- Small functions, explicit names, no dead or commented-out code, no magic values.
- Extract to `shared/` only when a second place needs it.
- Images, icons and animations are files in `frontend/public/assets/`, never drawn in a template.
- Never log a password, a session id or an `/api/auth` body. Session, CSRF and lockout settings are in [backend/README.md](backend/README.md).

## Comments

Every declaration, private included, carries a one-sentence comment saying why, written on several lines:

```ts
/**
 * Counted on the latest stage only, so a word said badly once then well counts as mastered.
 */
```

| File | Format |
|---|---|
| `.java`, `.ts`, `.js`, `.mjs` | `/** ... */` on every declaration |
| `.html` | `<!-- ... -->` above each meaningful block |
| `.scss`, `.css` | `/* ... */` file header, one line above each rule |
| `.svg` | `<!-- ... -->` header and above each group, `/* ... */` in `<style>` |
| `.sql` | `-- ...` above each statement |
| `.properties`, `.env.example`, `.yml` | `# ===` section headers, `# ...` above non-obvious keys |

Backend test methods use `@DisplayName` instead. Checkstyle and ESLint fail on a missing comment.

## Backend

- One package per feature, split into `controller`, `dto`, `entity`, `repository`, `service`; cross-cutting code in `shared/`.
- Services are an interface plus a `Default*` implementation, documented on the interface.
- REST: plural nouns, `201` with `Location` on creation, `204` on deletion.
- DTOs are `record`s with `@Schema`; controllers carry `@Tag`, `@Operation`, `@ApiResponse`.
- Errors are thrown and rendered by `GlobalExceptionHandler` only. Error `code` values are a contract with the frontend.
- Constructor injection, typed properties (`ApplicationProperties`), never `@Value`.
- Flyway owns the schema. Never edit an applied migration, add `V<n>__<subject>.sql`.
- Recordings live in their own `bytea` table, never loaded with words.

## Frontend

- Standalone `OnPush` components, signals, zoneless; `@Service()` and `inject()`, no constructor injection.
- Folders by feature; imports go `core` <- `shared` <- `pages`, a page never imports another page.
- Data through `httpResource`, URLs through `API_ENDPOINTS`.
- File suffixes: `x.ts`/`.html`/`.scss`/`.spec.ts`, `x.model.ts`, `x.constants.ts`, `x.utils.ts`, `x.fixtures.ts` (tests only).
- Tailwind for layout only; everything visual in BEM classes in the `.scss`, with tokens only.
- Every animation respects `prefers-reduced-motion`.

## Quality

| Command | Effect |
|---|---|
| `npm run fix` | ESLint, Stylelint, Prettier auto-fixes |
| `npm run lint` | ESLint and Stylelint |
| `npm run format:check` | Prettier check |
| `./mvnw spotless:apply` | Backend formatting |
| `./mvnw clean verify` | Spotless, Checkstyle, tests, SpotBugs, JaCoCo (90 % lines, 70 % branches) |
| `make verify` | Every gate above, both sides |
| `npm run e2e` | Playwright against a running stack (`E2E_BASE_URL`, default http://localhost:8000) |

Coverage floors only go up.

| Workflow | When | Does |
|---|---|---|
| `backend-ci.yml`, `frontend-ci.yml` | Pull request touching that side | The gates of that side |
| `deliver.yml` | Push to `main`, tag `v*.*.*`, pull request touching images or `compose.yaml` | Both gates, both images started from `compose.yaml`, Grype scan, Playwright, then push (amd64 and arm64, SBOM, provenance) and, for a tag, the GitHub release |
| `codeql.yml` | Push, pull request, weekly | Static analysis of Java, TypeScript and the workflows |

## Releases

1. `make version VERSION=1.2.0` sets the version in `pom.xml` and `package.json`.
2. Commit, then `git tag v1.2.0 && git push origin v1.2.0`.
3. `deliver.yml` checks the tag matches both versions, publishes images `1.2.0` and `1.2`, and the GitHub release with generated notes.

Commit messages follow Conventional Commits (`fix(build): ...`), which the release notes group.

## Recipes

- **Endpoint**: DTO, service interface and implementation, documented controller method, API test extending `PostgreSqlIntegrationTest`; on the frontend, the URL in `API_ENDPOINTS` and the type in `.model.ts`.
- **Table**: migration, entity, repository, integration test.
- **Screen**: `pages/<screen>/` folder with its files and spec, lazy route in `app.routes.ts`.
- **Asset**: optimized file in `frontend/public/assets/<subject>/`, with its own reduced-motion fallback if animated.

## Pitfalls

- The IDE may write broken classes into `backend/target/`: always `clean`.
- `-Dtest=` does not select `@Nested` classes: run the whole suite.
- npm 10.9 crashes on jsdom's optional `canvas`: use `npx npm@11 install`.
- Playwright needs its browser once: `npx playwright install chromium` in `frontend/`.
- An image scan failure in `deliver.yml` names the package: bump the base image or the Spring Boot managed version (`pom.xml` properties), never silence the scan.
