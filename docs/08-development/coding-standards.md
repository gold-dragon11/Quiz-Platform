# Coding Standards

**Document Version:** 1.0  
**Status:** Living Document  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the coding standards for the Quiz Platform.

The goal is to ensure that all code remains readable, consistent, maintainable, and scalable throughout the lifetime of the project.

These standards apply to both frontend and backend development.

---

# 2. General Principles

All code should be:

- readable;
- predictable;
- modular;
- testable;
- consistent.

Code is written for people first and computers second.

---

# 3. Naming Conventions

Use descriptive names.

Examples:

Classes

```text
QuizService
UserRepository
StatisticsController
```

Interfaces

```text
UserProfile
QuizResult
```

Variables

```text
currentUser
selectedAnswer
quizProgress
```

Functions

```text
calculateScore()
startQuiz()
updateProfile()
```

Avoid abbreviations unless they are universally understood.

---

# 4. File Naming

Use:

```text
kebab-case
```

Examples:

```text
quiz-results.tsx
question-card.tsx
statistics.service.ts
```

Component names remain PascalCase.

---

# 5. Folder Naming

Folders should use:

```text
kebab-case
```

Examples:

```text
quiz-results
learning-materials
user-settings
```

Folder names should describe business concepts.

---

# 6. TypeScript

Always prefer explicit typing.

Avoid:

```typescript
any
```

Prefer:

- interfaces;
- enums;
- utility types;
- generics where appropriate.

Strong typing is required throughout the project.

---

# 7. Functions

Functions should:

- have a single responsibility;
- remain small;
- use descriptive names;
- avoid side effects whenever possible.

Long functions should be refactored.

---

# 8. Components

React components should:

- be functional components;
- remain focused;
- avoid excessive nesting;
- receive well-defined props.

Business logic should not live inside UI components.

---

# 9. State Management

Follow the documented architecture.

Use:

- TanStack Query for server state;
- Zustand for global client state;
- useState for local component state.

Do not duplicate state.

---

# 10. Error Handling

Handle expected errors explicitly.

Examples:

- validation errors;
- API failures;
- authentication failures.

Avoid silent failures.

---

# 11. Comments

Code should be self-explanatory.

Comments should explain:

- why;
- architectural decisions;
- complex algorithms.

Comments should not describe obvious implementation details.

---

# 12. Formatting

Formatting should remain consistent.

Use:

- ESLint
- Prettier

Manual formatting should be minimized.

---

# 13. Imports

Organize imports consistently.

Recommended order:

1. External libraries
2. Shared modules
3. Features
4. Relative imports

Unused imports should be removed.

---

# 14. Constants

Magic numbers should be avoided.

Use named constants instead.

Example:

```typescript
const MAX_QUIZ_TIME = 30;
```

Constants should improve readability.

---

# 15. Reusability

Avoid duplicated logic.

Prefer:

- reusable hooks;
- utility functions;
- shared components;
- shared services.

Repeated code should be extracted.

---

# 16. Performance

Prefer simple solutions first.

Optimize only when necessary.

Avoid:

- unnecessary re-renders;
- duplicated requests;
- excessive computations.

Readability has priority over micro-optimizations.

---

# 17. Security

Generated code should:

- validate inputs;
- avoid exposing secrets;
- sanitize user input where appropriate;
- follow the documented security architecture.

Security rules apply to every module.

---

# 18. Git Practices

Commits should:

- represent a single logical change;
- use meaningful commit messages;
- avoid unrelated modifications.

Large features should be divided into smaller commits.

---

# 19. Documentation

Every significant feature should:

- follow the project documentation;
- remain consistent with the PRD;
- update documentation when behavior changes.

Documentation is part of the implementation.

---

# 20. Code Review Checklist

Before considering code complete, verify:

- architecture is respected;
- naming is consistent;
- no duplicated logic exists;
- types are correct;
- validation is implemented;
- error handling is complete;
- design system is respected.

---

# 21. Success Criteria

The coding standards are considered successful if they:

- produce consistent code;
- improve maintainability;
- reduce technical debt;
- support collaboration;
- scale with project growth.