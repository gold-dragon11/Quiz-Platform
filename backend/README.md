# L&S — Backend

NestJS API for L&S. [`/docs`](../docs) is the specification this codebase
follows: the domain model in [`docs/02-domain`](../docs/02-domain), the API
contracts in [`docs/04-api`](../docs/04-api), and the layering in
[`docs/06-backend/architecture.md`](../docs/06-backend/architecture.md) —
Controller → Service → Repository → Database.

## Stack

Node 22 · NestJS · TypeScript · PostgreSQL 16 · Prisma ORM · Passport JWT ·
Argon2 · Resend

## Getting started

```bash
cp .env.example .env     # every variable is documented there
npm install
npx prisma migrate deploy
npm run prisma:seed      # about a minute from cold
npm run start:dev
```

The API listens on `http://localhost:3000`. Every route is prefixed `/api/v1`
except the health check. A local PostgreSQL is expected on `5433` — the
repository's `docker-compose.yml` publishes one there.

Two variables decide how much of the system is live locally: leaving
`RESEND_API_KEY` empty logs verification and reset links to the console instead
of sending mail, and `THROTTLE_ENABLED` switches the rate limiter, which is on
everywhere except the test environment.

## Scripts

| Script | Purpose |
| - | - |
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` / `lint:check` | Lint, with and without autofix |
| `npm run format` / `format:check` | Prettier, with and without writing |
| `npm test` | Unit tests (67) |
| `npm run test:e2e` | End-to-end tests (858 across 37 suites) |
| `npm run prisma:seed` | Load the content into the database |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:migrate:dev` | Create and apply a migration in development |
| `npm run prisma:studio` | Browse the database |

## Tests

Unit tests sit beside the code they cover. The end-to-end suite runs the real
application against a real database and a real HTTP server — it needs
PostgreSQL migrated and seeded first, and it is where authentication, the quiz
engine, the teacher side, NMT scoring and the scheduled sweep are actually
verified.

The rate limiter is disabled in the test environment, because five hundred
requests from one address would trip it for reasons unrelated to what each test
asserts; `test/throttling.e2e-spec.ts` arms it again to cover the limiter
itself.

## Structure

```text
src/
├── auth/                  # Registration, login, refresh, email verification, password reset
├── users/                 # Accounts, profiles, avatars, the public profile
├── quiz/                  # The engine: sessions, answers, scoring, NMT papers, mistake ladder
├── quizzes/               # Stored quiz configurations
├── questions/             # Question bank, public and teacher-facing
├── question-reports/      # Reports on a faulty question
├── subjects/ topics/      # Catalogue administration
├── catalogue/             # The public catalogue the landing page reads
├── learning-materials/    # One material per topic
├── groups/ assignments/   # The teacher side: groups, homework, review
├── duels/                 # Asynchronous duels
├── statistics/            # XP, levels, per-subject and per-topic figures
├── notifications/ email/  # Assignment mail and its delivery
├── jobs/                  # The hourly sweep, called by an external scheduler
├── settings/ health/      # Account settings, health check
├── common/ config/ prisma/# Guards, filters, throttling, configuration, Prisma provider
├── app.module.ts
└── main.ts
```

## Content

Questions, topics and learning materials are files under
[`prisma/seed/content`](prisma/seed/content), loaded by an idempotent seed that
identifies a question by `(topic, title)`: it updates in place and never
deletes. Renaming a question's stem therefore creates a second question — see
[`docs/08-development/deployment.md`](../docs/08-development/deployment.md)
§17.1a and the repair script `prisma/scripts/sync-retitled-questions.ts`.

Three tools guard the content, and CI runs the first two on every push:

- `prisma/lint-content.ts` — authoring quality: stray keys, leftover notes,
  mixed scripts, duplicated examples;
- `prisma/scripts/audit/audit_nmt.py` — structure of the NMT-format bank;
- `prisma/verify-seed.ts` — a read-only report against a seeded database:
  publication chain, per-type answer invariants, and whether the content is
  actually quizzable.

## Health check

```http
GET /health
```

Reports application status and database connectivity, and is exempt from rate
limiting so a frequent probe can never be rejected as abuse. Render uses it to
decide whether a deploy is live.
