# L&S — Frontend

React application for L&S. [`/docs`](../docs) is the specification this
codebase follows: architecture in
[`docs/05-frontend`](../docs/05-frontend), the design system in
[`docs/07-design`](../docs/07-design), and the API contracts in
[`docs/04-api`](../docs/04-api).

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · React Router · TanStack Query ·
Zustand · React Hook Form + Zod · Framer Motion · vite-plugin-pwa · Vitest +
Testing Library + MSW

## Getting started

```bash
cp .env.example .env
npm install
npm run dev
```

The app runs at `http://localhost:5173` and calls the API at `VITE_API_URL`
(`http://localhost:3000/api/v1` by default). Vite inlines that value at build
time, so changing it requires a rebuild rather than a restart.

## Scripts

| Script | Purpose |
| - | - |
| `npm run dev` | Start the dev server |
| `npm run build` | `tsc -b` then `vite build` — type errors fail the build |
| `npm run preview` | Serve the production build locally |
| `npm test` / `test:watch` | Component tests (116), once or in watch mode |
| `npm run lint` / `lint:check` | Lint, with and without autofix |
| `npm run format` / `format:check` | Prettier, with and without writing |

## Tests

Vitest and Testing Library over jsdom, with the API mocked at the network
boundary by MSW — the components are never stubbed, so a test exercises the
real Axios client, its interceptors and the query cache. Tests live beside what
they cover; `src/test/` holds only the shared setup and the render helper. See
[`docs/05-frontend/architecture.md`](../docs/05-frontend/architecture.md) §15.

What the 116 tests hold: the API client (the token on every request, one
refresh behind a burst of 401s, the session restored on a cold start and given
up when the cookie is stale), the way in
(registration, login, password recovery) and the gates behind it, and the
screens where a wrong state costs a learner something — an unfinished session
blocking a new one, homework that is not open yet, a mock paper on its clock,
a duel score revealed too early, and the demo account being read-only. Plus
the theme: that a chosen one reaches the document, that «як у системі» follows
the machine as it changes, and that the landing keeps its own. And what being
installable changed: saying «no connection» instead of showing skeletons that
will never fill, offering an update rather than swapping the build underneath
someone, and not mistaking a lift for a logout.

## Structure

Feature-first, per
[`docs/05-frontend/folder-structure.md`](../docs/05-frontend/folder-structure.md):

```text
src/
├── app/          # Providers, router, bootstrap
├── features/     # One folder per feature: api, hooks, components, pages, types
├── shared/       # UI kit, layouts, guards, hooks, constants — no business logic
├── pages/        # Error and placeholder pages
├── lib/          # Axios client and query client
├── services/     # Auth service and the local session hint
├── stores/       # Zustand stores: auth, theme, toasts
├── styles/       # Design tokens and global styles
├── config/       # The only module that reads import.meta.env
├── test/         # jsdom setup, MSW server, render helper
└── main.tsx
```

Features: `landing`, `auth`, `dashboard`, `quiz`, `mock-exam`,
`mistake-review`, `duels`, `subjects`, `learning-materials`, `statistics`,
`groups`, `assignments`, `question-bank`, `question-reports`, `admin`, `user`.

It installs. A reader adds it from the browser's own menu and it opens from
its own cache, with its own icon, without an address bar — see
[`docs/05-frontend/pwa.md`](../docs/05-frontend/pwa.md). The API is never
cached: a page of someone's statistics should not outlive the session that
fetched it on a shared phone.

The session outlives the app being closed. The refresh token is an HttpOnly
cookie the page cannot read, rotated on every renewal, seven days sliding — so
opening the app at least once a week means never signing in again, and a
cross-site scripting flaw still cannot lift the session
([`docs/04-api/authentication.md`](../docs/04-api/authentication.md) §6.1).

Two rules hold the layering. A feature is imported only through its barrel
(`features/<name>/index.ts`). And `lib/api-client.ts` owns Axios —
authentication, token refresh and error normalisation live there and nowhere
else; the one exception is the landing page's catalogue call, which uses a bare
client on purpose, because the shared one would answer a public page's failed
request by sending an anonymous visitor to the login form.
