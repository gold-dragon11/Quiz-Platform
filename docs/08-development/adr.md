# Architecture Decision Records (ADR)

**Document Version:** 1.0  
**Status:** Living Document  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the Architecture Decision Record (ADR) process for the Quiz Platform.

Architecture decisions capture important technical choices together with their reasoning.

Each significant architectural decision should be documented before implementation.

---

# 2. Why ADRs

Architectural decisions often have long-term consequences.

Recording decisions helps:

- preserve project knowledge;
- explain technical choices;
- support future contributors;
- avoid repeating previous discussions;
- simplify maintenance.

---

# 3. When to Create an ADR

Create an ADR whenever a decision significantly affects the project.

Examples include:

- backend architecture;
- frontend architecture;
- database design;
- authentication strategy;
- API design;
- deployment strategy;
- state management;
- caching;
- third-party integrations.

Minor implementation details do not require ADRs.

---

# 4. ADR Lifecycle

Each ADR follows this lifecycle:

```text
Proposed

↓

Accepted

↓

Implemented

↓

Deprecated (optional)

↓

Superseded (optional)
```

Historical decisions should remain documented even if replaced.

---

# 5. ADR Naming

ADR files should follow this convention:

```text
ADR-001-backend-architecture.md
ADR-002-authentication-strategy.md
ADR-003-state-management.md
```

Numbers should be sequential.

Titles should remain concise and descriptive.

---

# 6. Required ADR Structure

Each ADR should contain:

- Title
- Status
- Context
- Decision
- Consequences
- Alternatives Considered

This structure keeps decisions consistent and easy to review.

---

# 7. Example Template

```markdown
# ADR-XXX

## Status

Accepted

---

## Context

Describe the problem that needs to be solved.

---

## Decision

Describe the selected solution.

---

## Consequences

Explain the positive and negative outcomes.

---

## Alternatives Considered

List other approaches and explain why they were rejected.
```

---

# 8. Initial Architecture Decisions

The following architectural decisions have already been made.

### ADR-001

Backend Architecture

Decision:

Use a Modular Monolith based on NestJS and Clean Architecture.

---

### ADR-002

Frontend Architecture

Decision:

Use React with a Feature-First folder structure.

---

### ADR-003

Database

Decision:

Use PostgreSQL with Prisma ORM.

---

### ADR-004

Authentication

Decision:

Use JWT Access Tokens with Refresh Token Rotation.

---

### ADR-005

Styling

Decision:

Use Tailwind CSS with a centralized Design Token system.

---

### ADR-006

Animations

Decision:

Use Framer Motion for all application animations.

---

### ADR-007

State Management

Decision:

Use Zustand for global client state.

---

### ADR-008

Data Fetching

Decision:

Use TanStack Query for server state management.

---

### ADR-009

Password Hashing

Decision:

Use Argon2 for password hashing.

---

### ADR-010

Quiz Persistence Model

Decision:

Model Quiz as an optional, persisted, admin-managed template. A QuizSession may reference a Quiz, or be generated ad hoc directly from a Subject and optional Topic, following the Subject Quiz and Random Quiz modes. Neither path is removed in favor of the other.

---

### ADR-011

Avatar Entity

Decision:

Model Avatar as its own entity and table, owned exclusively (1:1) by User, independent of Profile.

---

### ADR-012

Content Localization

Decision:

Localize educational content (Subject, Topic, Question, AnswerOption) using sibling `*_translations` tables, one row per parent entity per supported locale. Each base table's own fields hold the default-locale (English) values, used as the fallback when a translation is missing.

---

### ADR-013

API Token Transport

Decision:

Authenticate API requests exclusively via the Authorization header (`Authorization: Bearer <access_token>`). Tokens are not transmitted via cookies.

---

# 9. Decision Principles

Architecture decisions should prioritize:

- simplicity;
- maintainability;
- scalability;
- developer experience;
- consistency.

Short-term convenience should not outweigh long-term maintainability.

---

# 10. Decision Ownership

Major architectural decisions should be reviewed before implementation.

Once accepted, decisions should remain stable unless a compelling reason for change exists.

Changes should be documented through new ADRs rather than modifying historical records.

---

# 11. Versioning

Accepted ADRs should never be deleted.

If a decision changes:

- create a new ADR;
- reference the previous ADR;
- explain why the change occurred.

This preserves the project's architectural history.

---

# 12. Success Criteria

The ADR process is considered successful if it:

- documents major technical decisions;
- explains architectural reasoning;
- preserves historical context;
- supports long-term project maintenance;
- improves collaboration and consistency.