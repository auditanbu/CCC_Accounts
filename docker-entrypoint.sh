#!/bin/sh
set -e

# Apply any pending migrations before the server accepts traffic. `migrate
# deploy` is a no-op once the database is up to date and takes an advisory lock
# while it works, so it is safe on every boot and every replica.
#
# Deliberately NOT fatal. A migration failure must not stop the server from
# booting, because the two commonest causes are both recoverable without a
# redeploy:
#   - DATABASE_URL points at a transaction-mode connection pooler (Supabase's
#     port 6543, PgBouncer). Prisma cannot run migrations over one; the running
#     app is perfectly happy on it.
#   - the schema was already applied out-of-band, or the database is briefly
#     unreachable at boot.
# In both cases a dead container just hides the real problem behind a failed
# health check. Set MIGRATE_ON_BOOT=false to skip this entirely when migrations
# are managed elsewhere.
if [ "$MIGRATE_ON_BOOT" = "false" ]; then
  echo "→ MIGRATE_ON_BOOT=false — skipping migrations."
elif [ -n "$DATABASE_URL" ]; then
  echo "→ Applying database migrations…"
  if ./node_modules/.bin/prisma migrate deploy; then
    echo "→ Migrations up to date."
  else
    echo "! Migrations failed. Starting the server anyway — check /api/health."
    echo "! If DATABASE_URL is a transaction pooler (port 6543), run migrations"
    echo "! separately against the direct connection, or set MIGRATE_ON_BOOT=false."
  fi
else
  echo "! DATABASE_URL is not set — skipping migrations."
fi

exec "$@"
