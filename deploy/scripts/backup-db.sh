#!/usr/bin/env bash
# Nightly Postgres dump — invoked by cron on the VPS (installed by bootstrap.sh).
# Keeps the last 7 days of dumps under /opt/restaurant/backups.
set -euo pipefail

APP_DIR="/opt/restaurant"
TS=$(date -u +%Y%m%d-%H%M%S)
cd "$APP_DIR"

# Pull POSTGRES_USER / POSTGRES_DB from .env if available — fall back to defaults.
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a; source .env; set +a
fi

docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-postgres}" \
  -Fc \
  "${POSTGRES_DB:-restaurant}" \
  > "$APP_DIR/backups/db-$TS.dump"

# Retention: 7 days.
find "$APP_DIR/backups" -name 'db-*.dump' -mtime +7 -delete

echo "✓ pg_dump complete: db-$TS.dump"
