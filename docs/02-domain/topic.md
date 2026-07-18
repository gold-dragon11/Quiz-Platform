# Topic

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Topic entity represents a specific area of knowledge within a Subject.

Topics organize questions into logical groups, enabling focused learning, quiz generation, and future learning materials.

Topics are managed through the Admin Panel.

---

# 2. Responsibilities

The Topic entity is responsible for:

- organizing questions within a subject;
- serving as a source for topic-based quizzes;
- supporting future learning materials;
- structuring educational content.

The Topic entity contains no user-specific data or quiz results.

---

# 3. Relationships

A Topic:

- belongs to exactly one Subject;
- contains many Questions;
- may contain many Learning Materials (future);
- may be used for Quiz generation.

Relationship summary:

Subject (1)

↓

Topic (N)

↓

Question (N)

↓

AnswerOption (N)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| subjectId | UUID | Yes | Parent subject |
| name | String | Yes | Topic name (default locale, English) |
| slug | String | Yes | URL-friendly identifier |
| description | Text | No | Short description (default locale, English) |
| displayOrder | Integer | Yes | Display order within the subject |
| isPublished | Boolean | Yes | Visibility status |
| createdAt | DateTime | Yes | Creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |

---

# 5. Business Rules

A Topic:

- belongs to exactly one Subject;
- must have a unique name within its Subject;
- may exist without Questions during creation;
- may be unpublished.

Deleting a Topic must not invalidate historical Quiz Sessions.

---

# 6. Validation Rules

The system validates:

- Subject exists;
- name is required;
- slug is unique within the Subject;
- displayOrder is unique within the Subject.

Only valid Topics can be published.

---

# 7. Quiz Generation

Users may generate quizzes:

- from the entire Subject;
- from a specific Topic.

When a Topic quiz is selected, all generated questions must belong to that Topic.

---

# 8. Question Organization

Questions inherit their educational context from the Topic.

A Topic may contain:

- beginner questions;
- intermediate questions;
- advanced questions.

The Topic itself does not define question difficulty; difficulty is an optional tag on the Question entity.

---

# 9. Localization

Topics support multiple languages.

Localized fields include:

- name;
- description.

Translated values are stored in a dedicated TopicTranslation record per Topic per locale (see the Database documentation). The `name` and `description` fields on the Topic itself hold the default-locale (English) values, used as a fallback whenever a translation is missing.

The slug remains language-independent.

---

# 10. Administration

Administrators can:

- create Topics;
- edit Topics;
- publish or unpublish Topics;
- reorder Topics;
- archive Topics.

Historical learning data must remain unchanged.

---

# 11. Future Improvements

Possible future enhancements include:

- Topic Icons
- Topic Images
- Difficulty Labels
- Estimated Study Time
- Topic Statistics
- Prerequisite Topics
- Topic Dependencies

These features are outside the MVP.

---

# 12. Constraints

The Topic entity:

- contains no user information;
- contains no quiz sessions;
- contains no XP data;
- contains no scoring logic.

Its sole purpose is to organize educational content.

---

# 13. Non-Functional Requirements

The Topic entity should:

- remain lightweight;
- support efficient querying;
- scale to large content libraries;
- support dynamic creation through the Admin Panel.

---

# 14. Success Criteria

The Topic entity is considered successful if it:

- organizes questions logically;
- enables topic-based quiz generation;
- supports future Learning Materials;
- integrates cleanly with Subjects and Questions;
- remains scalable as educational content grows.