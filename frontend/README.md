# Quiz Platform — Frontend

React + Vite frontend for the Quiz Platform. See [`/docs`](../docs) for the full architecture, PRD, and design system — this codebase follows those documents exactly.

## Stack

React · TypeScript · Vite · Tailwind CSS · React Router · TanStack Query · Zustand · React Hook Form · Zod · Framer Motion

## Getting Started

```bash
cp .env.example .env
npm install
npm run dev
```

The app runs at `http://localhost:5173` and expects the backend API at the URL configured in `VITE_API_URL`.

## Scripts

| Script | Purpose |
| - | - |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint and autofix |
| `npm run format` | Format with Prettier |

## Project Structure

Feature-first architecture per [`docs/05-frontend/folder-structure.md`](../docs/05-frontend/folder-structure.md):

```text
src/
├── app/          # App shell: providers, router, bootstrap
├── features/     # Business functionality (added feature by feature)
├── shared/       # Reusable components, layouts, hooks — no business logic
├── pages/        # Route-level pages (composed from features)
├── lib/          # API client, query client
├── stores/       # Global Zustand stores
├── styles/       # Global styles and design tokens
├── constants/    # Route paths and other app-wide constants
└── config/       # Environment variable access
```

Routing currently renders a placeholder for every documented route (see [`docs/05-frontend/routing.md`](../docs/05-frontend/routing.md)); pages and Route Guards are added alongside the features that need them, per [`docs/08-development/roadmap.md`](../docs/08-development/roadmap.md).
