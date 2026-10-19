# Little Words backend

Spring Boot 4 REST API on Java 25 and PostgreSQL. Conventions are in [CONTRIBUTING.md](../CONTRIBUTING.md); the API is documented by Swagger UI.

## Commands

```bash
cp .env.example .env                 # local settings; set FAMILY_PASSWORD_HASH and CHILD_NAME
./mvnw spring-boot:run               # API on :8080, Swagger UI at /swagger-ui.html if API_DOCS_ENABLED=true
./mvnw spotless:apply                # format
./mvnw clean verify                  # full gate: Spotless, Checkstyle, tests, SpotBugs, JaCoCo
./mvnw test -Dtest=WordApiTest
```

Requirements: Java 25, PostgreSQL 16+ to run, Docker for the tests (PostgreSQL 17 Testcontainer, no H2).

Local database, once:

```bash
sudo -u postgres psql -c "CREATE ROLE littlewords LOGIN PASSWORD 'littlewords';" -c "CREATE DATABASE littlewords OWNER littlewords;"
```

Monitoring: `GET /actuator/health` (readiness includes the database), `/actuator/info` (build), `/actuator/prometheus`. Production targets: [Monitoring](#monitoring).

## Family password

The backend refuses to start without `FAMILY_PASSWORD_HASH`, the Argon2id hash of the passphrase (16 characters or more). Produce it without leaving the passphrase in the shell history:

```bash
read -rs PASSPHRASE && printf '%s' "$PASSPHRASE" | argon2 "$(openssl rand -base64 18)" -id -t 3 -m 15 -p 1 -e; unset PASSPHRASE
```

`-m 15` (32 MiB) is the maximum the backend accepts. The hash contains `$` signs:

- `backend/.env` (dev): unquoted, `FAMILY_PASSWORD_HASH=$argon2id$v=19$...`
- `.env` at the root (prod, Docker Compose): single quotes, `FAMILY_PASSWORD_HASH='$argon2id$v=19$...'`

Changing the hash signs every family member out.

**Read-only password**: `READER_PASSWORD_HASH`, produced the same way from another passphrase, opens a session that reads everything (words, stages, sounds) and changes nothing: every write answers `403 FORBIDDEN` and the app hides its controls. Empty turns it off. Changing it signs out readers only; changing the family hash signs out family members only. With both set, a wrong password costs two Argon2 checks.

**Lockout**: five wrong passwords lock the address for 1 minute, doubling up to 15 minutes (`LOGIN_MAX_FAILURES`, `LOGIN_INITIAL_LOCKOUT`, `LOGIN_MAX_LOCKOUT`). `LOGIN_LOCKOUT_ENABLED=false` disables it in dev only, never in production.

## Packages

Root package `io.github.thomashtn.littlewords`. A feature package only uses `shared` and the packages above it.

| Package | Role |
|---|---|
| `shared` | Config, error handling (`GlobalExceptionHandler`), security chain, text and date helpers |
| `auth` | Login with the family or reader password, logout, session check, lockout |
| `dictionary` | Read-only IFDC dictionary, cached in memory |
| `word` | Words and sentences (entries of kind `sentence`) with their pronunciation stages |
| `recording` | Word sounds, stored as `bytea` |

Each feature package splits into `controller`, `dto`, `entity`, `repository`, `service`.

## Design notes

- Sessions are stored in PostgreSQL (Spring Session JDBC): a restart signs nobody out. Cookie `__Host-`, `HttpOnly`, `SameSite=Strict`, 30-day idle timeout.
- CSRF: `XSRF-TOKEN` cookie echoed in `X-XSRF-TOKEN`, set by `GET /api/auth/session`.
- `GET /api/words` runs three queries (words, stages, sound metadata), never the audio bytes.
- Dates are checked against today in `Europe/Paris`, whatever the server zone.
- Audio uploads: 2 MB, 15 s, `audio/webm`, `audio/mp4` or `audio/wav`.
- `FORWARD_HEADERS_STRATEGY=native` (the default) is mandatory behind a proxy: `none` makes the lockout see only the proxy address, `framework` lets a client pick its address with a `Forwarded` header.

## Deployment

`docker-compose.prod.yml` (repository root) runs the `backend` and `frontend` images behind an existing Traefik: `/api/*` goes to the backend, the rest to the frontend. The backend reaches PostgreSQL through the external `database` network.

First deployment:

1. Create the role and database: `CREATE ROLE littlewords LOGIN PASSWORD '...'; CREATE DATABASE littlewords OWNER littlewords;`. Flyway creates the tables at first start.
2. Produce the passphrase hash, and the reader one if relatives should look ([Family password](#family-password)).
3. At the root, `cp .env.example .env` and fill it (hash in single quotes, the child's first name in `CHILD_NAME`).
4. `docker compose -f docker-compose.prod.yml up -d --build`.
5. Open `https://<PUBLIC_HOST>` and check that a wrong passphrase is refused.

Back up the `littlewords` database: it holds the recordings.

## Monitoring

Traefik routes only `/api` to the backend, so the actuator is reachable from the Docker networks only, by container name.

| Target | Use |
|---|---|
| `http://littlewords-backend:8080/actuator/health/readiness` | `200` when the API and its database answer, `503` otherwise |
| `http://littlewords-backend:8080/actuator/health/liveness` | `200` while the JVM runs, even without the database |
| `http://littlewords-backend:8080/actuator/info` | Version and build time of the running image |
| `http://littlewords-backend:8080/actuator/prometheus` | Metrics (JVM, HTTP, Hikari pool), tagged `application="littlewords"` |
| `https://<PUBLIC_HOST>/healthz` | Public path: Traefik, TLS and nginx |

Both images carry a Docker `HEALTHCHECK` (backend on readiness, frontend on `/healthz`), shown by `docker ps` and by Uptime Kuma's "Docker Container" monitor. Container logs rotate at three files of 10 MB.

On the server:

- Uptime Kuma: an HTTP monitor on the public `/healthz`, and one on the readiness URL if Uptime Kuma shares the `traefik` network.
- Prometheus: join the `traefik` network and add the job below.

```yaml
scrape_configs:
  - job_name: littlewords
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["littlewords-backend:8080"]
```

## Pitfall

Never use spring-security-test's `csrf()`: it breaks the token repository for the rest of the suite. Use `xsrf()` from `PostgreSqlIntegrationTest`.
