# Backend Architecture

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the backend architecture of the Quiz Platform.

The backend is designed as a modular monolith following Clean Architecture principles. The goal is to build a scalable, maintainable, and testable application that can evolve without major architectural changes.

---

# 2. Technology Stack

The backend is built using:

- Node.js
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Argon2
- Docker

The backend exposes a REST API consumed by the React frontend.

---

# 3. Architectural Style

The application follows a **Modular Monolith** architecture.

Business functionality is separated into independent modules while remaining within a single deployable application.

Modules communicate through well-defined service interfaces.

---

# 4. Core Principles

The backend follows these principles:

- Single Responsibility Principle
- Dependency Inversion
- Separation of Concerns
- Modular Design
- Explicit Dependencies
- Testability

Every module should own its business logic.

---

# 5. High-Level Architecture

```text
HTTP Request

↓

Controller

↓

Application Service

↓

Domain Logic

↓

Repository

↓

Database
```

Each layer has a single responsibility.

---

# 6. Application Modules

The backend is divided into business modules.

Core modules include:

- Authentication
- Users
- Profiles
- Dashboard
- Quiz
- Statistics
- Subjects
- Topics
- Questions
- Admin
- Settings

Each module owns:

- controllers;
- services;
- DTOs;
- repositories;
- domain logic.

---

# 7. Layer Responsibilities

## Controllers

Responsible for:

- receiving HTTP requests;
- request validation;
- authentication guards;
- formatting responses.

Controllers contain no business logic.

---

## Application Services

Responsible for:

- business workflows;
- coordinating repositories;
- orchestrating domain operations.

Services implement use cases.

---

## Domain Layer

Responsible for:

- business rules;
- domain validation;
- entity behavior.

Business logic belongs here whenever possible.

---

## Repository Layer

Responsible for:

- database access;
- query execution;
- persistence.

Repositories should not contain business logic.

---

# 8. Database Access

Prisma ORM is used for:

- database schema;
- migrations;
- queries;
- transactions.

All database access goes through repositories.

---

# 9. Dependency Direction

Dependencies always flow inward.

```text
Controller

↓

Service

↓

Repository

↓

Database
```

Repositories never depend on controllers.

---

# 10. Transactions

Complex business operations should use database transactions.

Examples:

- Complete Quiz
- Award XP
- Update Statistics
- Create User

Operations that modify multiple entities must remain atomic.

---

# 11. Error Handling

The backend provides centralized error handling.

Errors include:

- validation errors;
- authentication errors;
- authorization errors;
- business rule violations;
- unexpected exceptions.

Clients receive consistent JSON responses.

---

# 12. Logging

Application logging should include:

- incoming requests;
- failed requests;
- authentication events;
- unexpected exceptions.

Sensitive information must never be logged.

---

# 13. Security

Security principles include:

- JWT authentication;
- Argon2 password hashing;
- role-based authorization;
- input validation;
- rate limiting;
- SQL injection protection.

Security is enforced across all modules.

---

# 14. Scalability

The architecture supports future expansion including:

- additional modules;
- background jobs;
- AI services;
- mobile clients;
- public API.

Future features should integrate without major restructuring.

---

# 15. Testing

The architecture should support:

- unit tests;
- integration tests;
- end-to-end tests.

Business logic should be independently testable.

---

# 16. Deployment

The backend is designed to run as a Docker container.

The application should be deployable in:

- development;
- staging;
- production.

Configuration is environment-based.

---

# 17. Success Criteria

The backend architecture is considered successful if it:

- remains modular;
- separates business logic from infrastructure;
- scales with product growth;
- is easy to test;
- is easy to maintain.