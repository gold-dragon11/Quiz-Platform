# Claude Development Guide

**Document Version:** 1.0  
**Status:** Living Document  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines how Claude Code should contribute to the Quiz Platform.

The goal is to ensure that every generated feature follows the project's architecture, coding standards, design system, and documentation.

Claude should prioritize maintainability and consistency over speed.

---

# 2. Project Overview

Quiz Platform is a modern educational web application.

Technology stack:

- React
- TypeScript
- Tailwind CSS
- Framer Motion
- TanStack Query
- Zustand
- NestJS
- Prisma
- PostgreSQL

The project follows a modular architecture.

---

# 3. Primary Objective

Claude should generate production-quality code.

Every implementation should be:

- readable;
- modular;
- testable;
- scalable;
- consistent.

Avoid shortcuts that compromise long-term maintainability.

---

# 4. Documentation First

Before implementing any feature, Claude should review the relevant documentation.

Priority order:

1. PRD
2. Domain documentation
3. API documentation
4. Frontend architecture
5. Backend architecture
6. Design system

If documentation and implementation conflict, documentation takes precedence.

---

# 5. Architecture Rules

Claude must follow the documented architecture.

Requirements:

- Feature-first frontend
- Modular backend
- Clean Architecture principles
- Separation of concerns
- Dependency Injection
- Reusable components

Architectural decisions should not be changed without approval.

---

# 6. Frontend Rules

Frontend implementations should:

- use TypeScript;
- use React functional components;
- follow the routing architecture;
- use TanStack Query for server state;
- use Zustand only for client state;
- reuse shared UI components;
- follow the design system.

Avoid unnecessary component complexity.

---

# 7. Backend Rules

Backend implementations should:

- use NestJS modules;
- keep controllers thin;
- place business logic inside services;
- use repositories for database access;
- validate all incoming data;
- follow REST API conventions.

Controllers should never contain business logic.

---

# 8. Design Rules

Every UI implementation should follow:

- Colors documentation
- Typography documentation
- Spacing documentation
- Motion documentation
- Components documentation

Hardcoded styles should be avoided whenever possible.

---

# 9. Code Quality

Generated code should:

- be strongly typed;
- avoid duplication;
- use meaningful names;
- include comments only when necessary;
- prioritize readability.

Code should feel production-ready.

---

# 10. Error Handling

Claude should:

- anticipate failure cases;
- handle edge cases;
- provide meaningful error messages;
- avoid exposing internal details.

Every feature should gracefully handle unexpected situations.

---

# 11. API Integration

Frontend API communication should:

- use centralized API clients;
- use TanStack Query;
- avoid duplicate requests;
- invalidate caches correctly.

Manual fetch logic should be minimized.

---

# 12. Component Development

Components should:

- remain small;
- have a single responsibility;
- be reusable;
- avoid business logic.

Business logic belongs in hooks or services.

---

# 13. Security

Generated code should follow the documented security strategy.

Examples include:

- input validation;
- secure authentication;
- proper authorization;
- secure token handling.

Security should never be treated as optional.

---

# 14. Performance

Claude should prioritize:

- lazy loading;
- efficient rendering;
- query caching;
- code splitting;
- optimized bundle size.

Performance optimizations should not reduce code clarity.

---

# 15. Refactoring

If existing code can be improved:

- preserve behavior;
- improve readability;
- reduce duplication;
- maintain compatibility.

Refactoring should not introduce unnecessary architectural changes.

---

# 16. Testing Mindset

Generated code should be testable.

Functions should:

- have predictable inputs;
- produce predictable outputs;
- avoid hidden side effects.

Business logic should remain easy to unit test.

---

# 17. Communication Style

When implementing features, Claude should:

- explain architectural decisions when relevant;
- identify potential issues;
- suggest improvements when appropriate;
- ask for clarification if requirements are ambiguous.

Assumptions should be minimized.

---

# 18. Future Development

Claude should implement features with future scalability in mind.

The codebase should support:

- additional quiz types;
- AI features;
- mobile applications;
- larger datasets;
- future integrations.

Scalability should not unnecessarily complicate the MVP.

---

# 19. Success Criteria

Claude is considered successful if it consistently generates code that:

- follows the documented architecture;
- respects the design system;
- matches the project documentation;
- remains maintainable;
- is ready for production-quality development.