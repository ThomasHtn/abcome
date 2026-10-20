# Contributing

Welcome aboard. Little Words is a small app with big feelings: a toddler's first words deserve code that never loses them.
This page is the house rules. The linters know them by heart, so they will remind you anyway.

## Up and running

You need Java 25, Node 22 and Docker. Then, the first time:

```bash
make setup
```

And every day:

```bash
make dev
```

That starts PostgreSQL in Docker, the API on http://localhost:8080 and the app on http://localhost:4200.
Sign in with **littlewords-demo-passphrase**. Ctrl+C stops the API and the app, the database keeps your words.

Type `make` alone to see every shortcut. Each one wraps a plain command, so make is a convenience, never a requirement.

## Try the real thing

The whole app from its Docker images, exactly as a server runs it, on http://localhost:8000:

```bash
make up
make e2e
```

Done playing:

```bash
make down
```

## The daily loop

1. Write a test that fails.
2. Make it pass.
3. Tidy up, then run every check the CI runs:

```bash
make fix
make verify
```

Green here means green on GitHub. Coverage floors only ever go up: 85 % on the frontend, 90 % of lines on the backend.

## What lives where

```text
backend/            the API (Spring Boot)
frontend/           the app (Angular), served by nginx, which relays /api to the backend
docs/deployment.md  what a server needs to run the images
tools/dictionary/   the word suggestions and the scripts that build them
compose.yaml        the whole app on your machine, also started by every delivery
```

The backend and frontend READMEs hold the day-to-day commands of each side.

## House rules

- The interface speaks French, then English. Everything else is English: code, comments, tests, logs, docs.
- Small functions, names that explain themselves, no dead code, no magic numbers.
- Something moves to shared only when a second place needs it.
- Images, icons and animations are files in frontend/public/assets, never drawn in a template.
- Never log a password, a session id or a sign-in request. Lapinou keeps secrets.

## Comments

Every declaration gets a one-sentence comment that says why, private ones included:

```ts
/**
 * Counted on the latest stage only, so a word said badly once then well counts as mastered.
 */
```

The format follows the file:

```text
.java .ts .js .mjs                /** ... */ above every declaration
.html                             <!-- ... --> above each meaningful block
.scss .css                        /* ... */ file header, one line above each rule
.svg                              <!-- ... --> header and groups, /* ... */ inside <style>
.sql                              -- ... above each statement
.properties .env.example .yml     # === section headers, # ... above keys that need it
```

Backend test methods are named by their @DisplayName instead. Checkstyle and ESLint fail on a missing comment, no hard feelings.

## Backend rules

- One package per feature, split into controller, dto, entity, repository and service. Shared code goes in shared.
- Packages only use the ones below them (see the backend README), and inside a feature only services touch repositories. ArchitectureTest checks both.
- A service is an interface plus its Default implementation, documented on the interface.
- REST: plural nouns, 201 with a Location on creation, 204 on deletion.
- DTOs are records with @Schema. Controllers carry @Tag, @Operation and @ApiResponse.
- Errors are thrown, and only GlobalExceptionHandler renders them. Error codes are a promise to the frontend.
- Constructor injection and typed settings in ApplicationProperties, never @Value.
- Flyway owns the schema. Never edit an applied migration: add the next V<n>__<subject>.sql.
- Recordings live in their own table and are never loaded with the words.
- A SpotBugs false positive shared by the whole codebase goes in config/spotbugs/exclude.xml with its reason. A one-off gets a justified @SuppressFBWarnings.

## Frontend rules

- Standalone OnPush components, signals, zoneless. Services use @Service() and inject(), never constructor injection.
- Imports go core, then shared, then pages, never upwards, and a page never imports another page. Other folders are reached through the @core, @shared and @pages aliases. ESLint checks it.
- Data comes through httpResource, URLs through API_ENDPOINTS.
- One suffix per role: x.ts, x.html, x.scss, x.spec.ts, x.model.ts, x.constants.ts, x.utils.ts, and x.fixtures.ts for tests.
- Tailwind for layout only. Everything visual in BEM classes in the .scss, with tokens.
- Every animation respects reduced motion. Some grown-ups get seasick.

## Recipes

**A new endpoint**: a DTO, the service interface and its implementation, a documented controller method, and an API test extending PostgreSqlIntegrationTest. On the frontend, its URL in API_ENDPOINTS and its type in a .model.ts.

**A new table**: a migration, an entity, a repository, an integration test.

**A new screen**: a folder in pages with its files and spec, and a lazy route in app.routes.ts.

**A new picture**: an optimised file in frontend/public/assets, with a still version if it moves.

## Shipping a release

Set the version on both sides:

```bash
make version VERSION=1.2.0
```

Commit, then tag:

```bash
git tag v1.2.0 && git push origin v1.2.0
```

The delivery checks that the tag matches both versions, publishes the images 1.2.0 and 1.2, and writes the GitHub release from the commits. Commit messages follow Conventional Commits (fix(build): ...), so the notes sort themselves.

## What the CI does

- **A pull request** runs the checks of the side it touches.
- **A push to main** runs both, builds both images, starts them, scans them, drives them with Playwright, and only then pushes them to GHCR. A failed commit has no image, so it can never be deployed.
- **CodeQL** reads the Java, TypeScript and workflows on every push and once a week.

## Banana peels

**npm install crashes**: npm 10.9 trips on jsdom. Use npm 11:

```bash
npx npm@11 install
```

**Playwright cannot find its browser**: install it once, from the frontend folder:

```bash
npx playwright install chromium
```

**One test class with -Dtest skips the @Nested ones**: run the whole suite.

**Strange compilation errors**: the IDE left broken classes in backend/target. Build with clean.

**The image scan fails a delivery**: it names the package. Bump the base image or the Spring Boot managed version in pom.xml, never silence the scan.
