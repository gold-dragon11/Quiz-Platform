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

---

# 17. Target Deployment (Render + Vercel)

Sections 1–16 describe deployment in principle. This section describes the
actual target and the configuration committed for it.

| Component | Host | Configuration |
| --- | --- | --- |
| API | Render (Docker) | `backend/render.yaml` |
| Database | Render PostgreSQL | declared in the same blueprint |
| Frontend | Vercel | `frontend/vercel.json` |

## 17.1 Order of Operations

The order matters, because two steps depend on results from earlier ones.

1. **Register the domain and verify it in Resend.** Resend requires SPF and
   DKIM records on the domain before it will deliver, so the domain must exist
   first. Until the domain is verified, Resend rejects delivery to any address
   outside the account owner's.
2. **Deploy the API to Render** from the blueprint, and confirm `/health`
   returns 200.
3. **Deploy the frontend to Vercel** with `VITE_API_URL` set to the live API.
   Vite inlines environment variables at build time, so this must be set
   before the first build and a change to it requires a rebuild, not a
   restart.
4. **Set `CORS_ORIGIN` and `FRONTEND_URL` on Render** to the frontend's final
   domain. These are the two values that cannot be known until step 3.
5. **Seed the production database once**: `npx prisma db seed`. Migrations run
   automatically on boot; seeding does not, so without this step the platform
   deploys with no subjects at all.

## 17.1a Retitled Questions

The seed identifies a question by `(topicId, title)`. That makes a rewritten
title a *different* question: the seed creates a new row and leaves the
original published beside it, so a database seeded before a retitling ends up
with both.

This has happened twice — the mathematics questions converted from Unicode to
LaTeX (docs/02-domain/question.md §10), and a handful of questions reworded by
the content audit (docs/09-content/question-audit.md). Together **587 titles**
changed since commit `870657b`, which is the last state production was seeded
from. A database seeded at or before that commit must be repaired **before** it
is seeded again:

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' \
  prisma/scripts/sync-retitled-questions.ts --base 870657b            # dry run
npx ts-node --compiler-options '{"module":"CommonJS"}' \
  prisma/scripts/sync-retitled-questions.ts --base 870657b --write
```

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
`RESEND_API_KEY` and `EMAIL_FROM` use `sync: false`, which makes Render prompt
for them once and store them itself.

Rotate any key that has ever been committed or shared, regardless of whether
the exposure is believed to be contained.

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