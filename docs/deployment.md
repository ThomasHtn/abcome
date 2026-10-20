# Deploying Little Words

Little Words moves in with two Docker images and a short list of demands. Your server brings the rest: a domain, HTTPS, the secrets and the backups.
This repository ships no deployment on purpose. Each server writes its own compose (or chart, or PaaS settings) from this page. The root compose.yaml is a working example for your machine.

## The images

```bash
docker pull ghcr.io/thomashtn/littlewords-backend:sha-<commit>
docker pull ghcr.io/thomashtn/littlewords-frontend:sha-<commit>
```

Every push to main that passes the tests, the image scan and the browser tests publishes **sha-&lt;commit&gt;** and moves **main**. A release adds **x.y.z** and **x.y**. Deploy a sha or a release: a commit that failed its checks has no image, so it cannot sneak into production.

Both images run as a regular user, carry their own healthcheck and are happy with a read-only root filesystem plus a tmpfs on /tmp. The backend wants about 512 MB: its heap takes 60 % of the limit, and it quits cleanly on an OutOfMemoryError so your restart policy brings a fresh one.

## The floor plan

```text
browser --HTTPS--> your proxy --> frontend :8080 --/api--> backend :8080 --> postgres
                                                           backend :8081  actuator, never routed
```

One rule on your proxy: the domain goes to the frontend on port 8080. nginx serves the app, relays the API, refuses uploads above 2 MB and shows a friendly outage band when the backend naps.

- The backend and the database stay on the stack's private network.
- Your proxy sets HSTS. nginx sets every other security header, including the microphone permission the recorder needs, so a shared header set that blocks the microphone must not override it.

## A database of its own

PostgreSQL 16 or newer, with a dedicated role and database:

```sql
CREATE ROLE littlewords LOGIN PASSWORD 'change-me';
CREATE DATABASE littlewords OWNER littlewords;
```

Flyway creates the tables on the first start and migrates them on every update. Rolling an image back after a migration needs the dump taken before it.

## Settings

The backend reads its environment. A Compose .env to start from, kept at mode 600 and never committed:

```properties
# Database
DB_URL=jdbc:postgresql://postgres:5432/littlewords
DB_USERNAME=littlewords
DB_PASSWORD=change-me

# Family passphrase hash, single-quoted so Compose keeps its $ signs (backend README, "Family password")
FAMILY_PASSWORD_HASH='$argon2id$v=19$...'

# Optional read-only passphrase for relatives who only look; empty turns it off
READER_PASSWORD_HASH=

# The star of the show, shown after sign-in only; the birth date is optional and turns dates into ages
CHILD_NAME=Alix
CHILD_BIRTHDATE=2025-05-12

# Public: login screen, tab titles, home-screen icon, and the zone where "today" is judged
APP_NAME=Little Words
APP_NAME_ACCENT=Words
APP_TIME_ZONE=Europe/Paris
```

These already have the right default. Leave them alone unless you know why:

```properties
API_DOCS_ENABLED=false
LOGIN_LOCKOUT_ENABLED=true
# Never "framework" behind a proxy: a client could pick its own address and dodge the lockout
FORWARD_HEADERS_STRATEGY=native
# Optional JSON logs for a collector: ecs, logstash or gelf
LOGGING_STRUCTURED_FORMAT_CONSOLE=
```

The frontend reads a single setting. Set it when the frontend sits on a network shared with other apps, where "backend" may well be somebody else's:

```properties
BACKEND_URL=http://littlewords-backend:8080
```

After the first start, open the site and try a wrong passphrase. It should be refused.

## Several families, one machine

One stack per family: its own database, settings, domain and backups. Nothing in the images knows the machine, so stacks only differ by their project name, volume and domain.

## Backups

The database is the only copy of the recordings. No backup, no "bit" for rabbit, ever again. Dump it every night, copy the dumps off the machine, and practise a restore now and then.

Dump:

```bash
docker compose exec -T postgres pg_dump -U littlewords -d littlewords --format=custom > littlewords-$(date +%F).dump
```

Restore:

```bash
docker compose stop backend
docker compose exec -T postgres pg_restore -U littlewords -d littlewords --clean --if-exists --no-owner < littlewords-<date>.dump
docker compose start backend
```

## Monitoring

Who to ask how things are going (littlewords-backend stands for whatever name your stack gives the backend):

```text
https://<your-domain>/readyz                           API and database: the public uptime probe
https://<your-domain>/healthz                          proxy, TLS and nginx, without the backend
http://littlewords-backend:8080/livez                  the JVM is alive, even without the database
http://littlewords-backend:8081/actuator/health        the same as readyz, from inside the network
http://littlewords-backend:8081/actuator/info          version and build time of what runs
http://littlewords-backend:8081/actuator/prometheus    metrics: JVM, HTTP, connection pool
```

For Prometheus, from a container on the backend's network:

```yaml
scrape_configs:
  - job_name: littlewords
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["littlewords-backend:8081"]
```
