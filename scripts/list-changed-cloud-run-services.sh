#!/usr/bin/env bash
# List unique service directory names under services/ changed vs a git base ref.
# Usage:
#   ./scripts/list-changed-cloud-run-services.sh              # origin/main...HEAD
#   ./scripts/list-changed-cloud-run-services.sh origin/develop...HEAD
#
# Pipe into deploy:
#   ./scripts/deploy-cloud-run.sh $(./scripts/list-changed-cloud-run-services.sh)

set -euo pipefail

BASE_REF="${1:-origin/main...HEAD}"

if git --no-pager diff --name-only "${BASE_REF}" -- packages/database/prisma/schema.prisma 2>/dev/null | grep -q .; then
  echo "Note: packages/database/prisma/schema.prisma changed — redeploy every service that depends on this schema (or run a full backend deploy)." >&2
fi

git --no-pager diff --name-only "${BASE_REF}" -- services/ packages/database/prisma/schema.prisma 2>/dev/null \
  | grep -E '^services/[^/]+/' \
  | cut -d/ -f2 \
  | sort -u
