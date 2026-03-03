#!/bin/bash

# Stunity Enterprise Cloud Run Deployment Script
# Optimized for Free Tier (minScale: 0)

set -e # Exit on any error

PROJECT_ID="stunity-enterprise" 
REGION="us-central1"

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
  
  # Deploy to Cloud Run with free tier optimizations
  # NOTE: PORT is automatically set by Cloud Run and mapped to process.env.PORT
  gcloud run deploy "stunity-$SERVICE" \
    --image "gcr.io/$PROJECT_ID/stunity-$SERVICE" \
    --platform managed \
    --region "$REGION" \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 5 \
    --cpu-throttling \
    --memory 512Mi \
    --cpu 1 \
    --project "$PROJECT_ID" \
    --set-env-vars "NODE_ENV=production,DATABASE_URL=$DATABASE_URL,JWT_SECRET=$JWT_SECRET,SUPABASE_URL=$SUPABASE_URL,SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY,CORS_ORIGIN=*"
done

echo "✅ All services deployed!"
echo "🔗 Deployment URLs can be found in the Google Cloud Console."
