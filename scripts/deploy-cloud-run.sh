#!/bin/bash

# Stunity Enterprise Cloud Run Deployment Script
# Optimized for Free Tier (minScale: 0)

set -e # Exit on any error

PROJECT_ID="stunity-enterprise" 
REGION="us-central1"
# Defaults align with docs/DEPLOYMENT_GUIDE.md (scale-to-zero free tier). Set in .env for prod:
# CLOUD_RUN_MIN_INSTANCES=1, CLOUD_RUN_CPU_THROTTLING=false, CORS_ORIGIN=https://your-domain.com
CLOUD_RUN_MIN_INSTANCES="${CLOUD_RUN_MIN_INSTANCES:-0}"
CLOUD_RUN_MAX_INSTANCES="${CLOUD_RUN_MAX_INSTANCES:-5}"
CLOUD_RUN_CPU_THROTTLING="${CLOUD_RUN_CPU_THROTTLING:-true}"
CORS_ORIGIN="${CORS_ORIGIN:-*}"
PRISMA_CONNECTION_LIMIT="${PRISMA_CONNECTION_LIMIT:-}"
PRISMA_POOL_TIMEOUT="${PRISMA_POOL_TIMEOUT:-}"

# Required in root .env: DATABASE_URL, JWT_SECRET, Supabase, R2, GEMINI_API_KEY (see script body).
# For notification-service Cloud Run deploys, also set NOTIFICATION_SERVICE_AUTH_TOKEN (see services/notification-service/src/index.ts).
if [ -f .env ]; then
  echo "📄 Loading environment variables from .env..."
  # Export variables while handling quotes correctly
  export $(grep -v '^#' .env | xargs)
else
  echo "⚠️  .env file not found. Please ensure it exists with DATABASE_URL and JWT_SECRET."
  exit 1
fi

if [ "$CORS_ORIGIN" = "*" ]; then
  echo "⚠️  CORS_ORIGIN is * (allows any browser origin). Set CORS_ORIGIN in .env to your web origin for production."
fi

echo "🚀 Deploying Stunity Enterprise to Cloud Run in project: $PROJECT_ID (min-instances=$CLOUD_RUN_MIN_INSTANCES, cpu-throttling=$CLOUD_RUN_CPU_THROTTLING)"

# Default all services if no arguments provided
if [ $# -gt 0 ]; then
  SERVICES=("$@")
  echo "🎯 Deploying target services: ${SERVICES[*]}"
else
  SERVICES=(
    "auth-service"
    "feed-service"
    "learn-service"
    "school-service"
    "student-service"
    "teacher-service"
    "attendance-service"
    "class-service"
    "subject-service"
    "grade-service"
    "analytics-service"
    "club-service"
    "notification-service"
    "messaging-service"
    "ai-service"
    "timetable-service"
  )
  echo "🚀 Deploying ALL services to Cloud Run..."
  read -p "Are you sure you want to deploy all ${#SERVICES[@]} services? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

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
  
  echo "🚀 Deploying $SERVICE to Cloud Run..."
  
  ENV_VARS="NODE_ENV=production,DATABASE_URL=$DATABASE_URL,JWT_SECRET=$JWT_SECRET,SUPABASE_URL=$SUPABASE_URL,SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY,GEMINI_API_KEY=$GEMINI_API_KEY,R2_ACCOUNT_ID=$R2_ACCOUNT_ID,R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY,R2_BUCKET_NAME=$R2_BUCKET_NAME,R2_PUBLIC_URL=$R2_PUBLIC_URL,CORS_ORIGIN=$CORS_ORIGIN"
  if [ -n "${DATABASE_READ_URL:-}" ]; then
    ENV_VARS="$ENV_VARS,DATABASE_READ_URL=$DATABASE_READ_URL"
  fi
  if [ -n "$PRISMA_CONNECTION_LIMIT" ]; then
    ENV_VARS="$ENV_VARS,PRISMA_CONNECTION_LIMIT=$PRISMA_CONNECTION_LIMIT"
  fi
  if [ -n "$PRISMA_POOL_TIMEOUT" ]; then
    ENV_VARS="$ENV_VARS,PRISMA_POOL_TIMEOUT=$PRISMA_POOL_TIMEOUT"
  fi
  # Club and other services call notification with x-service-token; align with notification-service default.
  NOTIF_TOKEN="${NOTIFICATION_SERVICE_AUTH_TOKEN:-$JWT_SECRET}"
  ENV_VARS="$ENV_VARS,NOTIFICATION_SERVICE_AUTH_TOKEN=$NOTIF_TOKEN"

  CPU_THROTTLING_FLAG="--no-cpu-throttling"
  if [ "$CLOUD_RUN_CPU_THROTTLING" = "true" ]; then
    CPU_THROTTLING_FLAG="--cpu-throttling"
  fi

  # Deploy to Cloud Run. Defaults: min 0 + cpu throttling (cost-friendly).
  # For low-latency production: set CLOUD_RUN_MIN_INSTANCES=1 and CLOUD_RUN_CPU_THROTTLING=false in .env.
  # NOTE: PORT is automatically set by Cloud Run and mapped to process.env.PORT
  gcloud run deploy "stunity-$SERVICE" \
    --image "gcr.io/$PROJECT_ID/stunity-$SERVICE" \
    --platform managed \
    --region "$REGION" \
    --allow-unauthenticated \
    --min-instances "$CLOUD_RUN_MIN_INSTANCES" \
    --max-instances "$CLOUD_RUN_MAX_INSTANCES" \
    "$CPU_THROTTLING_FLAG" \
    --memory 512Mi \
    --cpu 1 \
    --project "$PROJECT_ID" \
    --set-env-vars "$ENV_VARS"
done

echo "✅ All services deployed!"
echo "🔗 Deployment URLs can be found in the Google Cloud Console."
