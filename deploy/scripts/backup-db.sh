#!/usr/bin/env bash
# Nightly Postgres dump - invoked by cron on the VPS (installed by bootstrap.sh).
# Keeps the last 7 days of dumps under /opt/restaurant/backups.
set -euo pipefail

APP_DIR="/opt/restaurant"
TS=$(date -u +%Y%m%d-%H%M%S)
cd "$APP_DIR"
mkdir -p "$APP_DIR/backups"

# Read credentials from the container environment. Compose accepts values in
# .env that are not safe to source as shell code (for example angle brackets).
docker compose exec -T postgres sh -ec \
  'exec pg_dump -U "${POSTGRES_USER:-postgres}" -Fc "${POSTGRES_DB:-restaurant}"' \
  > "$APP_DIR/backups/db-$TS.dump"

# Retention: 7 days.
find "$APP_DIR/backups" -name 'db-*.dump' -mtime +7 -delete

echo "pg_dump complete: db-$TS.dump"
