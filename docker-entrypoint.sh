#!/bin/sh
set -e

# Apply any pending migrations before the server accepts traffic. Safe to run
# on every boot and on every replica — `migrate deploy` is a no-op once the
# database is up to date and takes an advisory lock while it works.
if [ -n "$DATABASE_URL" ]; then
  echo "→ Applying database migrations…"
  ./node_modules/.bin/prisma migrate deploy
else
  echo "! DATABASE_URL is not set — skipping migrations."
fi

exec "$@"
