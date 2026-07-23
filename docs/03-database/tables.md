# Database Tables

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document provides an overview of all database tables used by the Quiz Platform.

It defines the purpose of each table, its role within the system, and its relationships with other tables.

Column-level definitions are documented within the corresponding Domain documents and implemented through database migrations.

---

# 2. Database Overview

The database is organized into four logical domains.

## Identity

Responsible for authentication and user identity.

- users
- profiles
- avatars
- user_settings
- refresh_tokens

---

## Learning

Responsible for recording learning activity.

- quiz_sessions
- question_attempts
- results
- xp_transactions
- statistics

---

## Educational Content

Responsible for organizing educational resources.

- subjects
- subject_translations
- topics
- topic_translations
- questions
- question_translations
- answer_options
- answer_option_translations
- quizzes

Future:

- learning_materials

---

## Administration

Administrative functionality operates directly on the existing tables.

The MVP does not require dedicated administration tables.

---

# 3. Table Definitions

## users

Stores registered user accounts.

Responsibilities:

- authentication;
- account ownership;
- account lifecycle.

Referenced by:

- profiles
- avatars
- user_settings
- statistics
- quiz_sessions
- xp_transactions

---

## profiles

Stores public profile information.

Responsibilities:

- username;
- biography.

Each user owns exactly one profile.

---

## avatars

Stores the active avatar image reference for each user.

Responsibilities:

- avatar type (predefined or custom upload);
- image location.

Each user owns exactly one avatar.

---

## user_settings

Stores application preferences.

Responsibilities:

- language;
- theme;
- public profile visibility;
- future personalization settings.

Each user owns exactly one settings record.

---

## refresh_tokens

Stores refresh-token sessions.

Responsibilities:

- one row per authenticated session;
- Argon2 hash of the refresh token (the plaintext token is never stored);
- expiration time;
- revocation state (rotation, logout, reuse detection).

Each row belongs to one User. A User may hold many active sessions at once — one per device or login.

---

## statistics

Stores aggregated learning metrics.

Responsibilities:

- total XP;
- completed quizzes;
- average accuracy;
- learning time.

Statistics are recalculated automatically.

---

## subjects

Stores academic subjects.

Examples:

- Mathematics
- Ukrainian Language
- History of Ukraine
- English Language

Subjects organize Topics.

The `name` and `description` columns hold the default-locale (English) values.

Soft delete: a `deleted_at` timestamp marks removed subjects (see §6). Deleted subjects disappear from all queries, but their slug and name stay reserved.

---

## subject_translations

Stores localized `name` and `description` values for each Subject, one row per Subject per supported locale.

Each Subject may have zero or more translations. A missing translation falls back to the default-locale values stored on `subjects`.

---

## topics

Stores educational topics.

Topics belong to one Subject.

Topics organize Questions.

The `name` and `description` columns hold the default-locale (English) values.

Soft delete: a `deleted_at` timestamp marks removed topics (see §6). Deleted topics disappear from all queries, but their name and slug stay reserved within their subject.

---

## topic_translations

Stores localized `name` and `description` values for each Topic, one row per Topic per supported locale.

Each Topic may have zero or more translations. A missing translation falls back to the default-locale values stored on `topics`.

---

## questions

Stores reusable educational questions.

Questions:

- belong to Topics;
- support multiple question types;
- support LaTeX;
- support images.

Questions contain no user-specific data.

The `title` column holds the default-locale (English) value.

The `configuration` JSON column stores the type-specific correct-answer configuration (Matching pairs); `is_published` controls visibility.

Soft delete: a `deleted_at` timestamp marks removed questions (see §6). Deleted questions disappear from all queries; historical Quiz Sessions remain valid.

---

## question_translations

Stores localized `title` values for each Question, one row per Question per supported locale.

Each Question may have zero or more translations. A missing translation falls back to the default-locale value stored on `questions`.

---

## answer_options

Stores answer choices.

Each Answer Option belongs to one Question.

Supported question types determine answer structure.

The `content` column holds the default-locale (English) value.

---

## answer_option_translations

Stores localized `content` values for each Answer Option, one row per Answer Option per supported locale.

Each Answer Option may have zero or more translations. A missing translation falls back to the default-locale value stored on `answer_options`.

---

## quizzes

Stores optional, reusable quiz configurations defined by administrators.

Each Quiz belongs to one Subject and, optionally, one Topic.

Quizzes are not required to start a session — the Subject Quiz and Random Quiz modes generate sessions directly from a Subject/Topic without referencing a Quiz.

---

## quiz_sessions

Stores quiz attempts.

Each Quiz Session belongs to one User and may optionally reference the Quiz used to generate it.

Completed Quiz Sessions generate Results.

---

## question_attempts

Stores user answers during quiz sessions.

Each Question Attempt belongs to:

- one Quiz Session;
- one Question.

Question Attempts remain immutable.

---

## results

Stores final quiz outcomes.

Each completed Quiz Session produces one Result.

Results are immutable.

---

## xp_transactions

Stores every awarded XP event.

XP Transactions create a complete progression history.

User level is derived from these records.

---

## learning_materials (Post-MVP)

Stores educational notes and learning materials.

Each Learning Material belongs to one Subject and, optionally, one Topic.

This table is reserved for future releases.

---

# 4. Table Dependencies

The dependency order is:

```text
users
│
├── profiles
├── avatars
├── user_settings
├── refresh_tokens
├── statistics
└── quiz_sessions
          │
          ├── question_attempts
          └── results
                    │
                    └── xp_transactions

subjects
     │
     ├── subject_translations
     │
     ▼
topics
     │
     ├── topic_translations
     │
     ▼
questions
     │
     ├── question_translations
     │
     ▼
answer_options
     │
     └── answer_option_translations

subjects
     │
     ▼
quizzes

subjects
     │
     ▼
learning_materials
```

Two cross-cutting relationships are not shown as tree branches above:

- `quiz_sessions.quizId` is an optional foreign key to `quizzes`. It is added once the `quizzes` table exists — see the Migrations documentation for ordering.
- `learning_materials.topicId` is an optional foreign key to `topics`, in addition to its required `subjectId`.

---

# 5. Naming Convention

All database tables follow these conventions:

- lowercase names;
- snake_case formatting;
- plural table names;
- UUID primary keys;
- singular entity names in application code.

Examples:

```text
users

quiz_sessions

question_attempts

xp_transactions
```

---

# 6. Soft Delete Policy

Historical learning records must never be physically deleted.

Soft Delete should be used where appropriate.

Recommended tables:

- users
- subjects
- topics
- questions
- quizzes

Quiz Sessions, Results, and XP Transactions should never be deleted.

---

# 7. Audit Fields

Most tables include standard audit fields.

Typical audit fields:

- created_at
- updated_at

Some tables additionally include:

- completed_at
- last_login_at

These timestamps support auditing and analytics.

---

# 8. Future Tables

The schema is designed for future expansion.

Potential future tables include:

- achievements
- leaderboards
- notifications
- learning_paths
- ai_recommendations
- daily_challenges

New tables should integrate without modifying existing relationships.

---

# 9. Design Principles

The table structure follows these principles:

- clear separation of responsibilities;
- normalized data model;
- immutable historical records;
- scalable relationships;
- future extensibility.

Every table has a single, well-defined responsibility.

---

# 10. Success Criteria

The database table structure is considered successful if it:

- accurately represents the domain model;
- supports efficient querying;
- preserves historical integrity;
- scales with application growth;
- remains easy to understand and maintain.