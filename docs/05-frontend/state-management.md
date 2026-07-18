# Frontend State Management

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the state management strategy for the Quiz Platform frontend.

The application separates server state from client state to ensure scalability, predictable data flow, and maintainable code.

State management follows modern React best practices.

---

# 2. Design Principles

The state management system follows these principles:

- Clear separation of concerns
- Single source of truth
- Minimal global state
- Predictable updates
- Efficient rendering

Only data that truly needs to be global should be stored globally.

---

# 3. State Categories

The application separates state into two major categories:

- Server State
- Client State

Each category has its own responsibility.

---

# 4. Server State

Server state is managed using:

- TanStack Query

Server state includes data received from the backend.

Examples:

- User profile
- Dashboard data
- Quiz sessions
- Quiz results
- Statistics
- Subjects
- Topics
- Questions

Server state should never be duplicated inside Zustand.

---

# 5. Client State

Client state is managed using:

- Zustand

Client state represents temporary UI information.

Examples:

- Current theme
- Sidebar visibility
- Modal state
- Selected language
- Notification visibility
- Mobile navigation state

Client state should not contain backend data.

---

# 6. Local Component State

Local component state should use:

```typescript
useState()
```

Examples include:

- Input values
- Form validation
- Dropdown state
- Accordion expansion
- Hover state
- Temporary UI interactions

Whenever possible, state should remain local.

---

# 7. Server State Lifecycle

Server state follows this lifecycle:

```text
Backend

↓

API Request

↓

TanStack Query

↓

Cache

↓

React Components
```

Components never communicate directly with the backend.

---

# 8. Query Caching

TanStack Query manages:

- request caching;
- background refetching;
- stale data handling;
- cache invalidation;
- retry logic.

Manual caching should be avoided.

---

# 9. Mutations

All data modifications use TanStack Query mutations.

Examples:

- Login
- Register
- Start Quiz
- Submit Answer
- Update Profile
- Save Settings

Successful mutations should invalidate affected queries.

---

# 10. Zustand Stores

Global client state should be divided into small stores.

Example:

```text
stores/

authStore

themeStore

uiStore

notificationStore
```

Large monolithic stores should be avoided.

---

# 11. Authentication State

Authentication state includes:

- access token
- authenticated status
- current user summary

Sensitive authentication data should never be stored in plain local storage.

---

# 12. Theme State

Theme state stores:

- dark mode
- future appearance preferences

Theme changes should persist between sessions.

---

# 13. UI State

Examples include:

- sidebar collapsed;
- open modal;
- active navigation;
- mobile menu;
- loading overlays.

UI state should remain lightweight.

---

# 14. Derived State

Whenever possible, derived values should be calculated instead of stored.

Examples:

- progress percentage;
- current level progress;
- completion rate;
- filtered lists.

Avoid duplicating information.

---

# 15. Persistence

Only selected client state should persist.

Examples:

- theme;
- language;
- sidebar preference.

Temporary UI state should not persist.

---

# 16. Error State

Errors should remain close to where they occur.

Examples:

- API errors
- Form validation
- Network failures

Global error state should be reserved for application-wide failures.

---

# 17. Performance

State management should minimize unnecessary renders.

Recommended techniques:

- selector functions;
- memoization where appropriate;
- shallow comparisons;
- query caching.

Global state should remain as small as possible.

---

# 18. Future Expansion

The architecture supports future additions including:

- offline synchronization;
- AI recommendations;
- collaborative learning;
- notifications;
- achievements.

Future features should integrate without changing the overall state strategy.

---

# 19. Success Criteria

The state management architecture is considered successful if it:

- clearly separates server and client state;
- minimizes unnecessary global state;
- provides predictable updates;
- scales with application growth;
- remains easy to understand and maintain.