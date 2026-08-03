# Dependency Security Triage — 3 August 2026

## Outcome

Production dependency findings were reduced from **55 to 37** without force-installing breaking framework or mobile-runtime upgrades.

| Audit | Critical | High | Moderate | Low | Total |
|---|---:|---:|---:|---:|---:|
| Root production dependencies — before | 3 | 17 | 32 | 3 | 55 |
| Root production dependencies — after | 1 | 8 | 25 | 3 | 37 |
| Web workspace — after | 0 | 3 | 0 | 0 | 3 |
| Academic API workspace — after | 0 | 0 | 2 | 1 | 3 |
| Engagement API workspace — after | 0 | 0 | 7 | 1 | 8 |

The final root evidence was captured with `npm audit --omit=dev --json`. Audit exits non-zero while accepted findings remain; that is expected and must not be treated as a failed build by itself.

## Safe upgrades completed

- Web: Next.js 15.5.22, next-intl 4.13.4 and isomorphic-dompurify 3.19.0.
- Shared/mobile services: current safe Axios, Morgan, Multer, Nodemailer, UUID, Firebase Admin and Sharp releases within the tested architecture.
- Safe transitive updates: `shell-quote`, `@xmldom/xmldom`, `form-data`, `brace-expansion`, `js-yaml`, `undici` and `ws` where the lockfile permitted them.
- Engagement and Notification Firebase code migrated from namespace APIs to Firebase Admin's modular APIs.
- Engagement and Notification Docker runtimes moved from Node 20 to Node 22 because Firebase Admin 14 requires Node 22 or newer.

No `npm audit fix --force` was used.

## Remaining accepted exceptions

### Expo/mobile build toolchain — 1 critical and 5 high

The remaining critical `tar` path and related high findings are inherited by Expo 52 build tooling through Expo CLI/config, `cacache` and XML/plist tooling. The available automated fix upgrades Expo 52 to Expo 57, which is a platform migration affecting React Native, native projects and the EAS build chain.

**Decision:** do not force this change into a production Admin hardening release. Handle it as a dedicated Expo upgrade with Android/iOS builds, native-module checks, login/deep-link/push-notification tests and store release validation.

### Next.js vendor-pinned build/runtime dependencies — 3 high

Next.js 15.5.22 fixes the direct framework advisories in the supported 15.x line, but its package still pins nested `postcss@8.4.31` and `sharp@0.34.5`. npm therefore reports `next`, `postcss` and `sharp` as three high findings. Root overrides were tested and removed because they did not safely replace Next's exact nested dependencies.

**Decision:** keep the supported patched Next 15 release, monitor an upstream Next release that updates both nested packages, and retest immediately when available. Do not mutate `node_modules` or force an unsupported override in production.

## Verification

- Web TypeScript passed.
- Web Jest passed: 9 suites and 75 tests.
- Web production build passed on Next.js 15.5.22.
- Academic, Engagement, Notification, Club, Feed, Learn, School, Student and Teacher service builds passed.
- Mobile TypeScript passed.
- Claim Code launch tests passed: 5/5.
- Engagement Cloud Run revision `stunity-engagement-api-00010-plw` uses the supported Node 22 image, serves 100% traffic and returned HTTP 200.
- Academic Cloud Run revision `stunity-academic-api-00009-7nh` serves 100% traffic and returned HTTP 200.
- Isolated Vercel production deployment `dpl_CuHbuBgmAB68NDQtWdwtrSEebcbZ` is `READY`, aliased to `stunity.app`, and key Admin routes returned HTTP 200.
- Production homepage remained the released “Reimagine education” version; unrelated landing-page work was excluded.

## Next security milestone

1. Schedule the Expo 52 → current supported Expo migration as its own release train.
2. Upgrade Next when upstream removes the nested PostCSS and Sharp findings.
3. Add workspace-scoped production audits to CI with a time-bounded exception manifest rather than one monorepo-wide pass/fail gate.
4. Continue removing deprecated indirect packages when their owning SDKs publish compatible versions.

## Follow-up baseline

Expo remains on SDK 52 / React Native 0.76.9 for the current production line. After removing two invalid comment-only keys from `apps/mobile/app.json`, Expo Doctor passed **18/18** and Mobile TypeScript passed. The major Expo upgrade remains isolated because it must validate New Architecture, passkeys, notifications, Universal/App Links, Sentry, camera/media, PDF/native modules and Android/iOS store builds together. EAS Node versions must also be raised from the pinned 20.12 runtime to the minimum required by the selected Expo release.

Next.js remains on 15.5.22. Its nested `postcss@8.4.31` and `sharp@0.34.5` pins are still the only Web audit findings; forcing root overrides remains unsupported.
