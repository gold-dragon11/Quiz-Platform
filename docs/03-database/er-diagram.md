# Entity Relationship Diagram (ER Diagram)

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document describes the logical database structure of the Quiz Platform.

The ER Diagram illustrates how entities are related to each other and serves as the foundation for database design, API development, backend services, and future scalability.

This document represents the logical model rather than the physical implementation.

---

# 2. Design Principles

The database follows several core principles.

## Separation of Responsibilities

Each entity has a single responsibility.

Examples:

- User → authentication
- Profile → public identity
- Avatar → visual identity
- UserSettings → preferences
- Quiz → reusable quiz configuration
- QuizSession → learning session
- Result → session outcome
- Statistics → aggregated progress

---

## Historical Integrity

Historical learning data must never change.

Once a Quiz Session is completed:

- Question Attempts remain immutable.
- Results remain immutable.
- XP Transactions remain immutable.

Historical data always represents what happened at the time of the session.

---

## Normalization

The schema follows normalization principles while allowing selective denormalization for performance.

Examples include:

- Statistics
- Total XP
- Cached progress metrics

These values can always be reconstructed from historical data if necessary.

---

## Scalability

The model is designed to support:

- millions of users;
- millions of quiz sessions;
- millions of question attempts;
- future learning features.

---

# 3. Entity Groups

The database consists of four logical domains.

## Identity

- User
- Profile
- Avatar
- UserSettings
- RefreshToken

Responsible for account management, sessions, and personalization.

---

## Learning Content

- Subject
- SubjectTranslation
- Topic
- TopicTranslation
- Question
- QuestionTranslation
- AnswerOption
- AnswerOptionTranslation
- Quiz
- LearningMaterial (Post-MVP)

Responsible for organizing educational content.

---

## Learning Process

- QuizSession
- QuestionAttempt
- Result

Responsible for recording quiz activity.

---

## Progress

- XPTransaction
- Statistics

Responsible for tracking long-term learning progress.

---

# 4. Relationship Overview

## Identity

```text
User
├── Profile
├── Avatar
├── UserSettings
├── Statistics
└── RefreshToken (N)
```

Each User owns exactly one Profile, one Avatar, one UserSettings record, and one Statistics record, plus any number of RefreshToken session records — one per login.

---

## Learning Content

```text
Subject ── SubjectTranslation
    │
    ├──▼ Topic ── TopicTranslation
    │       │
    │       ▼
    │   Question ── QuestionTranslation
    │       │
    │       ▼
    │   AnswerOption ── AnswerOptionTranslation
    │
    └──▶ Quiz
```

Topics belong to Subjects.

Questions belong to Topics.

Answer Options belong to Questions.

Each translated entity (SubjectTranslation, TopicTranslation, QuestionTranslation, AnswerOptionTranslation) holds one row per locale for its parent.

A Quiz belongs to a Subject and, optionally, a Topic. It is not required for quiz generation — see the Learning Flow diagram below.

---

## Learning Flow

```text
User                Quiz (optional)
    │                     │
    └─────────┬───────────┘
              ▼
         QuizSession
              │
              ▼
       QuestionAttempt
              │
              ▼
           Result
              │
              ▼
        XPTransaction
```

A QuizSession is created either from a stored Quiz or ad hoc, directly from a Subject and optional Topic.

Every completed Quiz Session creates one Result.

The Result generates XP.

---

# 5. Complete ER Diagram

```text
                          User
                           │
        ┌──────────┬───────┼───────────┬──────────┐
        │          │       │           │          │
        ▼          ▼       ▼           ▼          ▼
    Profile     Avatar  UserSettings Statistics  QuizSession ── (optional) ── Quiz
                                                     │
                                                     ├───────────────┐
                                                     │               │
                                                     ▼               ▼
                                             QuestionAttempt      Result
                                                     │               │
                                                     │               ▼
                                                     │        XPTransaction
                                                     ▼
                                                  Question
                                                     │
                                                     ▼
                                               AnswerOption

Subject ── SubjectTranslation
   │
   ▼
Topic ── TopicTranslation
   │
   ▼
Question ── QuestionTranslation
   │
   ▼
AnswerOption ── AnswerOptionTranslation

Subject
   │
   ▼
Quiz

Subject
   │
   ▼
LearningMaterial
   │
   (optional Topic)
```

---

# 6. Cardinality

| Relationship | Cardinality |
|-------------|-------------|
| User → Profile | 1 : 1 |
| User → Avatar | 1 : 1 |
| User → UserSettings | 1 : 1 |
| User → Statistics | 1 : 1 |
| User → RefreshToken | 1 : N |
| User → QuizSession | 1 : N |
| Quiz → QuizSession | 1 : N (optional) |
| QuizSession → QuestionAttempt | 1 : N |
| QuizSession → Result | 1 : 1 |
| Result → XPTransaction | 1 : N |
| Subject → Topic | 1 : N |
| Subject → SubjectTranslation | 1 : N |
| Topic → Question | 1 : N |
| Topic → TopicTranslation | 1 : N |
| Question → AnswerOption | 1 : N |
| Question → QuestionTranslation | 1 : N |
| AnswerOption → AnswerOptionTranslation | 1 : N |
| Subject → Quiz | 1 : N |
| Topic → Quiz | 0..1 : N (optional) |
| Subject → LearningMaterial | 1 : N (Future) |
| Topic → LearningMaterial | 0..1 : N (Future, optional) |

---

# 7. Aggregate Roots

The system contains several aggregate roots.

## Identity

- User

## Learning Content

- Subject

## Learning Process

- QuizSession

These aggregates own their internal entities and maintain consistency.

---

# 8. Cascade Rules

Deletion should never destroy historical learning data.

Examples:

- Deleting a Subject must not invalidate historical Quiz Sessions.
- Deleting a Quiz must not invalidate historical Quiz Sessions that reference it.
- Deleting a Question must not invalidate Question Attempts.
- Deleting a User should use Soft Delete.

Historical integrity always has priority.

---

# 9. Data Flow

Typical learning flow:

```text
Register User

↓

Create Profile

↓

Create UserSettings

↓

Create Statistics

↓

Create Avatar

↓

Start Quiz

↓

Create QuizSession

↓

Create QuestionAttempts

↓

Calculate Result

↓

Award XP

↓

Update Statistics
```

---

# 10. Future Extensions

The model is intentionally extensible.

Possible future entities include:

- Achievement
- Badge
- DailyChallenge
- Leaderboard
- Notification
- LearningPath
- AIRecommendation
- StudyPlan

These entities can be added without redesigning existing relationships.

---

# 11. Design Goals

The database structure is designed to:

- separate responsibilities clearly;
- preserve historical integrity;
- support efficient querying;
- remain highly scalable;
- support future educational features.

The ER model serves as the single source of truth for all database relationships in the Quiz Platform.