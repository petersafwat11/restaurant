#!/usr/bin/env bash
# Restore a custom-format Postgres dump produced by pg-backup.sh.
# Usage: DATABASE_URL=postgres://... ./scripts/backup/pg-restore.sh <dump-file>
#
# DESTRUCTIVE: --clean drops existing objects first. Restore into a fresh DB
# or a deliberately chosen target only.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
DUMP="${1:?usage: pg-restore.sh <dump-file>}"
[ -f "$DUMP" ] || { echo "no such file: $DUMP" >&2; exit 1; }

echo "[pg-restore] restoring $DUMP → target DB"
echo "[pg-restore] this DROPS existing objects. Ctrl-C within 5s to abort."
sleep 5

pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$DATABASE_URL" "$DUMP"

echo "[pg-restore] done"
