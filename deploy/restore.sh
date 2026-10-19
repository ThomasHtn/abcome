#!/usr/bin/env sh
# Replaces the notebook database with a dump made by backup.sh; the backend is stopped meanwhile.
# Usage: ./restore.sh backups/littlewords-<date>.dump
set -eu

if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  echo "Usage: $0 <file.dump>" >&2
  exit 2
fi

# Absolute path first: the script then works from its own folder, where compose.yaml is.
dump="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
cd "$(dirname "$0")"

docker compose stop backend
# --clean drops each object before recreating it, so the result is the dump and nothing else.
docker compose exec -T postgres pg_restore --username=littlewords --dbname=littlewords \
  --clean --if-exists --no-owner --exit-on-error < "$dump"
docker compose start backend
echo "Restored $dump"
