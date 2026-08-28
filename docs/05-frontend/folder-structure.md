# Frontend Folder Structure

**Document Version:** 1.1  
**Status:** Draft  
**Last Updated:** July 2026

> **Phase 6.1 update (folder ownership, decision F1):** the top-level `hooks/`,
> `types/`, and `constants/` folders were removed to avoid duplicating
> `shared/`. Those concerns now live exclusively under `shared/hooks/`,
> `shared/types/`, and `shared/constants/` (route constants are
> `shared/constants/routes.ts`). A top-level `stores/` folder was added for
> Zustand client-state stores. Sections 8, 12, 13, and the tree in section 2
> reflect this.

---

# 1. Purpose

This document defines the folder structure of the Quiz Platform frontend.

The project follows a feature-first architecture to improve scalability, maintainability, and developer experience.

Folders should represent business features rather than file types whenever possible.

---

# 2. Project Structure

```text
src/

├── app/
├── assets/
├── features/
├── shared/
├── pages/
├── lib/
├── services/
├── stores/
├── styles/
├── config/
└── main.tsx
```

---

# 3. app/

Responsible for application initialization.

Contains:

- App.tsx
- Providers
- Router
- Global Layout
- Application bootstrap

This folder should remain small.

---

# 4. assets/

Stores static resources.

Examples:

- images
- icons
- illustrations
- fonts

No business logic belongs here.

---

# 5. features/

Contains all business functionality.

Each feature is isolated.

Example:

```text
features/

authentication/

dashboard/

quiz/

learning-materials/

statistics/

profile/

settings/

admin/
```

Each feature owns its own:

- components
- hooks
- services
- API calls
- validation
- types

Features should not depend directly on each other.

---

# 6. shared/

Contains reusable application resources.

Example structure:

```text
shared/

components/

ui/

icons/

layouts/

hooks/

utils/

constants/

types/
```

Shared should never contain business logic.

---

# 7. pages/

Contains route-level pages.

Examples:

```text
pages/

Home

Dashboard

Quiz

Statistics

Profile

Settings

Admin
```

Pages compose features.

Pages should contain minimal logic.

---

# 8. shared/hooks/ (formerly top-level hooks/)

Reusable application hooks. As of Phase 6.1 (decision F1) these live under
`shared/hooks/` — there is no top-level `hooks/` folder.

Examples:

- useDebounce
- useLocalStorage
- useMediaQuery
- useCurrentUser (the authenticated session summary from `/auth/me`)

Business-specific hooks belong inside Features.

---

# 9. lib/

Contains reusable libraries and helper modules.

Examples:

- API client
- Axios configuration
- Query Client
- Markdown utilities
- Math helpers

General-purpose functionality belongs here.

---

# 10. services/

Contains application-wide services.

Examples:

- Authentication Service
- Storage Service
- Notification Service
- Theme Service

Feature-specific services belong inside Features.

---

# 11. styles/

Contains global styles.

Examples:

- globals.css
- tailwind.css
- variables.css

Component styles should remain local whenever possible.

---

# 12. shared/types/ (formerly top-level types/)

Shared TypeScript types. As of Phase 6.1 (decision F1) these live under
`shared/types/` — there is no top-level `types/` folder.

Examples:

- API models (`ApiError`, `Paginated<T>`, `TokenPair`)
- backend-mirrored enums (const-object + string-literal unions)
- shared interfaces and utility types

Feature-specific types belong inside Features.

---

# 13. shared/constants/ (formerly top-level constants/)

Application constants. As of Phase 6.1 (decision F1) these live under
`shared/constants/` — there is no top-level `constants/` folder.

Examples:

- routes (`shared/constants/routes.ts`)
- motion presets — durations, easings, variants (`shared/constants/motion.ts`)
- application limits

Business constants should live inside Features.

---

# 13a. stores/

Global Zustand client-state stores (Phase 6.1, decision F9). Server state is
never duplicated here — it belongs to TanStack Query.

Examples:

- `auth-store` — auth status + in-memory access token only (never the user)
- `theme-store` — theme preference (dark-only MVP, future-proofed)
- `toast-store` — the in-house toast channel
- `ui-store` — transient UI state (e.g. mobile-nav open)

Feature-specific stores belong inside Features.

---

# 14. config/

Contains application configuration.

Examples:

- environment variables
- API endpoints
- feature flags

Configuration should remain centralized.

---

# 15. Typical Feature Structure

Each feature follows the same internal structure.

Example:

```text
quiz/

components/

hooks/

services/

api/

types/

utils/

validation/

index.ts
```

This structure should remain consistent across all features.

---

# 16. Import Rules

Dependencies should flow inward.

Preferred imports:

```text
Page

↓

Feature

↓

Shared
```

Shared must never import Features.

Circular dependencies are prohibited.

---

# 17. Naming Conventions

Folders:

- lowercase
- kebab-case

Components:

- PascalCase

Hooks:

- useCamelCase

Utilities:

- camelCase

Files should have descriptive names.

---

# 18. Future Growth

The structure should support future additions, including:

- mobile components;
- AI features;
- collaborative learning;
- achievements;
- notifications.

New features should integrate without restructuring existing folders.

---

# 19. Success Criteria

The folder structure is considered successful if it:

- remains easy to navigate;
- scales with application growth;
- minimizes coupling;
- encourages code reuse;
- clearly separates business features from shared resources.