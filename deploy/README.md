# Deploying Little Words

A template for one machine: the published images, PostgreSQL, and Caddy for HTTPS. Every delivery starts this very `compose.yaml` and runs the browser tests against it before any image is pushed, so the template and the images never drift apart.

Already running a reverse proxy (Traefik, nginx)? Keep `postgres`, `backend` and `frontend`, drop `caddy`, and route as [backend/README.md](../backend/README.md#deployment) says.

| File | Role |
|---|---|
| `compose.yaml` | The four services, hardened: read-only root filesystems, no capabilities, memory limits, an internal network with no route to the internet |
| `Caddyfile` | HTTPS for `DOMAIN`, `/api/*` and `/readyz` to the backend, the rest to nginx |
| `.env.example` | Every setting, to copy as `.env` |
| `backup.sh`, `restore.sh` | Database dumps (words, stages, recordings) and their restore |

## First start

Needs a Linux machine with Docker and Compose, a domain whose DNS record points at it, ports 80 and 443 open.

```bash
git clone --depth 1 https://github.com/thomashtn/littlewords.git ~/littlewords
cp -r ~/littlewords/deploy /opt/littlewords && cd /opt/littlewords
cp .env.example .env && chmod 600 .env
openssl rand -base64 24             # DB_PASSWORD
make -C ~/littlewords hash          # FAMILY_PASSWORD_HASH, single-quoted in .env (or backend/README.md)
$EDITOR .env                        # DOMAIN, DB_PASSWORD, FAMILY_PASSWORD_HASH, CHILD_NAME, CHILD_BIRTHDATE (optional), IMAGE_TAG
docker compose up --detach --wait
curl https://<your-domain>/readyz   # 200: the API and its database answer
```

Then open the site, check that a wrong passphrase is refused and that the right one opens the notebook.

A fork publishes its own images on its first push to `main`: set `IMAGE_REGISTRY=ghcr.io/<your-account>` and make the two GHCR packages public, or `docker login ghcr.io` on the machine.

## Updates

`IMAGE_TAG` names what runs: a release (`1.2.0`), a commit (`sha-<full commit>`) or `main`, the latest delivery.

```bash
./backup.sh                          # first, always
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=1.2.0/' .env
docker compose pull && docker compose up --detach --wait
```

Flyway migrates the database at startup; rolling back an image after a migration needs the dump taken before it.

## Backups

The database is the only copy of the recordings. `backup.sh` writes `backups/littlewords-<date>.dump` (owner-only) and keeps seven days (`BACKUP_KEEP_DAYS`).

```bash
crontab -e   # 0 3 * * * /opt/littlewords/backup.sh >> /var/log/littlewords-backup.log 2>&1
./restore.sh backups/littlewords-<date>.dump
```

Copy the dumps off the machine as well (rsync, restic, object storage), and try a restore now and then.

## Operations

| Need | Command |
|---|---|
| State and health | `docker compose ps` |
| Logs | `docker compose logs --follow backend` (`LOG_FORMAT=ecs` for JSON) |
| Database shell | `docker compose exec postgres psql -U littlewords` |
| Change a passphrase | New hash in `.env`, then `docker compose up --detach` (signs that role out) |
| Metrics | Actuator on the backend's port 8081, from the `internal` network only ([backend/README.md](../backend/README.md#monitoring)) |
