#!/bin/bash

# Stunity Enterprise Cloud Run Deployment Script
# Optimized for Free Tier (minScale: 0)

set -e # Exit on any error

PROJECT_ID="stunity-enterprise" 
REGION="us-central1"
CLOUD_RUN_MIN_INSTANCES="${CLOUD_RUN_MIN_INSTANCES:-0}"
CLOUD_RUN_MAX_INSTANCES="${CLOUD_RUN_MAX_INSTANCES:-5}"
PRISMA_CONNECTION_LIMIT="${PRISMA_CONNECTION_LIMIT:-}"
PRISMA_POOL_TIMEOUT="${PRISMA_POOL_TIMEOUT:-}"

# Load environment variables from .env if it exists
if [ -f .env ]; then
  echo "📄 Loading environment variables from .env..."
  # Export variables while handling quotes correctly
  export $(grep -v '^#' .env | xargs)
else
  echo "⚠️  .env file not found. Please ensure it exists with DATABASE_URL and JWT_SECRET."
  exit 1
fi

echo "🚀 Deploying Stunity Enterprise to Cloud Run in project: $PROJECT_ID"

# Default all services if no arguments provided
if [ $# -gt 0 ]; then
  SERVICES=("$@")
  echo "🎯 Deploying target services: ${SERVICES[*]}"
else
  SERVICES=(
    "auth-service"
    "feed-service"
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
  read -p "Are you sure you want to deploy all 15 services? (y/n) " -n 1 -r
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
  
  ENV_VARS="NODE_ENV=production,DATABASE_URL=$DATABASE_URL,JWT_SECRET=$JWT_SECRET,SUPABASE_URL=$SUPABASE_URL,SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY,GEMINI_API_KEY=$GEMINI_API_KEY,R2_ACCOUNT_ID=$R2_ACCOUNT_ID,R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY,R2_BUCKET_NAME=$R2_BUCKET_NAME,R2_PUBLIC_URL=$R2_PUBLIC_URL,CORS_ORIGIN=*"
  if [ -n "${DATABASE_READ_URL:-}" ]; then
    ENV_VARS="$ENV_VARS,DATABASE_READ_URL=$DATABASE_READ_URL"
  fi
  if [ -n "$PRISMA_CONNECTION_LIMIT" ]; then
    ENV_VARS="$ENV_VARS,PRISMA_CONNECTION_LIMIT=$PRISMA_CONNECTION_LIMIT"
  fi
  if [ -n "$PRISMA_POOL_TIMEOUT" ]; then
    ENV_VARS="$ENV_VARS,PRISMA_POOL_TIMEOUT=$PRISMA_POOL_TIMEOUT"
  fi

  # Deploy to Cloud Run with free tier defaults. Set CLOUD_RUN_MIN_INSTANCES=1
  # when production UX is more important than scale-to-zero savings.
  # NOTE: PORT is automatically set by Cloud Run and mapped to process.env.PORT
  gcloud run deploy "stunity-$SERVICE" \
    --image "gcr.io/$PROJECT_ID/stunity-$SERVICE" \
    --platform managed \
    --region "$REGION" \
    --allow-unauthenticated \
    --min-instances "$CLOUD_RUN_MIN_INSTANCES" \
    --max-instances "$CLOUD_RUN_MAX_INSTANCES" \
    --cpu-throttling \
    --memory 512Mi \
    --cpu 1 \
    --project "$PROJECT_ID" \
    --set-env-vars "$ENV_VARS"
done

echo "✅ All services deployed!"
echo "🔗 Deployment URLs can be found in the Google Cloud Console."
