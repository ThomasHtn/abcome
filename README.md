<p align="center">
  <img src="frontend/public/assets/mascot/idle.svg" alt="Lapinou, the Little Words mascot" width="120">
</p>

<h1 align="center">Little Words</h1>

<p align="center">
  <b>The first-words baby book. The one you actually fill in.</b><br>
  Log a new word in ten seconds, follow it from "bit" to "rabbit", and keep the sound of that tiny voice for good.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/self--hosted-yours-F7957C" alt="Self-hosted">
  <img src="https://img.shields.io/badge/tracking-none-9488DF" alt="No tracking">
  <img src="https://img.shields.io/badge/app_store-not_needed-F7957C" alt="No app store">
  <img src="https://img.shields.io/badge/confetti-included-9488DF" alt="Confetti included">
</p>

<p align="center">
  <a href="docs/media/littlewords-tour-en.mp4">
    <img src="docs/media/poster.png" alt="Watch the Little Words tour" width="760">
  </a>
  <br>
  <a href="docs/media/littlewords-tour-en.mp4"><b>&#9654; Watch the 46-second tour</b></a><br>
  <sub>No sound, no ads, one bunny.</sub>
</p>

<br>

## Toddlers speak their own language

"Bit" means rabbit. "Wawa" means water. "Tate" means cake, and also *I want cake right now*.
Three months later the same child says "rabbit" perfectly, and nobody remembers the "bit" anymore.

**Little Words is the family notebook that remembers for you.**

<br>

<p align="center">
  <img src="docs/media/screen-notebook.png" alt="The notebook" width="160">
  <img src="docs/media/screen-progress.png" alt="A word's progress" width="160">
  <img src="docs/media/screen-pronunciation.png" alt="A new pronunciation" width="160">
  <img src="docs/media/screen-recorder.png" alt="The recorder" width="160">
</p>

- **The notebook**: every word, the day it showed up, how it sounds today.
- **The journey**: from "bit" to "babbit" to "rabbit", each step with its sound.
- **The big day**: they finally nailed it. Two taps, and cue the confetti.
- **The voice**: one tap, thirty seconds, kept forever.

<br>

## What's inside

<p>
  <img src="docs/media/icons/users.svg" alt="" width="40"><br>
  <b>One notebook, the whole family</b><br>
  Parents, grandparents, the nanny: everyone adds words from their own phone. One shared passphrase, zero accounts, zero "forgot your password" emails.
</p>

<p>
  <img src="docs/media/icons/footprints.svg" alt="" width="40"><br>
  <b>Every step counts</b><br>
  Each word keeps its whole history, marked <i>On the way</i>, <i>Almost</i> or <i>Nailed it</i>. Watching the dots turn green is weirdly addictive.
</p>

<p>
  <img src="docs/media/icons/mic.svg" alt="" width="40"><br>
  <b>That little voice</b><br>
  Record up to 30 seconds next to each word. Prime material for an 18th birthday speech.
</p>

<p>
  <img src="docs/media/icons/party-popper.svg" alt="" width="40"><br>
  <b>Confetti</b><br>
  A word reaches <i>Nailed it</i>? Confetti. This is not up for debate.
</p>

<p>
  <img src="docs/media/icons/eye.svg" alt="" width="40"><br>
  <b>Look, don't touch</b><br>
  An optional read-only passphrase for relatives who want to follow along without "fixing" anything.
</p>

<p>
  <img src="docs/media/icons/lock.svg" alt="" width="40"><br>
  <b>Yours, really</b><br>
  Self-hosted, no store, no ads, no tracking. Add it to the home screen and it feels like an app.
</p>

<br>

## Get it

You bring the toddler, Little Words brings the rest. It ships as two Docker images (API and web, amd64) and needs a PostgreSQL database; the web image is the single entry point and relays the API itself.

- **Try it**: `docker compose up --build` (or `make up`) runs the whole app on http://localhost:8000, nothing to configure; the passphrase is `littlewords-demo-passphrase`.
- **Host it**: your server writes its own compose (or chart, or PaaS settings) from the contract in [docs/deployment.md](docs/deployment.md): one route, a few variables, one database per family. Several families on one machine are several stacks side by side.
- **Hack on it**: `make setup && make dev` ([CONTRIBUTING.md](CONTRIBUTING.md#up-and-running)).

<br>

## Technical

Everything is called `littlewords`: repository, Java package, Docker images, containers, database.

- **Frontend**: Angular 22 (standalone, zoneless, signals), Tailwind 4 for layout, SCSS for visuals, Transloco for French and English, served by nginx.
- **Backend**: Spring Boot 4 on Java 25, with Spring Security, Data JPA, Flyway and springdoc.
- **Database**: PostgreSQL 17, the recordings in their own table.
- **Auth**: one family passphrase (Argon2id), an optional read-only one, a session cookie, CSRF and a login lockout.
- **Deployment**: two images. Your proxy sends the domain to the frontend, which relays the API to the backend.
- **Quality**: Spotless, Checkstyle, SpotBugs, JaCoCo, ArchUnit and Testcontainers; ESLint, Stylelint, Prettier and vitest; Playwright against the images.
- **Supply chain**: images and actions pinned by digest, Dependabot, CodeQL, a Grype scan, an SBOM and provenance on every image.

The interface speaks French or English, following the browser (French when it offers neither); so do the word suggestions (French IFDC or American English CDI). The app name and the family's time zone are set per deployment (`APP_NAME`, `APP_TIME_ZONE`), so each family runs its own notebook.

- [CONTRIBUTING.md](CONTRIBUTING.md): setup, code map, conventions. Start here.
- [backend/README.md](backend/README.md): daily commands, family password, packages.
- [docs/deployment.md](docs/deployment.md): images, routing, variables, backups, monitoring.
- [frontend/README.md](frontend/README.md): daily commands, folders, translations, styles.
- [tools/dictionary/README.md](tools/dictionary/README.md): where the word lists come from (IFDC and CDI via Wordbank, CC BY 4.0).
- API reference: Swagger UI at `/swagger-ui.html` when `API_DOCS_ENABLED=true` (dev only).
