#!/bin/bash
# Seed stunity-dev Supabase with test users, school data, and feed posts.
#
# Usage:
#   source scripts/activate-dev-database.sh
#   ./scripts/seed-dev-all.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

if [ "${STUNITY_USE_DEV_DB:-0}" != "1" ]; then
  echo "Run: source scripts/activate-dev-database.sh"
  exit 1
fi

if [[ "${DATABASE_URL:-}" != *"ykvqgyrwizqjjzfuitto"* ]]; then
  echo "❌ DATABASE_URL is not the stunity-dev project. Aborting."
  exit 1
fi

echo "🌱 Seeding dev database (base + test data + school + feed)..."
export STUNITY_USE_DEV_DB=1

npx tsx scripts/db-safety-check.ts

cd packages/database
npx prisma db seed
cd "$PROJECT_DIR"

# Optional extras (skip if scripts drift from schema)
npm run seed:feed || echo "⚠️  seed:feed had errors — check logs"

echo ""
echo "✅ Dev seed complete. Mobile login examples:"
echo "   john.doe@testhighschool.edu / SecurePass123!"
echo "   alex.chen@testhighschool.edu / SecurePass123!"
