# Little Words

Shown to the family as ABCome, at `https://abcome.thomashtn.dev`; Little Words is the technical name (repository, images, database, packages).

Mobile-first web app, installable as a home-screen shortcut, where family members log a toddler's first words and sentences, track how each pronunciation evolves and keep short audio recordings.

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md): setup, code map, conventions. Start here.
- [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md): commands, structure, design notes.
- API reference: Swagger UI at `/swagger-ui.html` when `API_DOCS_ENABLED=true` (dev only).

## Stack

- Frontend: Angular 22, Tailwind 4 + SCSS, served by nginx.
- Backend: Spring Boot 4 on Java 25.
- Database: PostgreSQL 17, recordings stored as `bytea`.
- Auth: one shared family passphrase (Argon2id hash), plus an optional read-only one for relatives; session cookie, CSRF.

## Deployment

`docker-compose.prod.yml` runs the `backend` and `frontend` images behind the VPS Traefik: `/api/*` goes to the backend, the rest to the frontend. The backend reaches PostgreSQL through the external `database` network.

First deployment:

1. Create the role and database: `CREATE ROLE littlewords LOGIN PASSWORD '...'; CREATE DATABASE littlewords OWNER littlewords;`. Flyway creates the tables at first start.
2. Produce the passphrase hash, and the reader one if relatives should look ([backend/README.md](backend/README.md#family-password)).
3. `cp .env.example .env` and fill it (hash in single quotes, the child's first name in `CHILD_NAME`).
4. `docker compose -f docker-compose.prod.yml up -d --build`.
5. Open `https://abcome.thomashtn.dev` and check that a wrong passphrase is refused.

Back up the `littlewords` database: it holds the recordings.

## Monitoring

Traefik routes only `/api` to the backend, so the actuator is reachable from the Docker networks only, by container name.

| Target | Use |
|---|---|
| `http://littlewords-backend:8080/actuator/health/readiness` | `200` when the API and its database answer, `503` otherwise |
| `http://littlewords-backend:8080/actuator/health/liveness` | `200` while the JVM runs, even without the database |
| `http://littlewords-backend:8080/actuator/info` | Version and build time of the running image |
| `http://littlewords-backend:8080/actuator/prometheus` | Metrics (JVM, HTTP, Hikari pool), tagged `application="littlewords"` |
| `https://abcome.thomashtn.dev/healthz` | Public path: Traefik, TLS and nginx |

Both images carry a Docker `HEALTHCHECK` (backend on readiness, frontend on `/healthz`), shown by `docker ps` and by Uptime Kuma's "Docker Container" monitor. Container logs rotate at three files of 10 MB.

On the VPS:

- Uptime Kuma: an HTTP monitor on the public `/healthz`, and one on the readiness URL if Uptime Kuma shares the `traefik` network.
- Prometheus: join the `traefik` network and add the job below.

```yaml
scrape_configs:
  - job_name: littlewords
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["littlewords-backend:8080"]
```
