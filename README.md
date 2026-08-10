# L&S

*Вчись. Прогресуй. Повторюй.*

An educational web application for Ukrainian НМТ/ЗНО exam preparation, built
around measurable learning progress. The interface is Ukrainian throughout.

## Documentation

The full product, architecture, and design specification lives in [`/docs`](docs) and is the single source of truth for this project. Start with [`docs/README.md`](docs/README.md).

## Structure

```text
.
├── docs/       # Product, architecture, and design documentation
├── backend/    # NestJS API
├── frontend/   # React + Vite application
└── docker-compose.yml
```

## Running Locally

### With Docker

```bash
docker compose up --build
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- Backend health check: [http://localhost:3000/health](http://localhost:3000/health)

### Without Docker

See [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md) for running each app directly against a local PostgreSQL instance.

### Seeding content

```bash
cd backend && npm run prisma:seed
```

The seed is idempotent and keyed on natural identifiers, so it can be re-run
safely; it never deletes a question. It currently loads 4 subjects, 76 topics
and 3308 questions.

## Testing

```bash
cd backend && npm run test:e2e   # 518 tests across 20 suites; needs Postgres running
```

Rate limiting is disabled in the test environment so that the suite is not
throttled for running quickly; `test/throttling.e2e-spec.ts` switches it back
on to cover the limiter itself.

## Deployment

The API deploys to Render from [`backend/render.yaml`](backend/render.yaml)
and the frontend to Vercel from [`frontend/vercel.json`](frontend/vercel.json).
Read [`docs/08-development/deployment.md`](docs/08-development/deployment.md)
§17 first — the order of operations matters, and two settings (`TRUST_PROXY`
and `VITE_API_URL`) fail quietly if they are wrong.

## Stack

React · TypeScript · Vite · Tailwind CSS · NestJS · PostgreSQL · Prisma ORM · Docker

## Status

Content and interface complete for the four launch subjects; preparing for
first deployment. See [`docs/08-development/roadmap.md`](docs/08-development/roadmap.md)
for the full implementation roadmap.
