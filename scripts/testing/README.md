# Integration Testing

## Club + Notification Integration

This test validates:
- service-auth protection on `POST /notifications/send`
- approval-required join flow (`request -> approve -> reject`)
- invite-only flow (`invite -> accept -> decline`)
- notification persistence + deep links (`/clubs/:id`, `/clubs/invites`)

Run:

```bash
npm run test:club-notification-integration
```

Expected running services:
- `auth-service` on `3001`
- `club-service` on `3012`
- `notification-service` on `3013`

Optional environment overrides:
- `AUTH_URL`
- `CLUB_URL`
- `NOTIF_URL`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `PARTICIPANT_EMAIL`
- `PARTICIPANT_PASSWORD`

