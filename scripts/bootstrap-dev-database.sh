#!/bin/bash
# First-time schema sync for an empty Supabase dev project.
# Uses prisma db push (greenfield). migrate deploy can fail mid-chain on new DBs.
#
# Usage:
#   source scripts/activate-dev-database.sh
#   ./scripts/bootstrap-dev-database.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA="$PROJECT_DIR/packages/database/prisma/schema.prisma"

if [ "${STUNITY_USE_DEV_DB:-0}" != "1" ]; then
  if [ -f "$PROJECT_DIR/.env.development.local" ]; then
    echo "Run: source scripts/activate-dev-database.sh"
    exit 1
  fi
  echo "❌ STUNITY_USE_DEV_DB is not set — refusing to push schema."
  exit 1
fi

if [[ "${DATABASE_URL:-}" != *"ykvqgyrwizqjjzfuitto"* ]] && [ "${STUNITY_DEV_PROJECT_REF:-}" != "ykvqgyrwizqjjzfuitto" ]; then
  echo "❌ DATABASE_URL does not look like stunity-dev. Aborting."
  exit 1
fi

echo "🗄️  Pushing Prisma schema to dev Supabase (db push)..."
cd "$PROJECT_DIR"
npx prisma db push --schema="$SCHEMA" --accept-data-loss
echo "✅ Dev database schema is in sync."
