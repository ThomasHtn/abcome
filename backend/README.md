# ABCome backend

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
sudo -u postgres psql -c "CREATE ROLE abcome LOGIN PASSWORD 'abcome';" -c "CREATE DATABASE abcome OWNER abcome;"
```

Health check: `GET /actuator/health`.

## Family password

The backend refuses to start without `FAMILY_PASSWORD_HASH`, the Argon2id hash of the passphrase (16 characters or more). Produce it without leaving the passphrase in the shell history:

```bash
read -rs PASSPHRASE && printf '%s' "$PASSPHRASE" | argon2 "$(openssl rand -base64 18)" -id -t 3 -m 15 -p 1 -e; unset PASSPHRASE
```

`-m 15` (32 MiB) is the maximum the backend accepts. The hash contains `$` signs:

- `backend/.env` (dev): unquoted, `FAMILY_PASSWORD_HASH=$argon2id$v=19$...`
- `.env` at the root (prod, Docker Compose): single quotes, `FAMILY_PASSWORD_HASH='$argon2id$v=19$...'`

Changing the hash signs every family member out.

**Lockout**: five wrong passwords lock the address for 1 minute, doubling up to 15 minutes (`LOGIN_MAX_FAILURES`, `LOGIN_INITIAL_LOCKOUT`, `LOGIN_MAX_LOCKOUT`). `LOGIN_LOCKOUT_ENABLED=false` disables it in dev only, never in production.

## Packages

Root package `io.github.thomashtn.abcome`. A feature package only uses `shared` and the packages above it.

| Package | Role |
|---|---|
| `shared` | Config, error handling (`GlobalExceptionHandler`), security chain, text and date helpers |
| `auth` | Login, logout, session check, lockout |
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
- `FORWARD_HEADERS_STRATEGY=framework` is mandatory behind Traefik, otherwise the lockout sees only the proxy address.

## Pitfall

Never use spring-security-test's `csrf()`: it breaks the token repository for the rest of the suite. Use `xsrf()` from `PostgreSqlIntegrationTest`.
