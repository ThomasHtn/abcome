# Contributing

Where things live, which rules the code follows and which tools enforce them. Behaviour and security rules are in [docs/spec.md](docs/spec.md).

## Workflow

1. Read the spec section for the task. A change of behaviour updates the spec first.
2. Write a failing test, then the code.
3. Run the fixers (`npm run fix`, `./mvnw spotless:apply`).

## Setup

```bash
sudo -u postgres psql -c "CREATE ROLE abcome LOGIN PASSWORD 'abcome';" -c "CREATE DATABASE abcome OWNER abcome;"   # once
cd backend && cp .env.example .env     # set DB_PASSWORD, FAMILY_PASSWORD_HASH and CHILD_NAME (backend/README.md)
./mvnw spring-boot:run                 # API on :8080
cd ../frontend && npx npm@11 install && npm start   # app on :4200
```

Requirements: Java 25, Node 22, PostgreSQL 16+. Docker only for the backend tests and the production images.

## Repository

| Path | Role |
|---|---|
| `backend/` | Spring Boot REST API |
| `frontend/` | Angular app served by nginx |
| `docs/` | Spec and word dictionary |
| `scripts/` | Versioned git hooks |
| `docker-compose.prod.yml` | Production stack behind Traefik |
| `.github/` | CI workflows and Dependabot |

## General rules

- UI in French; code, comments, tests, logs and docs in English.
- Small functions, explicit names, no dead or commented-out code, no magic values.
- Extract to `shared/` only when a second place needs it.
- Images, icons and animations are files in `frontend/public/assets/`, never drawn in a template.
- The [security rules](docs/spec.md#security-rules) are mandatory. Never log a password, a session id or an `/api/auth` body.

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

Coverage floors only go up. The pre-commit hook (linked by `npm install`) runs the fixers on staged files and blocks the commit on an error. CI runs one workflow per side.

## Recipes

- **Endpoint**: DTO, service interface and implementation, documented controller method, API test extending `PostgreSqlIntegrationTest`; on the frontend, the URL in `API_ENDPOINTS` and the type in `.model.ts`.
- **Table**: migration, entity, repository, integration test.
- **Screen**: `pages/<screen>/` folder with its files and spec, lazy route in `app.routes.ts`.
- **Asset**: optimized file in `frontend/public/assets/<subject>/`, with its own reduced-motion fallback if animated.

## Pitfalls

- The IDE may write broken classes into `backend/target/`: always `clean`.
- `-Dtest=` does not select `@Nested` classes: run the whole suite.
- npm 10.9 crashes on jsdom's optional `canvas`: use `npx npm@11 install`.
