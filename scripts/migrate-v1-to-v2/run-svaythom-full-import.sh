#!/usr/bin/env bash
# Full Svaythom (or any single-school V1) migration into an existing Stunity school.
# Does not import User/login accounts — students claim or register accounts in Stunity separately.
#
# Prereqs:
#   - Fresh V1 export folder (export-v1-data.ts)
#   - DATABASE_URL in .env (Stunity PostgreSQL)
#   - SCHOOL_ID for "Svaythom High School" → run: npm run migrate:v1-resolve-school
#
# Usage:
#   chmod +x scripts/migrate-v1-to-v2/run-svaythom-full-import.sh
#   ./scripts/migrate-v1-to-v2/run-svaythom-full-import.sh <IMPORT_DIR> <SCHOOL_ID>
#
# Example:
#   ./scripts/migrate-v1-to-v2/run-svaythom-full-import.sh \
#     scripts/migrate-v1-to-v2/data/export-2026-... \
#     clxxxxxxxxxxxxxxxxxxxxxx

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

IMPORT_DIR="${1:?First arg: path to V1 export directory (contains students.json)}"
SCHOOL_ID="${2:?Second arg: Stunity School.id (see: npm run migrate:v1-resolve-school)}"

if [[ ! -f "$IMPORT_DIR/students.json" ]]; then
  echo "❌  Not an export directory: $IMPORT_DIR (missing students.json)"
  exit 1
fi

echo ""
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  Full V1 import (parents, users, grades, attendance, …)      │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""
echo "  IMPORT_DIR: $IMPORT_DIR"
echo "  SCHOOL_ID:  $SCHOOL_ID"
echo ""

IMPORT_DIR="$IMPORT_DIR" \
SCHOOL_ID="$SCHOOL_ID" \
IMPORT_FULL_V1=true \
npx tsx scripts/migrate-v1-to-v2/import-to-v2.ts

echo ""
echo "Next steps:"
echo "  IMPORT_DIR=\"$IMPORT_DIR\" SCHOOL_ID=\"$SCHOOL_ID\" npm run migrate:v1-validate"
echo "  IMPORT_DIR=\"$IMPORT_DIR\" SCHOOL_ID=\"$SCHOOL_ID\" npm run migrate:v1-diff-rosters"
echo "  SCHOOL_ID=\"$SCHOOL_ID\" npm run migrate:v1-audit-enrollments"
