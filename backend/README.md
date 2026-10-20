# Little Words backend

Spring Boot 4 REST API on Java 25 and PostgreSQL. Conventions are in [CONTRIBUTING.md](../CONTRIBUTING.md); the API is documented by Swagger UI.

## Commands

```bash
cp .env.example .env                 # local settings, demo passphrase littlewords-demo-passphrase
./mvnw spring-boot:run               # API on :8080, Swagger UI at /swagger-ui.html if API_DOCS_ENABLED=true
./mvnw spotless:apply                # format
./mvnw clean verify                  # full gate: Spotless, Checkstyle, tests, SpotBugs, JaCoCo
./mvnw test -Dtest=WordApiTest
```

Requirements: Java 25, Docker for the database (`make db`, PostgreSQL 17 on localhost:5433) and the tests (PostgreSQL 17 Testcontainer, no H2).

A native PostgreSQL 16+ instead, once, then `DB_URL=jdbc:postgresql://localhost:5432/littlewords` in `.env`:

```bash
sudo -u postgres psql -c "CREATE ROLE littlewords LOGIN PASSWORD 'littlewords';" -c "CREATE DATABASE littlewords OWNER littlewords;"
```

Monitoring: `/readyz` and `/livez` on :8080, the actuator on :8081 (`/actuator/health`, `/info`, `/prometheus`). Details: [Monitoring](#monitoring).

## Family password

The backend refuses to start without `FAMILY_PASSWORD_HASH`, the Argon2id hash of the passphrase (16 characters or more). `make hash` asks for it without echo and prints the hash, through the `argon2` CLI or, without it, a pinned Alpine container. By hand, without leaving the passphrase in the shell history:

```bash
read -rs PASSPHRASE && printf '%s' "$PASSPHRASE" | argon2 "$(openssl rand -base64 18)" -id -t 3 -m 15 -p 1 -e; unset PASSPHRASE
```

The hash in `.env.example` is a demo one (passphrase `littlewords-demo-passphrase`), for local runs only.

`-m 15` (32 MiB) is the maximum the backend accepts. The hash contains `$` signs:

- `backend/.env` (dev): unquoted, `FAMILY_PASSWORD_HASH=$argon2id$v=19$...`
- A Docker Compose `.env` (prod): single quotes, `FAMILY_PASSWORD_HASH='$argon2id$v=19$...'`, so Compose leaves the `$` alone

Changing the hash signs every family member out.

**Read-only password**: `READER_PASSWORD_HASH`, produced the same way from another passphrase, opens a session that reads everything (words, stages, sounds) and changes nothing: every write answers `403 FORBIDDEN` and the app hides its controls. Empty turns it off. Changing it signs out readers only; changing the family hash signs out family members only. With both set, a wrong password costs two Argon2 checks.

**Lockout**: five wrong passwords lock the address for 1 minute, doubling up to 15 minutes (`LOGIN_MAX_FAILURES`, `LOGIN_INITIAL_LOCKOUT`, `LOGIN_MAX_LOCKOUT`). `LOGIN_LOCKOUT_ENABLED=false` disables it in dev only, never in production.

## Packages

Root package `io.github.thomashtn.littlewords`. A feature package only uses `shared` and the packages above it.

| Package | Role |
|---|---|
| `shared` | Config, error handling (`GlobalExceptionHandler`), security chain, text and date helpers |
| `auth` | Login with the family or reader password, logout, session check, lockout |
| `dictionary` | Read-only dictionaries (French IFDC, English CDI), cached in memory |
| `word` | Words and sentences (entries of kind `sentence`) with their pronunciation stages |
| `recording` | Word sounds, stored as `bytea` |
| `export` | The whole notebook as one zip (`GET /api/export`): `notebook.json` and every sound under `sounds/`, streamed one sound at a time; readers may download it |

Each feature package splits into `controller`, `dto`, `entity`, `repository`, `service` (only those it needs).

## Design notes

- Sessions are stored in PostgreSQL (Spring Session JDBC): a restart signs nobody out. Cookie `__Host-`, `HttpOnly`, `SameSite=Strict`, 30-day idle timeout.
- CSRF: `XSRF-TOKEN` cookie echoed in `X-XSRF-TOKEN`, set by `GET /api/auth/session`.
- `GET /api/words` runs three queries (words, stages, sound metadata), never the audio bytes.
- Dates are checked against today in `APP_TIME_ZONE` (`Europe/Paris` by default), whatever the server zone; `GET /api/branding` gives that zone to the app, so both judge "today" alike.
- Audio uploads: 2 MB, 30 s, `audio/webm`, `audio/mp4` or `audio/wav`.
- `FORWARD_HEADERS_STRATEGY=native` (the default) is mandatory behind a proxy: `none` makes the lockout see only the proxy address, `framework` lets a client pick its address with a `Forwarded` header.

## Deployment

The repository ships two images and this contract, not a deployment: each server writes its own compose (or chart, or PaaS settings), and owns its domain, secrets, proxy rules and backups. `compose.yaml` at the root, started by every delivery, is a working local example.

**Images**: `ghcr.io/thomashtn/littlewords-backend` and `-frontend`, amd64 and arm64, with an SBOM and provenance, published by `.github/workflows/deliver.yml` once the tests, the image scan and the browser tests pass. Tags: `sha-<commit>` and `main`, plus `x.y.z` and `x.y` for a release. Deploy a release or a `sha-<commit>`: a failed commit has no image.

- Backend: API on 8080, actuator on 8081, user 10001, heap at 60 % of the memory limit (512 MB is plenty), exits on OutOfMemoryError so the restart policy replaces it.
- Frontend: nginx on 8080, non-root. The single entry point: it serves the app and relays `/api/*` and `/readyz` to `BACKEND_URL` (`http://backend:8080` by default), refuses bodies above 2 MB, and answers a JSON `503` while the backend is down.
- Both declare a Docker `HEALTHCHECK` and run with a read-only root filesystem plus a `/tmp` tmpfs.

**Routing**: one HTTPS origin, one rule: the domain to the frontend's port 8080. The backend and the database stay on the stack's private network; never route port 8081 (actuator). Whatever terminates HTTPS sets HSTS; nginx sets every other security header, including `Permissions-Policy: microphone=(self)` for the recording screen, so a shared header set with `microphone=()` must not override it.

**Database**: PostgreSQL 16+, a dedicated role and database (`CREATE ROLE littlewords LOGIN PASSWORD '...'; CREATE DATABASE littlewords OWNER littlewords;`). Flyway creates the tables at first start, and migrates them on each update: rolling an image back after a migration needs the dump taken before it.

**Variables** (backend):

| Variable | Production value |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | JDBC URL and credentials of that database |
| `FAMILY_PASSWORD_HASH` | Required, see [Family password](#family-password) |
| `READER_PASSWORD_HASH` | Optional, empty turns the read-only sign-in off |
| `CHILD_NAME` | Required, shown after login only |
| `CHILD_BIRTHDATE` | Optional birth date (`yyyy-MM-dd`), shown after login only: cards tell the child's age instead of the day |
| `APP_NAME`, `APP_NAME_ACCENT` | Name of the app (`Little Words` by default) and its end drawn in the accent colour (none by default); public, on the login screen, in the tab titles and under the home-screen icon |
| `APP_TIME_ZONE` | IANA zone of the family (`Europe/Paris` by default), in which "today" is judged; public, served by `GET /api/branding` |
| `LOGGING_STRUCTURED_FORMAT_CONSOLE` | Optional: `ecs`, `logstash` or `gelf` for JSON logs to a collector |
| `API_DOCS_ENABLED` | `false` (the default) |
| `FORWARD_HEADERS_STRATEGY` | `native` (the default); never `framework` behind a proxy |
| `LOGIN_LOCKOUT_ENABLED` | `true` (the default) |

The frontend only reads `BACKEND_URL`, set when the backend answers under another name than `backend` (for instance when the frontend also sits on a network shared with other apps, where `backend` may resolve to theirs).

Secrets live in the server's environment (a `.env` of mode 600), never in the repository. After the first start, open the site and check that a wrong passphrase is refused.

**Several families on one machine**: one stack each, with its own database, settings, domain and backups. Nothing in the images is named after the machine, so stacks only differ by what the server gives them: project name, volume, domain.

**Backups**: the database is the only copy of the recordings. Dump it nightly, copy the dumps off the machine, and try a restore now and then:

```bash
docker compose exec -T postgres pg_dump -U littlewords -d littlewords --format=custom > littlewords-$(date +%F).dump
docker compose stop backend
docker compose exec -T postgres pg_restore -U littlewords -d littlewords --clean --if-exists --no-owner < littlewords-<date>.dump
docker compose start backend
```

## Monitoring

The backend answers its probes on the main port and keeps the actuator on its own port, which the proxy never routes. `littlewords-backend` below stands for whatever name or alias your stack gives the backend.

| Target | Use |
|---|---|
| `https://<your-domain>/readyz` | `200` when the API and its database answer; the public uptime probe, relayed by nginx |
| `http://littlewords-backend:8080/livez` | `200` while the JVM serves requests, even without the database |
| `http://littlewords-backend:8081/actuator/health` | Same status from the management port |
| `http://littlewords-backend:8081/actuator/info` | Version and build time of the running image |
| `http://littlewords-backend:8081/actuator/prometheus` | Metrics (JVM, HTTP, Hikari pool), tagged `application="littlewords"` |
| `https://<your-domain>/healthz` | Proxy, TLS and nginx, without the backend |

Both images carry a Docker `HEALTHCHECK` (backend on `/readyz`, frontend on `/healthz`), shown by `docker ps`.

On the server:

- Uptime monitor: HTTP checks on the public `/readyz` and `/healthz`, plus the management health from a container on the backend's network.
- Prometheus: from a container on the backend's network, add the job below.

```yaml
scrape_configs:
  - job_name: littlewords
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["littlewords-backend:8081"]
```

## Pitfall

Never use spring-security-test's `csrf()`: it breaks the token repository for the rest of the suite. Use `xsrf()` from `PostgreSqlIntegrationTest`.
