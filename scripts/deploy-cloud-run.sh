#!/bin/bash

# Stunity Enterprise Cloud Run Deployment Script
# Optimized for cost-friendly Cloud Run defaults (scale-to-zero, bounded DB pools)
#
# Phase 0 consolidation (docs/ARCHITECTURE_REVIEW_2026-07.md): 16 services ->
# academic-api + engagement-api + ai-service. See docs/GCP_NEW_ACCOUNT_MIGRATION.md
# for the accompanying move to a new GCP project.

set -e # Exit on any error

load_env_file() {
  local file="$1"
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == export[[:space:]]* ]] && line="${line#export }"
    [[ "$line" != *=* ]] && continue

    local key="${line%%=*}"
    local value="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    if [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] && [ -z "${!key+x}" ]; then
      export "$key=$value"
    fi
  done < "$file"
}

# Required in root .env: DATABASE_URL, JWT_SECRET, Supabase, R2, GEMINI_API_KEY,
# ANTHROPIC_API_KEY (see script body).
if [ -f .env ]; then
  echo "📄 Loading environment variables from .env..."
  # Shell-safe dotenv loading: preserves URLs with &, comma-separated origins, and wrapper env overrides.
  load_env_file .env
else
  echo "⚠️  .env file not found. Please ensure it exists with DATABASE_URL and JWT_SECRET."
  exit 1
fi

PROJECT_ID="${PROJECT_ID:-stunity-prod}"
REGION="${REGION:-asia-southeast1}"
# Cost-friendly defaults everywhere (scale-to-zero). The old per-service
# min-instances=1 override for auth/feed caused the original billing overage
# (docs/ARCHITECTURE_REVIEW_2026-07.md §2.5) — do not reintroduce it without
# a measured cold-start reason. Override CLOUD_RUN_MIN_INSTANCES_ENGAGEMENT in
# .env if engagement-api specifically needs to stay warm later.
CLOUD_RUN_MIN_INSTANCES="${CLOUD_RUN_MIN_INSTANCES:-0}"
CLOUD_RUN_MIN_INSTANCES_ENGAGEMENT="${CLOUD_RUN_MIN_INSTANCES_ENGAGEMENT:-}"
CLOUD_RUN_MAX_INSTANCES="${CLOUD_RUN_MAX_INSTANCES:-3}"
CLOUD_RUN_CPU_THROTTLING="${CLOUD_RUN_CPU_THROTTLING:-true}"
CORS_ORIGIN="${CORS_ORIGIN:-*}"
# Cap Prisma pool slots per Cloud Run instance (Supabase Micro cannot sustain 20×N services).
PRISMA_CONNECTION_LIMIT="${PRISMA_CONNECTION_LIMIT:-3}"
PRISMA_POOL_TIMEOUT="${PRISMA_POOL_TIMEOUT:-10}"

resolve_min_instances() {
  local service="$1"
  local default_min="${CLOUD_RUN_MIN_INSTANCES:-0}"
  case "$service" in
    engagement-api)
      echo "${CLOUD_RUN_MIN_INSTANCES_ENGAGEMENT:-$default_min}"
      ;;
    *)
      echo "$default_min"
      ;;
  esac
}

for required_var in DATABASE_URL JWT_SECRET; do
  if [ -z "${!required_var:-}" ]; then
    echo "❌ Missing required env var: $required_var"
    exit 1
  fi
done

if [ "$CORS_ORIGIN" = "*" ]; then
  echo "⚠️  CORS_ORIGIN is * (allows any browser origin). Set CORS_ORIGIN in .env to your web origin for production."
fi

echo "🚀 Deploying Stunity Enterprise to Cloud Run in project: $PROJECT_ID region: $REGION (min-instances=$CLOUD_RUN_MIN_INSTANCES, cpu-throttling=$CLOUD_RUN_CPU_THROTTLING)"

# Default all services if no arguments provided.
# Order matters: engagement-api must deploy before academic-api, since
# academic-api's grade/attendance modules call engagement-api's
# /auth/notifications/* routes cross-service (AUTH_SERVICE_URL) — its live
# URL is captured after deploy and injected into academic-api's env vars below.
if [ $# -gt 0 ]; then
  SERVICES=("$@")
  echo "🎯 Deploying target services: ${SERVICES[*]}"
else
  SERVICES=(
    "engagement-api"
    "academic-api"
    "ai-service"
  )
  echo "🎯 Deploying all 3 services: ${SERVICES[*]}"
fi

ENGAGEMENT_API_URL="${ENGAGEMENT_API_URL:-}"

# Build and Push Images
for SERVICE in "${SERVICES[@]}"; do
  echo "📦 Building $SERVICE..."

  # Create a temporary cloudbuild.yaml for this service
  cat <<EOF > cloudbuild.tmp.yaml
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/$PROJECT_ID/stunity-$SERVICE', '-f', 'services/$SERVICE/Dockerfile', '.']
images:
- 'gcr.io/$PROJECT_ID/stunity-$SERVICE'
EOF

  gcloud builds submit --config cloudbuild.tmp.yaml --project "$PROJECT_ID" .
  rm cloudbuild.tmp.yaml

  SERVICE_MIN_INSTANCES="$(resolve_min_instances "$SERVICE")"
  echo "🚀 Deploying $SERVICE to Cloud Run (min-instances=$SERVICE_MIN_INSTANCES)..."

  if [ "${STUNITY_USE_DEV_DB:-0}" = "1" ] || [[ "${DATABASE_URL:-}" == *"ykvqgyrwizqjjzfuitto"* ]]; then
    echo "❌ Refusing deploy: DATABASE_URL looks like dev Supabase. Use production .env for Cloud Run."
    exit 1
  fi

  ENV_VARS="NODE_ENV=production|DATABASE_URL=$DATABASE_URL|JWT_SECRET=$JWT_SECRET|SUPABASE_URL=${SUPABASE_URL:-}|SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-}|GEMINI_API_KEY=${GEMINI_API_KEY:-}|ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}|R2_ACCOUNT_ID=${R2_ACCOUNT_ID:-}|R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID:-}|R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY:-}|R2_BUCKET_NAME=${R2_BUCKET_NAME:-}|R2_PUBLIC_URL=${R2_PUBLIC_URL:-}|CORS_ORIGIN=$CORS_ORIGIN"
  if [ -n "${SENTRY_DSN:-}" ]; then
    ENV_VARS="$ENV_VARS|SENTRY_DSN=$SENTRY_DSN"
  fi

  # engagement-api only: passkeys/WebAuthn (auth module lives here now).
  # Harmless no-op on academic-api/ai-service (they don't read these).
  if [ "$SERVICE" = "engagement-api" ]; then
    ENV_VARS="$ENV_VARS|AUTH_PASSKEYS_ENABLED=${AUTH_PASSKEYS_ENABLED:-false}|WEBAUTHN_RP_ID=${WEBAUTHN_RP_ID:-}|WEBAUTHN_RP_NAME=${WEBAUTHN_RP_NAME:-}|WEBAUTHN_ORIGIN=${WEBAUTHN_ORIGIN:-}"
  fi
  # academic-api's grade/attendance modules call engagement-api's
  # /auth/notifications/* routes cross-service. Requires engagement-api to
  # have been deployed first in this same run (or ENGAGEMENT_API_URL set
  # manually in .env for a targeted single-service redeploy).
  if [ "$SERVICE" = "academic-api" ]; then
    if [ -z "$ENGAGEMENT_API_URL" ]; then
      echo "⚠️  ENGAGEMENT_API_URL is not set. academic-api's grade/attendance"
      echo "    notification calls (AUTH_SERVICE_URL) will fail until it is."
      echo "    Deploy engagement-api first, or set ENGAGEMENT_API_URL in .env."
    fi
    ENV_VARS="$ENV_VARS|AUTH_SERVICE_URL=${ENGAGEMENT_API_URL:-}"
  fi
  if [ -n "${DATABASE_READ_URL:-}" ]; then
    ENV_VARS="$ENV_VARS|DATABASE_READ_URL=$DATABASE_READ_URL"
  fi
  # Pass REDIS_URL to Cloud Run only if it points at a real shared cache
  # (Upstash / Memorystore). Local dev Redis (localhost:6379) is unreachable
  # from Cloud Run, so falling back to in-process LRU is preferred there.
  # CLOUD_RUN_REDIS_URL takes precedence when set, otherwise REDIS_URL is
  # passed through if it doesn't look like a localhost address.
  RESOLVED_REDIS_URL="${CLOUD_RUN_REDIS_URL:-}"
  if [ -z "$RESOLVED_REDIS_URL" ] && [[ "${REDIS_URL:-}" != *"localhost"* && "${REDIS_URL:-}" != *"127.0.0.1"* && -n "${REDIS_URL:-}" ]]; then
    RESOLVED_REDIS_URL="$REDIS_URL"
  fi
  if [ -n "$RESOLVED_REDIS_URL" ]; then
    ENV_VARS="$ENV_VARS|REDIS_URL=$RESOLVED_REDIS_URL"
  fi
  # Keepalive defaults to ON for warm services (min-instances>=1), OFF otherwise.
  # The keepalive ping every 4 min keeps the DB connection hot so requests
  # don't pay the TCP+TLS handshake cost after idle periods. Costs negligible
  # connection-pool slots on Pro plan. Override via env var if needed.
  DEFAULT_DISABLE_KEEPALIVE=1
  if [ "$SERVICE_MIN_INSTANCES" -ge 1 ]; then
    DEFAULT_DISABLE_KEEPALIVE=0
  fi
  ENV_VARS="$ENV_VARS|PRISMA_CONNECTION_LIMIT=$PRISMA_CONNECTION_LIMIT|PRISMA_POOL_TIMEOUT=$PRISMA_POOL_TIMEOUT|DISABLE_DB_KEEPALIVE=${DISABLE_DB_KEEPALIVE:-$DEFAULT_DISABLE_KEEPALIVE}|DISABLE_DB_STARTUP_WARMUP=${DISABLE_DB_STARTUP_WARMUP:-$DEFAULT_DISABLE_KEEPALIVE}"

  # Background cron (feed ranker, school audit) runs per instance — disable by default in prod.
  # feed's job scheduling now lives inside engagement-api.
  if [ "$SERVICE" = "engagement-api" ] && [ "${FEED_ENABLE_BACKGROUND_JOBS:-0}" = "1" ]; then
    ENV_VARS="$ENV_VARS|DISABLE_BACKGROUND_JOBS=false"
  else
    ENV_VARS="$ENV_VARS|DISABLE_BACKGROUND_JOBS=true"
  fi
  # notification module (inside engagement-api) validates x-service-token on
  # its /send, /jobs/* endpoints; academic-api's grade/attendance modules and
  # Cloud Scheduler use the same shared token.
  NOTIF_TOKEN="${NOTIFICATION_SERVICE_AUTH_TOKEN:-$JWT_SECRET}"
  ENV_VARS="$ENV_VARS|NOTIFICATION_SERVICE_AUTH_TOKEN=$NOTIF_TOKEN"

  CPU_THROTTLING_FLAG="--no-cpu-throttling"
  if [ "$CLOUD_RUN_CPU_THROTTLING" = "true" ]; then
    CPU_THROTTLING_FLAG="--cpu-throttling"
  fi

  # Deploy to Cloud Run. Defaults: min 0 + cpu throttling (cost-friendly).
  # NOTE: PORT is automatically set by Cloud Run and mapped to process.env.PORT
  gcloud run deploy "stunity-$SERVICE" \
    --image "gcr.io/$PROJECT_ID/stunity-$SERVICE" \
    --platform managed \
    --region "$REGION" \
    --allow-unauthenticated \
    --min-instances "$SERVICE_MIN_INSTANCES" \
    --max-instances "$CLOUD_RUN_MAX_INSTANCES" \
    "$CPU_THROTTLING_FLAG" \
    --memory 512Mi \
    --cpu 1 \
    --project "$PROJECT_ID" \
    --set-env-vars "^|^$ENV_VARS"

  if [ "$SERVICE" = "engagement-api" ]; then
    ENGAGEMENT_API_URL="$(gcloud run services describe "stunity-$SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
    echo "📎 Captured engagement-api URL for downstream services: $ENGAGEMENT_API_URL"
  fi
done

echo "✅ All services deployed!"
echo "🔗 Deployment URLs can be found in the Google Cloud Console."
