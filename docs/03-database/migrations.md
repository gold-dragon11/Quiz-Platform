# Database Migrations

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the migration strategy for the Quiz Platform database.

Database migrations ensure that schema changes are version-controlled, reproducible, and safely applied across development, testing, and production environments.

All database changes must be performed through migrations.

---

# 2. Migration Principles

The migration system follows these principles:

- Every schema change is version-controlled.
- Database history is immutable.
- Migrations are applied sequentially.
- Migrations must be reproducible.
- Schema changes should be reversible whenever possible.

Direct manual database modifications are prohibited.

---

# 3. Migration Workflow

Every schema change follows the same process.

```text
Update Documentation

↓

Create Migration

↓

Review Migration

↓

Apply to Development Database

↓

Run Tests

↓

Apply to Production
```

Documentation should always be updated before implementing database changes.

---

# 4. Naming Convention

Migration files should use sequential timestamps.

Example:

```text
202607170001_create_users_table

202607170002_create_profiles_table

202607170003_create_subjects_table

202607170004_create_topics_table

202607170005_create_questions_table
```

Migration names should clearly describe their purpose.

---

# 5. Initial Migration Order

The initial database should be created in the following order:

1. Users
2. Profiles
3. Avatars
4. UserSettings
5. Statistics
6. Subjects
7. SubjectTranslations
8. Topics
9. TopicTranslations
10. Questions
11. QuestionTranslations
12. AnswerOptions
13. AnswerOptionTranslations
14. Quizzes
15. LearningMaterials (Post-MVP)
16. QuizSessions
17. QuestionAttempts
18. Results
19. XPTransactions

This order respects foreign key dependencies. Each translation table is created immediately after its parent so its foreign key is always valid. Quizzes is created after Subjects and Topics (its dependencies) and before QuizSessions, since a QuizSession may optionally reference a Quiz.

---

# 6. Migration Rules

Every migration should:

- perform one logical change;
- be small and focused;
- avoid unrelated modifications;
- include rollback support whenever practical.

Large schema changes should be split into multiple migrations.

---

# 7. Rollback Strategy

Whenever possible, migrations should support rollback.

Rollback should:

- reverse the schema change;
- preserve data integrity;
- avoid orphaned records.

Some destructive migrations may intentionally be irreversible.

---

# 8. Data Integrity

Schema changes must never compromise historical learning data.

Completed Quiz Sessions, Results, and XP Transactions should remain valid after every migration.

Historical integrity always takes priority.

---

# 9. Development Environment

During development:

- migrations may be recreated before public release;
- test databases may be reset;
- experimental migrations are allowed.

Before production, the migration history should be clean and consistent.

---

# 10. Production Rules

Production migrations should:

- be tested beforehand;
- execute without manual intervention;
- avoid unnecessary downtime;
- preserve all existing data.

Emergency fixes should follow the same migration process.

---

# 11. Backward Compatibility

Whenever possible:

- existing APIs should continue to function;
- existing data should remain valid;
- schema changes should be incremental.

Breaking changes should be introduced only when absolutely necessary.

---

# 12. Seed Data

Initial seed data should be managed separately from schema migrations.

Seed data may include:

- Subjects
- Topics
- Default Avatars
- Default Application Settings

Seed scripts should be idempotent.

---

# 13. Migration Validation

Each migration should be validated by verifying:

- schema creation;
- foreign key constraints;
- indexes;
- unique constraints;
- rollback behavior (if supported).

Automated testing is recommended.

---

# 14. Future Considerations

Future database evolution may include:

- table partitioning;
- materialized views;
- database sharding;
- read replicas;
- audit logging.

The migration strategy should remain compatible with future architectural growth.

---

# 15. Success Criteria

The migration strategy is considered successful if it:

- maintains a consistent database schema;
- preserves historical data;
- supports safe schema evolution;
- enables reliable deployments;
- allows the development team to evolve the database with confidence.