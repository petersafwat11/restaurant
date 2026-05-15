#!/usr/bin/env bash
# Trigger a Redis RDB snapshot and copy it out. Redis is a cache + queue
# broker here (BullMQ), so this is a convenience for faster recovery, not the
# system of record — Postgres is.
# Usage: REDIS_URL=redis://host:6379 BACKUP_DIR=/backups ./scripts/backup/redis-snapshot.sh
set -euo pipefail

: "${REDIS_URL:?REDIS_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

echo "[redis-snapshot] issuing BGSAVE"
redis-cli -u "$REDIS_URL" BGSAVE

# Wait for the background save to finish.
until [ "$(redis-cli -u "$REDIS_URL" LASTSAVE)" != "$LAST" ]; do
  LAST="${LAST:-$(redis-cli -u "$REDIS_URL" LASTSAVE)}"
  sleep 1
done

RDB_PATH="$(redis-cli -u "$REDIS_URL" CONFIG GET dir | tail -1)/dump.rdb"
cp "$RDB_PATH" "$BACKUP_DIR/redis-$STAMP.rdb"
echo "[redis-snapshot] copied → $BACKUP_DIR/redis-$STAMP.rdb"
