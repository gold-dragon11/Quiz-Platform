# Quiz Platform

*Learn. Progress. Repeat.*

A modern educational web application focused on measurable learning progress through quizzes.

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

## Stack

React · TypeScript · Vite · Tailwind CSS · NestJS · PostgreSQL · Prisma ORM · Docker

## Status

**Phase 1 — Project Foundation.** See [`docs/08-development/roadmap.md`](docs/08-development/roadmap.md) for the full implementation roadmap.
