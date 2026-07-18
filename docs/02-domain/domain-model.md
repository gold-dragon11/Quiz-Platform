# Domain Model

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the core domain model of the Quiz Platform.

The domain model describes the primary business entities, their relationships, responsibilities, and boundaries.

It serves as the foundation for the database design, backend architecture, and business logic.

---

# 2. Domain Philosophy

The platform is designed around one central concept:

> **A user improves knowledge through quiz sessions.**

Every domain entity exists to support this learning process.

Business logic should remain independent of presentation, infrastructure, and implementation details.

---

# 3. Domain Layers

The domain is organized into several logical areas.

## Identity

Responsible for user identity and authentication.

Entities:

- User
- UserSettings
- Profile
- Avatar

---

## Learning

Responsible for educational content.

Entities:

- Subject
- Topic
- Question
- AnswerOption

---

## Quiz Engine

Responsible for quiz execution.

Entities:

- Quiz
- QuizSession
- QuestionAttempt
- Result

---

## Progress

Responsible for tracking learning progress.

Entities:

- XPTransaction
- Statistics

---

## Administration

Responsible for content management.

Entities:

- Admin actions
- Question management
- Subject management
- Topic management

---

# 4. Core Entities

The MVP domain consists of the following entities:

- User
- Profile
- UserSettings
- Avatar
- Subject
- Topic
- Question
- AnswerOption
- Quiz
- QuizSession
- QuestionAttempt
- Result
- XPTransaction
- Statistics

Future entities may be added without changing the overall architecture.

---

# 5. Entity Relationships

The primary relationships are:

- One User owns one Profile.
- One User owns one UserSettings.
- One User owns one Avatar.
- One User owns one Statistics.
- One Subject contains many Topics.
- One Topic contains many Questions.
- One Question contains many AnswerOptions.
- One Quiz belongs to one Subject and, optionally, one Topic.
- One Quiz consists of many Questions.
- One Quiz may generate many QuizSessions. A QuizSession may also be generated ad hoc, without referencing a stored Quiz.
- One QuizSession contains many QuestionAttempts.
- One QuizSession produces one Result.
- One Result creates one XPTransaction.
- Statistics are derived from QuizSessions and Results.

The model emphasizes composition and clear ownership.

---

# 6. Aggregate Boundaries

The domain is divided into independent aggregates.

### User Aggregate

Root:

- User

Contains:

- Profile
- UserSettings
- Avatar
- Statistics

---

### Learning Aggregate

Root:

- Subject

Contains:

- Topic
- Question
- AnswerOption
- Quiz

---

### Quiz Session Aggregate

Root:

- QuizSession

Contains:

- QuestionAttempt
- Result

---

### Progress Aggregate

Root:

- XPTransaction

Statistics are generated from completed quiz sessions rather than directly owned by an aggregate.

---

# 7. Business Rules

The domain follows these rules:

- Every Question belongs to exactly one Topic.
- Every Topic belongs to exactly one Subject.
- Every Quiz belongs to exactly one Subject and, optionally, one Topic.
- Every QuizSession belongs to exactly one User and may optionally reference the Quiz configuration used to generate it.
- Every Result belongs to exactly one QuizSession.
- XP is awarded only after successful quiz completion.
- Statistics are derived data and should never be manually edited.

---

# 8. Entity Lifecycle

Typical entity lifecycle:

User

↓

Quiz Started

↓

QuizSession Created

↓

QuestionAttempts Recorded

↓

Quiz Completed

↓

Result Generated

↓

XP Awarded

↓

Statistics Updated

This flow represents the core business process of the platform.

---

# 9. Domain Principles

The domain model follows these principles:

- Single Responsibility
- High Cohesion
- Low Coupling
- Explicit Relationships
- Immutable Historical Data
- Scalability

Business entities should remain independent from UI and API concerns.

---

# 10. Derived Data

Some entities are calculated rather than stored directly.

Examples include:

- Average Accuracy
- Total XP
- Total Learning Time
- Subject Statistics

Derived data should always be reproducible from historical records.

---

# 11. Future Extensions

The architecture supports future entities such as:

- LearningMaterial
- DailyChallenge
- Achievement
- Leaderboard
- AIRecommendation
- StudyPlan
- Notification
- Badge

These additions should integrate without modifying existing aggregates.

---

# 12. Non-Functional Requirements

The domain model should:

- remain implementation-independent;
- support future expansion;
- scale efficiently;
- remain easy to understand.

Business logic should always reside inside the domain layer rather than the presentation layer.

---

# 13. Success Criteria

The domain model is considered successful if it:

- accurately represents the business domain;
- supports all MVP requirements;
- remains scalable;
- enables clean backend architecture;
- minimizes duplication and coupling.

The domain model should remain the single source of truth for the application's business concepts.