# Frontend Routing

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the routing architecture of the Quiz Platform frontend.

The routing system is responsible for navigation, access control, layout selection, and route organization.

Routing is implemented using React Router.

---

# 2. Design Principles

The routing system follows these principles:

- Feature-oriented organization
- Predictable URL structure
- Protected routes
- Lazy-loaded pages
- Consistent layouts

Every route should have a single responsibility.

---

# 3. Routing Overview

The application is divided into three route groups:

- Public Routes
- Authenticated Routes
- Administrator Routes

Each group uses appropriate access control.

---

# 4. Public Routes

Public pages are accessible without authentication.

| Route | Purpose |
|---------|---------|
| `/` | Landing page |
| `/login` | User login |
| `/register` | Account registration |
| `/forgot-password` | Password recovery |
| `/reset-password` | Password reset |
| `/verify-email` | Email verification |
| `/u/:username` | Public profile page |
| `/404` | Not Found page |

---

# 5. Authenticated Routes

Authenticated routes require a valid access token.

| Route | Purpose |
|---------|---------|
| `/dashboard` | User dashboard |
| `/quiz` | Quiz selection |
| `/quiz/:sessionId` | Active quiz session |
| `/quiz/:sessionId/result` | Quiz results |
| `/statistics` | Learning statistics |
| `/profile` | User profile |
| `/settings` | User settings |

Unauthenticated users are redirected to:

```text
/login
```

---

# 6. Administrator Routes

Administrator routes require admin permissions.

| Route | Purpose |
|---------|---------|
| `/admin` | Admin dashboard |
| `/admin/subjects` | Subject management |
| `/admin/topics` | Topic management |
| `/admin/quizzes` | Quiz template management |
| `/admin/questions` | Question management |
| `/admin/questions/new` | Create question |
| `/admin/questions/:id/edit` | Edit question |

Users without administrator permissions receive:

```text
403 Forbidden
```

---

# 7. Nested Routing

Nested routes should be used where appropriate.

Example:

```text
/admin
    ├── subjects
    ├── topics
    ├── questions
    └── settings
```

Nested layouts should avoid duplication.

---

# 8. Route Guards

The application supports multiple guard types.

## Authentication Guard

Protects authenticated routes.

---

## Guest Guard

Prevents authenticated users from accessing:

- login
- register

Authenticated users are redirected to:

```text
/dashboard
```

---

## Admin Guard

Restricts administrator routes.

Only users with administrative privileges may access protected admin pages.

---

# 9. Lazy Loading

All page-level components should be lazy loaded.

Examples:

- Dashboard
- Statistics
- Quiz
- Settings
- Admin

This reduces the initial bundle size.

---

# 10. Layouts

The application supports multiple layouts.

## Public Layout

Used for:

- login
- register
- password recovery

---

## Main Layout

Used for authenticated pages.

Contains:

- navigation;
- header;
- content area.

---

## Admin Layout

Used for administrative pages.

Contains:

- admin navigation;
- content area.

---

# 11. Navigation

Navigation should remain predictable.

Users should always understand:

- where they are;
- how they arrived;
- how to return.

Active routes should be visually highlighted.

---

# 12. Error Pages

The router should support dedicated pages for:

- 404 Not Found
- 403 Forbidden
- 500 Internal Error (future)

These pages should follow the application's design system.

---

# 13. Scroll Behavior

Page navigation should restore scroll position appropriately.

Recommended behavior:

- new page → scroll to top;
- browser back → restore previous position.

---

# 14. Future Routes

Future features may introduce additional routes.

Examples:

- `/leaderboard`
- `/achievements`
- `/learning-materials`
- `/notifications`
- `/study-plan`

The routing structure should support future expansion without breaking existing URLs.

---

# 15. Success Criteria

The routing architecture is considered successful if it:

- provides predictable navigation;
- protects restricted pages;
- supports lazy loading;
- scales with application growth;
- remains easy to maintain.