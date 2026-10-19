#!/usr/bin/env sh
# Dumps the notebook database (words, stages and recordings) and keeps the last BACKUP_KEEP_DAYS days.
# Cron, nightly: `0 3 * * * /path/to/deploy/backup.sh >> /var/log/littlewords-backup.log 2>&1`.
# Copy the dumps off this machine too: they are the only other copy of the recordings.
set -eu

cd "$(dirname "$0")"
dir="${BACKUP_DIR:-./backups}"
keep_days="${BACKUP_KEEP_DAYS:-7}"
file="$dir/littlewords-$(date -u +%Y%m%dT%H%M%SZ).dump"

# Dumps hold the family's voices: readable by the owner only.
umask 077
mkdir -p "$dir"

# Written under a temporary name, removed on failure, so a failed dump never looks like a good one.
trap 'rm -f "$file.partial"' EXIT
docker compose exec -T postgres pg_dump --username=littlewords --dbname=littlewords --format=custom > "$file.partial"
mv "$file.partial" "$file"

find "$dir" -name 'littlewords-*.dump' -mtime +"$keep_days" -delete
echo "Saved $file"
