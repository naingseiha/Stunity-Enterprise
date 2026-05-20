#!/bin/bash
# Deploy core production services with warm instances on auth + feed.
#
# Usage:
#   ./scripts/deploy-production-core.sh
#   ./scripts/deploy-production-core.sh feed-service   # single service
#
# Requires root .env with production DATABASE_URL, JWT_SECRET, R2, etc.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

export DEPLOY_PROFILE=core
export CLOUD_RUN_MAX_INSTANCES="${CLOUD_RUN_MAX_INSTANCES:-2}"
export PRISMA_CONNECTION_LIMIT="${PRISMA_CONNECTION_LIMIT:-3}"
export CLOUD_RUN_MIN_INSTANCES="${CLOUD_RUN_MIN_INSTANCES:-0}"
export CLOUD_RUN_MIN_INSTANCES_AUTH="${CLOUD_RUN_MIN_INSTANCES_AUTH:-1}"
export CLOUD_RUN_MIN_INSTANCES_FEED="${CLOUD_RUN_MIN_INSTANCES_FEED:-1}"
# Feed background jobs (5min ranker) — off by default; set FEED_ENABLE_BACKGROUND_JOBS=1 on one revision only.
export FEED_ENABLE_BACKGROUND_JOBS="${FEED_ENABLE_BACKGROUND_JOBS:-0}"

if [ $# -gt 0 ]; then
  exec "$REPO_ROOT/scripts/deploy-cloud-run.sh" "$@"
fi

exec "$REPO_ROOT/scripts/deploy-cloud-run.sh" \
  auth-service \
  feed-service \
  notification-service \
  learn-service
