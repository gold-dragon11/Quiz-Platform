# Subject

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Subject entity represents a high-level academic discipline within the Quiz Platform.

It serves as the root of the educational content hierarchy and organizes topics, questions, and future learning materials.

Subjects are managed through the Admin Panel and can be extended without requiring code changes.

---

# 2. Responsibilities

The Subject entity is responsible for:

- organizing educational content;
- grouping related topics;
- providing the entry point for quiz generation;
- supporting future expansion of the question bank.

The Subject entity contains no quiz logic or user-specific data.

---

# 3. Relationships

A Subject:

- contains many Topics;
- contains many Questions indirectly through Topics;
- may contain many Learning Materials (future);
- may generate many Quiz Sessions.

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
| name | String | Yes | Subject name (default locale, English) |
| slug | String | Yes | URL-friendly identifier |
| description | Text | No | Short description (default locale, English) |
| icon | String | No | Subject icon |
| color | String | No | Theme color |
| isPublished | Boolean | Yes | Visibility status |
| displayOrder | Integer | Yes | Display order |
| createdAt | DateTime | Yes | Creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |
| deletedAt | DateTime | No | Soft-delete timestamp; set instead of removing the row |

---

# 5. MVP Subjects

The initial release includes four subjects:

- Mathematics
- Ukrainian Language
- History of Ukraine
- English Language

Additional subjects can be added through the Admin Panel.

---

# 6. Business Rules

A Subject:

- must have a unique name;
- may contain multiple Topics;
- may exist without Topics during creation;
- may be unpublished.

Deleting a Subject should not invalidate historical Quiz Sessions.

---

# 7. Validation Rules

The system validates:

- name is required;
- slug is unique;
- display order is unique;
- published subjects contain valid metadata.

Name and slug uniqueness include soft-deleted subjects — both stay reserved after deletion. Display order uniqueness applies among non-deleted subjects and is enforced at the service level; the database index on displayOrder remains non-unique.

Invalid Subjects cannot be published.

---

# 8. Quiz Generation

A Subject is the primary source for quiz generation.

Users may:

- start a quiz for the entire Subject;
- choose a specific Topic;
- generate a random quiz.

Quiz generation uses the Subject as the entry point.

---

# 9. Localization

Subjects support multiple languages.

Localized fields include:

- name;
- description.

Translated values are stored in a dedicated SubjectTranslation record per Subject per locale (see the Database documentation). The `name` and `description` fields on the Subject itself hold the default-locale (English) values, used as a fallback whenever a translation is missing.

The slug remains language-independent.

---

# 10. Administration

Administrators can:

- create Subjects;
- edit Subjects;
- publish or unpublish Subjects;
- reorder Subjects;
- archive Subjects.

Historical data must remain unaffected.

---

# 11. Future Improvements

Possible future enhancements include:

- Subject Categories
- Difficulty Levels
- Featured Subjects
- Subject Images
- Subject Statistics
- Learning Paths

These features are outside the MVP.

---

# 12. Constraints

The Subject entity:

- contains no quiz results;
- contains no XP data;
- contains no user information;
- contains no scoring logic.

It exists solely to organize educational content.

---

# 13. Non-Functional Requirements

The Subject entity should:

- remain lightweight;
- support efficient querying;
- allow dynamic creation through the Admin Panel;
- scale as the content library grows.

---

# 14. Success Criteria

The Subject entity is considered successful if it:

- organizes educational content effectively;
- supports flexible quiz generation;
- remains extensible for future subjects;
- integrates seamlessly with Topics and Questions;
- requires no code changes when adding new subjects.