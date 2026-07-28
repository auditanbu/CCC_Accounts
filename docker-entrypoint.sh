#!/bin/sh
set -e

# Apply any pending migrations before the server accepts traffic. The runner is
# scripts/migrate.mjs rather than the Prisma CLI — see the note in the Dockerfile
# — and it is idempotent, so this is safe on every boot and every replica.
#
# Deliberately NOT fatal. A dead container hides the reason behind a failed
# health check; a running one can be asked at /api/diagnostics. Set
# MIGRATE_ON_BOOT=false to skip entirely when migrations are managed elsewhere.
MIGRATOR="./scripts/migrate.mjs"

if [ "$MIGRATE_ON_BOOT" = "false" ]; then
  echo "→ MIGRATE_ON_BOOT=false — skipping migrations."
elif [ -z "$DATABASE_URL" ]; then
  echo "! DATABASE_URL is not set — skipping migrations. The app will not work."
elif [ ! -f "$MIGRATOR" ]; then
  echo "! Migration runner missing at $MIGRATOR — skipping."
else
  echo "→ Applying database migrations…"
  if node "$MIGRATOR"; then
    :
  else
    echo "! Migrations failed. Starting the server anyway."
    echo "! Check /api/diagnostics — it reports which step fails and why."
  fi
fi

exec "$@"
