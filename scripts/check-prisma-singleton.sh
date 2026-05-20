#!/bin/bash
# Fail CI/local check if runtime code creates extra PrismaClient instances.
# Allowed: shared services/lib/prisma-client.js, */lib/prisma.ts, */context.ts, tests, scripts.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if command -v rg >/dev/null 2>&1; then
  VIOLATIONS="$(rg "new PrismaClient" services \
    --glob '*.ts' \
    --glob '!**/*.test.ts' \
    --glob '!**/*.property.test.ts' \
    --glob '!**/scripts/**' \
    --glob '!**/test-*.js' \
    --glob '!**/check-db.ts' \
    --glob '!**/fix-teachers.ts' \
    --glob '!**/check.js' \
    --glob '!**/prisma/seed.ts' \
    -l 2>/dev/null || true)"
else
  VIOLATIONS="$(grep -rl "new PrismaClient" services --include='*.ts' 2>/dev/null \
    | grep -v '\.test\.ts$' \
    | grep -v '\.property\.test\.ts$' \
    | grep -v '/scripts/' \
    | grep -v '/prisma/seed\.ts$' \
    | grep -v 'check-db\.ts$' \
    | grep -v 'fix-teachers\.ts$' || true)"
fi

ALLOWLIST=(
  'services/feed-service/src/context.ts'
  'services/learn-service/src/context.ts'
  'services/auth-service/src/index.ts'
  'services/feed-service/src/index.ts'
  'services/school-service/src/index.ts'
  'services/student-service/src/index.ts'
  'services/teacher-service/src/index.ts'
  'services/grade-service/src/index.ts'
  'services/attendance-service/src/index.ts'
  'services/class-service/src/index.ts'
  'services/subject-service/src/index.ts'
  'services/club-service/src/index.ts'
  'services/messaging-service/src/index.ts'
  'services/analytics-service/src/index.ts'
  'services/timetable-service/src/index.ts'
  'services/notification-service/src/lib/prisma.ts'
)

FAIL=0
while IFS= read -r file; do
  [ -z "$file" ] && continue
  allowed=0
  for a in "${ALLOWLIST[@]}"; do
    if [ "$file" = "$a" ]; then
      allowed=1
      break
    fi
  done
  if [ "$allowed" -eq 0 ]; then
    echo "❌ Extra PrismaClient in: $file"
    grep -n "new PrismaClient" "$file" 2>/dev/null || true
    FAIL=1
  fi
done <<< "$VIOLATIONS"

if [ "$FAIL" -ne 0 ]; then
  echo ""
  echo "Use getPooledPrismaClient() from services/lib/prisma-client or import prisma from the service lib/context."
  exit 1
fi

echo "✅ Prisma singleton check passed"
