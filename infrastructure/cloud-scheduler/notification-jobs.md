# Notification job scheduling

The notification-service exposes two recurring jobs both as **in-process timers**
(see `src/scheduler.ts`) and as **service-auth HTTP endpoints** for production.

| Job | Endpoint | Cadence |
|---|---|---|
| Streak-at-risk reminder | `POST /notifications/jobs/streak-at-risk` | hourly |
| Weekly progress digest | `POST /notifications/jobs/weekly-progress-digest` | Sunday 18:00 |

Both jobs are idempotent (per-user, per-day de-dupe) and respect the shared
non-urgent push budget (`MAX_NON_URGENT_PUSH_PER_DAY`, growth-plan §7.4).

## Dev / single-instance

The in-process scheduler runs automatically. No setup needed.
Disable it (e.g. for multi-instance production) with `ENABLE_INTERNAL_CRON=false`.
Tune the digest slot with `INTERNAL_CRON_DIGEST_DAY` (0=Sun) and
`INTERNAL_CRON_DIGEST_HOUR` (0-23, local time).

## Production (Cloud Run + Cloud Scheduler)

Set `ENABLE_INTERNAL_CRON=false` on the notification-service so only Cloud
Scheduler drives the jobs (avoids every instance firing). Auth is the
`x-service-token` header, which must equal `NOTIFICATION_SERVICE_AUTH_TOKEN`
(the deploy falls back to `JWT_SECRET`).

```sh
SERVICE_URL="https://notification-service-XXXX.run.app"   # Cloud Run URL
SERVICE_TOKEN="$(gcloud secrets versions access latest --secret=JWT_SECRET)"
LOCATION="asia-southeast1"

# Hourly streak-at-risk reminders
gcloud scheduler jobs create http streak-at-risk \
  --location="$LOCATION" \
  --schedule="0 * * * *" \
  --uri="$SERVICE_URL/notifications/jobs/streak-at-risk" \
  --http-method=POST \
  --headers="x-service-token=$SERVICE_TOKEN" \
  --time-zone="Asia/Phnom_Penh"

# Weekly progress digest — Sundays 18:00
gcloud scheduler jobs create http weekly-progress-digest \
  --location="$LOCATION" \
  --schedule="0 18 * * 0" \
  --uri="$SERVICE_URL/notifications/jobs/weekly-progress-digest" \
  --http-method=POST \
  --headers="x-service-token=$SERVICE_TOKEN" \
  --time-zone="Asia/Phnom_Penh"
```

To update an existing job, replace `create` with `update`. Verify with
`gcloud scheduler jobs list --location="$LOCATION"`.
