#!/bin/bash
# Lightweight local dev: auth + feed + notifications + learn (+ web).
# Uses fewer Supabase connections than ./quick-start.sh (full stack).
#
# Usage:
#   ./quick-start-lite.sh
#
# Optional:
#   SKIP_DB_MIGRATE=1 ./quick-start-lite.sh   # default below skips migrate

set -e
export QUICK_START_LITE=1
export SKIP_MESSAGING_SERVICE=1
export SKIP_DB_MIGRATE="${SKIP_DB_MIGRATE:-1}"
export DISABLE_DB_KEEPALIVE=1
export DISABLE_DB_STARTUP_WARMUP=1
export PRISMA_CONNECTION_LIMIT="${PRISMA_CONNECTION_LIMIT:-2}"
export PRISMA_POOL_TIMEOUT="${PRISMA_POOL_TIMEOUT:-10}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/quick-start.sh"
