# Quiz Platform — Backend

NestJS backend for the Quiz Platform. See [`/docs`](../docs) for the full architecture, domain, database, and API specification — this codebase follows those documents exactly.

## Stack

Node.js · NestJS · TypeScript · PostgreSQL · Prisma ORM

## Getting Started

```bash
cp .env.example .env
npm install
npm run start:dev
```

The API listens on `http://localhost:3000`, with all routes prefixed `/api/v1` except the health check.

## Scripts

| Script | Purpose |
| - | - |
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` | Lint and autofix |
| `npm run format` | Format with Prettier |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:migrate:dev` | Create and apply a migration in development |

## Health Check

```http
GET /health
```

Returns application status and database connectivity. Used by Docker and deployment tooling to verify the service is ready.

## Project Structure

```text
src/
├── common/       # Cross-cutting infrastructure (filters, interceptors)
├── config/       # Configuration module and environment validation
├── health/       # Health check module
├── prisma/       # Prisma client provider
├── app.module.ts
└── main.ts
```

Business modules (Authentication, Users, Quiz, etc.) are added feature-by-feature per [`docs/08-development/roadmap.md`](../docs/08-development/roadmap.md), each following the layered structure defined in [`docs/06-backend/architecture.md`](../docs/06-backend/architecture.md): Controller → Service → Repository → Database.
