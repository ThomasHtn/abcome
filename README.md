# ABCome

Mobile-first PWA where family members log a toddler's first words and sentences, track how each pronunciation evolves and keep short audio recordings.

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md): setup, code map, conventions. Start here.
- [docs/spec.md](docs/spec.md): behaviour, security rules, data model, API, design tokens.
- [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md): commands and structure.

## Stack

- Frontend: Angular 22 PWA, Tailwind 4 + SCSS, served by nginx.
- Backend: Spring Boot 4 on Java 25.
- Database: PostgreSQL 17, recordings stored as `bytea`.
- Auth: one shared family passphrase (Argon2id hash), session cookie, CSRF.

## Deployment

`docker-compose.prod.yml` runs the `backend` and `frontend` images behind the VPS Traefik: `/api/*` goes to the backend, the rest to the frontend. The backend reaches PostgreSQL through the external `database` network.

First deployment:

1. Create the role and database: `CREATE ROLE abcome LOGIN PASSWORD '...'; CREATE DATABASE abcome OWNER abcome;`. Flyway creates the tables at first start.
2. Produce the passphrase hash ([backend/README.md](backend/README.md#family-password)).
3. `cp .env.example .env` and fill it (hash in single quotes).
4. `docker compose -f docker-compose.prod.yml up -d --build`.
5. Open `https://abcome.thomashtn.dev` and check that a wrong passphrase is refused.

Back up the `abcome` database: it holds the recordings.
