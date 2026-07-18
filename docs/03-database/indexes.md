# Database Indexes

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the indexing strategy for the Quiz Platform database.

Indexes are used to optimize query performance while maintaining efficient write operations.

The indexing strategy is designed for scalability, fast lookups, and responsive user experience.

---

# 2. Design Principles

The indexing strategy follows these principles:

- Index frequently queried columns.
- Avoid unnecessary indexes.
- Optimize read performance.
- Preserve acceptable write performance.
- Support future scalability.

Indexes should be created only when they provide measurable value.

---

# 3. Primary Keys

Every table uses a UUID primary key.

Example:

```sql
PRIMARY KEY (id)
```

Each primary key automatically creates a clustered (or equivalent) index depending on the database engine.

---

# 4. Unique Indexes

The following fields require unique indexes.

## User

| Column | Reason |
|----------|-------------------------------|
| email | User authentication |

---

## Profile

| Column | Reason |
|----------|-------------------------------|
| username | Public profile URL |

---

## Avatar

| Column | Reason |
|----------|-------------------------------|
| userId | Enforces one avatar per user |

---

## SubjectTranslation

| Column | Reason |
|----------|-------------------------------|
| subjectId + locale | One translation per Subject per locale |

---

## TopicTranslation

| Column | Reason |
|----------|-------------------------------|
| topicId + locale | One translation per Topic per locale |

---

## QuestionTranslation

| Column | Reason |
|----------|-------------------------------|
| questionId + locale | One translation per Question per locale |

---

## AnswerOptionTranslation

| Column | Reason |
|----------|-------------------------------|
| answerOptionId + locale | One translation per Answer Option per locale |

---

## Subject

| Column | Reason |
|----------|-------------------------------|
| slug | Public routing |

---

## Topic

| Column | Reason |
|----------|-------------------------------|
| subjectId + slug | Unique topic within a subject |

---

# 5. Foreign Key Indexes

All foreign keys should be indexed.

These indexes improve JOIN performance.

Examples include:

| Table | Indexed Column |
|----------|----------------|
| Profile | userId |
| Avatar | userId |
| UserSettings | userId |
| Statistics | userId |
| Topic | subjectId |
| Question | topicId |
| AnswerOption | questionId |
| Quiz | subjectId |
| Quiz | topicId |
| QuizSession | userId |
| QuizSession | subjectId |
| QuizSession | topicId |
| QuizSession | quizId |
| QuestionAttempt | quizSessionId |
| QuestionAttempt | questionId |
| Result | quizSessionId |
| XPTransaction | userId |
| XPTransaction | quizSessionId |
| XPTransaction | resultId |
| LearningMaterial | subjectId |
| LearningMaterial | topicId |

---

# 6. Composite Indexes

Some queries benefit from composite indexes.

## Quiz History

```text
(userId, completedAt DESC)
```

Supports:

- quiz history;
- recent activity;
- dashboard.

---

## XP History

```text
(userId, createdAt DESC)
```

Supports:

- XP timeline;
- progression history.

---

## Question Lookup

```text
(topicId, type)
```

Supports:

- quiz generation;
- admin filtering.

---

## Topic Ordering

```text
(subjectId, displayOrder)
```

Supports:

- subject navigation.

---

## Subject Ordering

```text
(displayOrder)
```

Supports:

- homepage ordering.

---

## Quiz Lookup

```text
(subjectId, isPublished)
```

Supports:

- listing available quizzes per subject;
- admin filtering.

---

# 7. Search Optimization

Current MVP does not require full-text search.

Future versions may introduce indexes for:

- Question title
- Learning Materials
- Topic descriptions

These indexes should be added only when search functionality is implemented.

---

# 8. Statistics Optimization

Dashboard queries should avoid expensive aggregations.

Statistics are stored as precomputed values.

Indexes should support fast retrieval by:

```text
userId
```

---

# 9. Administrative Queries

Admin Panel frequently filters by:

- Subject
- Topic
- Question Type
- Published Status

Indexes should support these operations efficiently.

Suggested indexes:

```text
Question(topicId)

Question(type)

Question(topicId, type)
```

---

# 10. Future Indexes

Future features may require additional indexes.

Examples:

- Learning Streaks
- Achievements
- Notifications
- Daily Challenges
- Leaderboards

Indexes should be added based on actual query patterns rather than speculation.

---

# 11. Index Maintenance

Indexes should be reviewed periodically.

Unused indexes should be removed.

Frequently accessed queries should be monitored using database performance tools.

---

# 12. Performance Goals

The indexing strategy aims to achieve:

- Fast authentication
- Fast dashboard loading
- Fast quiz generation
- Efficient history retrieval
- Efficient admin operations

Read performance should remain consistently responsive as the database grows.

---

# 13. Success Criteria

The indexing strategy is considered successful if it:

- supports all critical application queries;
- minimizes unnecessary database scans;
- scales efficiently with increasing data volume;
- balances read and write performance;
- remains maintainable as the schema evolves.