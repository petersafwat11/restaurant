#!/usr/bin/env bash
# Postgres logical backup. Writes a timestamped, compressed custom-format dump.
# Usage: DATABASE_URL=postgres://... BACKUP_DIR=/backups ./scripts/backup/pg-backup.sh
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/restaurant-$STAMP.dump"

echo "[pg-backup] dumping → $OUT"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$OUT"

echo "[pg-backup] pruning dumps older than ${RETENTION_DAYS}d"
find "$BACKUP_DIR" -name 'restaurant-*.dump' -mtime "+${RETENTION_DAYS}" -delete

echo "[pg-backup] done: $(du -h "$OUT" | cut -f1)"
