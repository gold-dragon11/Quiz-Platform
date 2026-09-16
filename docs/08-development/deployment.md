# Deployment

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the deployment strategy for the Quiz Platform.

The deployment process should be automated, repeatable, secure, and consistent across all environments.

---

# 2. Deployment Goals

The deployment process should:

- be reliable;
- minimize downtime;
- support rapid releases;
- enable easy rollback;
- remain environment-independent.

Deployment should require minimal manual intervention.

---

# 3. Environments

The application supports multiple environments.

## Development

Used for local development.

Characteristics:

- local database;
- debugging enabled;
- development configuration.

---

## Staging

Used for testing before production.

Characteristics:

- production-like environment;
- test database;
- feature verification.

---

## Production

Used by end users.

Characteristics:

- optimized build;
- HTTPS enabled;
- monitoring enabled;
- automated backups.

---

# 4. Application Components

The deployed application consists of:

- Frontend
- Backend
- PostgreSQL Database

Each component should be independently deployable.

---

# 5. Build Process

Deployment should perform the following steps:

1. Install dependencies.
2. Run linting.
3. Execute automated tests.
4. Build the application.
5. Apply database migrations.
6. Deploy the new version.
7. Verify application health.

Deployment should stop immediately if any critical step fails.

---

# 6. Environment Variables

Environment-specific configuration should be stored outside the codebase.

Examples include:

- Database URL
- JWT Secret
- Email credentials
- API keys
- Frontend API URL

Secrets must never be committed to version control.

---

# 7. Database Migrations

Database schema changes should be managed using Prisma Migrations.

Deployment sequence:

1. Backup database.
2. Apply migrations.
3. Verify schema.
4. Start application.

Migrations should be version-controlled.

---

# 8. Static Assets

Frontend assets should be optimized during the build process.

Optimizations include:

- code splitting;
- asset hashing;
- compression;
- cache-friendly filenames.

Static assets should be served efficiently.

---

# 9. HTTPS

Production deployments must use HTTPS.

All traffic should be encrypted.

HTTP requests should redirect to HTTPS.

---

# 10. Logging

Production deployments should provide centralized logging.

Logs should include:

- application startup;
- incoming requests;
- errors;
- deployment events.

Sensitive information must never be logged.

---

# 11. Monitoring

Production monitoring should include:

- application availability;
- response times;
- error rates;
- resource usage.

Monitoring should support early detection of issues.

---

# 12. Health Checks

The backend should expose a health endpoint.

Example:

```text
GET /health
```

The endpoint should verify:

- application status;
- database connectivity.

Health checks support automated deployment verification.

---

# 13. Backup Strategy

Production databases should be backed up automatically.

In production this is Neon: point-in-time restore within the plan's history
window, and a branch taken by hand before every release that migrates or
seeds (§17.6).

Backups should:

- run on a regular schedule;
- be securely stored;
- be periodically tested for recovery.

---

# 14. Rollback Strategy

Deployment failures should support rollback.

Rollback should restore:

- previous application version;
- previous database state when necessary.

Rollback procedures should be documented and tested.

For the actual target: roll the API back to the previous deploy on Render, and
restore the database from the branch taken before the release (§17.6).

---

# 15. Security

Deployment should enforce:

- HTTPS;
- secure environment variables;
- least-privilege access;
- dependency verification.

Only authorized personnel should have deployment access.

---

# 16. CI/CD

The deployment pipeline should support continuous integration and deployment.

Recommended pipeline:

1. Code Push
2. Lint
3. Tests
4. Build
5. Deploy
6. Health Check

Manual deployments should be minimized.

In this repository the pipeline is `.github/workflows/ci.yml`, run by GitHub
Actions on every push to `main` and every pull request. It has two jobs:

- **backend** — lint, Prettier, the NMT content audit and the content linter,
  the production build, unit tests, then against a throwaway PostgreSQL 16:
  migrations, a full seed (which also validates every topic file) and the
  end-to-end suite;
- **frontend** — lint, Prettier, the component tests (Vitest and Testing
  Library over jsdom, with the API mocked at the network boundary by MSW), and
  `tsc -b && vite build`.

Render and Vercel deploy `main` independently of it, the moment it changes. CI
does not gate those deploys by itself: the protection is to merge only through
a pull request whose checks are green. `main` has a ruleset (GitHub → Settings
→ Rules → Rulesets) that requires a pull request and both CI checks, and blocks
force pushes and deletion.

A second workflow, `.github/workflows/hourly.yml`, is not a check: it runs on a
schedule and calls the production API (§17.7).

---

# 17. Target Deployment (Render + Vercel + Neon)

Sections 1–16 describe deployment in principle. This section describes the
actual target and the configuration committed for it.

| Component | Host | Configuration |
| --- | --- | --- |
| API | Render (Docker) | `backend/render.yaml` |
| Database | Neon PostgreSQL | project `L&S`, branch `production` — see §17.6 |
| Frontend | Vercel | `frontend/vercel.json` |

The blueprint in `backend/render.yaml` still declares a Render PostgreSQL
database (`quix-postgres`) and wires `DATABASE_URL` to it. Production does not
use it: the live data is on Neon, and `DATABASE_URL` is set by hand on the
Render service.

## 17.1 Order of Operations

### First deployment

The order matters, because later steps depend on results from earlier ones.

1. **Register the domain and verify it in Resend.** Resend requires SPF and
   DKIM records on the domain before it will deliver, so the domain must exist
   first. Until the domain is verified, Resend rejects delivery to any address
   outside the account owner's.
2. **Create the database on Neon** and set `DATABASE_URL` on the Render service
   to its connection string (§17.6).
3. **Deploy the API to Render**, and confirm `/health` returns 200.
4. **Deploy the frontend to Vercel** with `VITE_API_URL` set to the live API.
   Vite inlines environment variables at build time, so this must be set
   before the first build and a change to it requires a rebuild, not a
   restart.
5. **Set `CORS_ORIGIN` and `FRONTEND_URL` on Render** to the frontend's final
   domain. These are the two values that cannot be known until step 4.
6. **Seed the production database once**, from a checkout, against the direct
   connection string (§17.6). Migrations run automatically on boot; seeding
   does not, so without this step the platform deploys with no subjects at all.

### A release

What a release that changes the schema or the content looks like — the way
`feat/nmt-format` went out on 14 September 2026.

1. **Take a Neon branch of `production`** (§17.6) with auto-delete off. It is
   the rollback point for everything below.
2. **Merge into `main`.** Render and Vercel both deploy `main` automatically.
   The API container runs `prisma migrate deploy` before it starts: its log
   must show `All migrations have been successfully applied.`, then
   `Nest application successfully started`. Confirm `/health`.
3. **Deploy before seeding, not after.** New content can carry question types
   the previous code cannot show; seeding first would put them in front of
   users on the old screens. The cost of this order is a window where content
   that depends on the new data is missing — a mock exam refuses with
   «бракує завдань» until the seed finishes.
4. **Repair retitled questions, then seed** (§17.1a), from a checkout of
   `main`, with `DATABASE_URL` set to the direct connection string. A full seed
   from a laptop takes about an hour: every statement crosses to us-east-2.
5. **Verify from outside.** `GET /api/v1/catalogue` is public and reads the
   production database: its `questionCount` per subject, and `totalQuestions`,
   must equal the published questions in a local database seeded from the same
   commit. It also shows the seed's progress while it runs.
6. **`unset DATABASE_URL`** in that terminal, and delete the Neon branch once
   production has run cleanly for a few days.

## 17.1a Retitled Questions

The seed identifies a question by `(topicId, title)`. That makes a rewritten
title a *different* question: the seed creates a new row and leaves the
original published beside it, so a database seeded before a retitling ends up
with both.

This has happened twice — the mathematics questions converted from Unicode to
LaTeX (docs/02-domain/question.md §10), and a handful of questions reworded by
the content audit (docs/09-content/question-audit.md). Together **587 titles**
changed since commit `870657b`, which production was seeded from before 14
September 2026. A database seeded at or before that commit must be repaired **before** it
is seeded again:

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' \
  prisma/scripts/sync-retitled-questions.ts --base 870657b            # dry run
npx ts-node --compiler-options '{"module":"CommonJS"}' \
  prisma/scripts/sync-retitled-questions.ts --base 870657b --write
```

Production has since been seeded from `6d59b7e` (14 September 2026), so that is
the base for the next production seed.

`--base` is the commit that database was last seeded from; the script reads the
old titles from it with `git show`, so it must run from a checkout of this
repository. Against a remote database, set `DATABASE_URL` for the command.

The script moves each question onto its current title and deletes the duplicate
the seed created, so question ids — and the QuestionAttempts, XP transactions
and statistics pointing at them — survive. It is idempotent, and it does
nothing at all on a database seeded after the retitle.

Two cases it deliberately does not decide on its own:

- **A duplicate that already has attempts** — someone answered the new row in
  the window between the seed and the repair. It is left alone and reported;
  the original then shows up as an orphan for a human to resolve.
- **Orphans** — questions in the database that no content file claims any more.
  They are always reported; `--prune-orphans` deletes the ones with no history.

Order matters. Repairing first, then seeding, is the clean path — the seed then
updates the moved rows in place (`0 created`). If the seed has already run and
created the duplicates, run the script and then **seed again**, so the rows it
moved pick up their new content.

Rehearsed against a copy of the pre-conversion database in all four cases:
repair-then-seed, seed-then-repair-then-seed, a database seeded only from the
current content (no-op), and a duplicate carrying an attempt. Each ended at
3 308 questions with no duplicate `(topicId, title)` pair and the attempt still
attached to its original question id.

## 17.2 Migrations

The container runs `prisma migrate deploy` before starting the server. This
replays committed migration files only — it never generates a migration and
never drops data, which is what makes it safe on every boot, and it is a no-op
once the database is current.

This assumes a single instance. A multi-instance deployment should move
migrations into a dedicated release step rather than racing them at boot.

## 17.3 Proxy Awareness

`TRUST_PROXY=1` is required on Render. Render terminates TLS one hop in front
of the container, so the real client address arrives in `X-Forwarded-For`.
Without this setting the rate limiter counts every request against the proxy's
address and throttles all users as though they were one client.

Never set it higher than the number of proxies that actually exist: each
trusted hop is one more header entry a client can forge.

## 17.4 Cold Starts

Render's free tier stops an instance after a period of inactivity, and the
next request pays roughly 50 seconds of start-up. Two consequences:

- the first visitor after a quiet period sees a long wait, which the frontend
  presents as a slow load rather than an error;
- the token refresh flow inherits that delay, so a session resumed after
  inactivity can appear to hang before it succeeds.

A paid instance removes both. Before a live demonstration, send one request a
few minutes ahead to wake the service.

## 17.5 Secrets

Signing secrets are declared with `generateValue: true`, so Render generates
each one and no secret is committed. `CORS_ORIGIN`, `FRONTEND_URL`,
`RESEND_API_KEY`, `EMAIL_FROM` and `CRON_SECRET` use `sync: false`, which makes
Render prompt for them once and store them itself. `CRON_SECRET` is not
generated because the same value has to be copied into GitHub (§17.7).

`DATABASE_URL` is the exception to the blueprint: it is set by hand on the Render
service to the Neon connection string, and never written to a file in the
repository. The same holds on a laptop — `export` it for one terminal session,
and `unset` it when done, or the next Prisma command there reaches production.

`JWT_ACCESS_SECRET` also keys the deal of ordering and matching options
(`src/quiz/option-deal.util.ts`). Rotating it invalidates current access
tokens — clients renew them with the refresh token, which has its own secret —
and reorders the options of questions in unfinished sessions; answers are
stored by option id, so nothing is lost.

Rotate any key that has ever been committed or shared, regardless of whether
the exposure is believed to be contained.

## 17.6 Database (Neon)

The production database is a Neon project named `L&S`, branch `production`, in
AWS us-east-2 (Ohio). The API runs in Render's Frankfurt region, so every query
crosses the Atlantic — unnoticeable per request, but the reason a full seed of
5 399 questions from a laptop takes about an hour.

**Two connection strings.** Neon's Connect dialog offers a pooled string (the
host ends in `-pooler`, PgBouncer in transaction mode) and a direct one. Use the
**direct** string for anything that runs many statements in one go — the seed,
`sync-retitled-questions.ts`, a migration run by hand. Transaction pooling does
not keep prepared statements between transactions, and a long Prisma run
through it can fail midway. Both need `sslmode=require`.

**Branches are the backup.** Before a release that migrates or seeds, create a
branch of `production` (Branches → New branch, «Branch data and schema», auto-
delete off). It costs nothing until `production` diverges from it. To roll back,
point `DATABASE_URL` on Render at the branch, or restore `production` from it in
the Neon console. Delete it once the release has proved itself.

**Free plan.** Storage is capped at 0.5 GB; the database was about 40 MB before
the September 2026 seed. Compute scales to zero when idle, so the first query
after a quiet period pays a start-up delay on top of Render's own cold start
(§17.4).

## 17.7 Scheduled Jobs

The API keeps no clock of its own: on Render's free tier the process is stopped
between requests, and a timer inside a stopped process never fires. GitHub
Actions calls it from outside instead. `.github/workflows/hourly.yml` runs at
minute 17 of every hour and sends

```http
POST /api/v1/jobs/hourly
Authorization: Bearer <CRON_SECRET>
```

One run does four independent things:

| Step | What it does | Without the schedule |
| --- | --- | --- |
| Expired timers | Completes and scores timed sessions whose clock ran out | Waits until the owner opens the session |
| Abandoned sessions | Closes untimed sessions with no answer saved for 7 days, without a result (decision 23) | The session holds the owner's slot indefinitely |
| Deadline reminders | Emails recipients whose deadline is within 24 hours and who have not handed in (decision 25) | Only `POST /admin/notifications/due-reminders`, by hand |
| Stale duels | Marks challenges nobody answered as expired | Waits until someone lists their duels |

Every step is idempotent — a reminder is claimed in `email_dispatches` before it
is sent, and a session can leave `ACTIVE` only once — so a late, repeated or
manual run is harmless. One failing step does not stop the others; the request
then answers 500, the workflow run turns red, and the API log names the step.
The response reports what was done:
`{ sessionsCompleted, sessionsAbandoned, remindersSent, duelsExpired }`.

**Setup.**

1. Generate a secret: `openssl rand -base64 48`.
2. Render → the API service → Environment → `CRON_SECRET` = that value. The
   service restarts.
3. GitHub → Settings → Secrets and variables → Actions:
   - **Secrets** → `CRON_SECRET` = the same value;
   - **Variables** → `API_URL` = `https://api.learn-ls.com`.
4. Actions → «Hourly jobs» → Run workflow, and check that the run is green.

Without `CRON_SECRET` on the API the route answers 404, and without `API_URL`
in GitHub the workflow skips itself, so a fork or a local setup has neither
the endpoint nor a failing schedule.

**Limits of GitHub's schedule.** Scheduled runs can start late, by minutes or
more under load, and are occasionally dropped; the windows involved — 24 hours,
7 days — make that irrelevant. GitHub disables schedules in a repository with
no activity for 60 days; re-enable the workflow on the Actions tab. An hourly
request does not keep the instance awake: Render stops it after 15 idle
minutes, so each run usually pays a cold start, which the workflow's 90-second
timeout and retries allow for.


## 17.8 Error Reporting

Both applications report errors to Sentry, each to its own project, and each
does nothing at all without a DSN — locally, in CI and in every test the SDK
never initialises.

| Where | Variable | Set on |
| --- | --- | --- |
| API | `SENTRY_DSN` | Render (`sync: false` in the blueprint) |
| Frontend | `VITE_SENTRY_DSN` | Vercel, Production environment |

Vite inlines its variable at build time, so changing the frontend DSN requires
a redeploy rather than a restart.

**What is reported.** On the API, only responses of 500 and above: a 400, 401,
403, 404 or 409 is the contract working, and reporting those would bury real
failures under refused logins. In the browser, render-time crashes caught by
the error boundary and the router's error element; a failed API call is not
reported twice, since the API reports its own.

**What is never sent.** Request bodies — the login form posts a password
through the same pipeline — headers, cookies and the user. `sendDefaultPii` is
off on both sides and `beforeSend` strips what remains (`backend/src/instrument.ts`,
`frontend/src/lib/sentry.ts`). Session replay and tracing are deliberately not
enabled: a recording of a school student's screen is not something this product
needs to hold, and tracing would spend the free plan's quota on timings nobody
is reading.

**Quota.** The free plan allows about 5 000 events a month. Identical errors
group into one issue but still count per event, so the alert rule is «a new
issue», not «every event».

`backend/src/instrument.ts` is imported before anything else in `main.ts`: the
SDK instruments modules as they load, and whatever is required before it stays
uninstrumented.

---

# 18. Future Improvements

Possible future enhancements include:

- blue-green deployments;
- zero-downtime deployments;
- automatic rollback;
- canary releases;
- infrastructure as code.

These features are outside the MVP.

---

# 19. Success Criteria

The deployment strategy is considered successful if it:

- enables reliable releases;
- minimizes downtime;
- protects production data;
- supports automated deployment;
- scales with future infrastructure needs.