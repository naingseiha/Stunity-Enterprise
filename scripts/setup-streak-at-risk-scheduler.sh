#!/usr/bin/env bash
# Creates (or updates) a Cloud Scheduler job that triggers the streak-at-risk push job
# on notification-service every day at 19:00 in the given timezone.
#
# Usage:
#   export GCP_PROJECT_ID="your-project"
#   export GCP_REGION="asia-southeast1"
#   export NOTIFICATION_SERVICE_URL="https://stunity-notification-xxxxx.run.app"
#   export NOTIFICATION_SERVICE_AUTH_TOKEN="same-token-as-service-env"
#   ./scripts/setup-streak-at-risk-scheduler.sh
#
# Optional:
#   SCHEDULER_TIMEZONE="Asia/Phnom_Penh"   # default
#   SCHEDULER_CRON="0 19 * * *"          # default: 7 PM daily

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-asia-southeast1}"
NOTIFICATION_URL="${NOTIFICATION_SERVICE_URL:?Set NOTIFICATION_SERVICE_URL}"
AUTH_TOKEN="${NOTIFICATION_SERVICE_AUTH_TOKEN:?Set NOTIFICATION_SERVICE_AUTH_TOKEN}"
JOB_NAME="${STREAK_SCHEDULER_JOB_NAME:-stunity-streak-at-risk-evening}"
TIMEZONE="${SCHEDULER_TIMEZONE:-Asia/Phnom_Penh}"
CRON="${SCHEDULER_CRON:-0 19 * * *}"

TARGET_URI="${NOTIFICATION_URL%/}/notifications/jobs/streak-at-risk"

echo "Scheduling ${JOB_NAME} -> POST ${TARGET_URI}"
echo "Cron: ${CRON} (${TIMEZONE})"

if gcloud scheduler jobs describe "${JOB_NAME}" --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "${JOB_NAME}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --schedule="${CRON}" \
    --time-zone="${TIMEZONE}" \
    --uri="${TARGET_URI}" \
    --http-method=POST \
    --headers="x-service-token=${AUTH_TOKEN},Content-Type=application/json" \
    --message-body='{}'
else
  gcloud scheduler jobs create http "${JOB_NAME}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --schedule="${CRON}" \
    --time-zone="${TIMEZONE}" \
    --uri="${TARGET_URI}" \
    --http-method=POST \
    --headers="x-service-token=${AUTH_TOKEN},Content-Type=application/json" \
    --message-body='{}'
fi

echo "Done. Verify with: gcloud scheduler jobs describe ${JOB_NAME} --location=${REGION} --project=${PROJECT_ID}"
