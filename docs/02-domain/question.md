# Question

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Question entity represents a single assessment item within the Quiz Platform.

It defines the content presented to users during quiz sessions and serves as the primary building block of the question bank.

The Question entity is independent of quiz sessions, user progress, and scoring.

---

# 2. Responsibilities

The Question entity is responsible for:

- storing question content;
- defining the question type;
- organizing educational content;
- referencing answer options;
- supporting future question formats.

The entity contains no user-specific data.

---

# 3. Relationships

A Question:

- belongs to exactly one Topic;
- has one or more Answer Options;
- may appear in many Quiz Sessions;
- may have many Question Attempts.

Relationship summary:

Subject (1)

↓

Topic (N)

↓

Question (N)

↓

Answer Option (2..N)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| topicId | UUID | Yes | Parent topic |
| type | Enum | Yes | Question type |
| title | Text | Yes | Question text (default locale, English) |
| explanation | Text | No | Explanation shown after review (future) |
| imageUrl | String | No | Optional illustration |
| difficulty | Enum | No | Difficulty level (Beginner / Intermediate / Advanced) |
| configuration | JSON | No | Type-specific correct-answer configuration (required for Matching) |
| isPublished | Boolean | Yes | Visibility status |
| createdAt | DateTime | Yes | Creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |
| deletedAt | DateTime | No | Soft-delete timestamp; set instead of removing the row |

---

# 5. Supported Question Types

### MVP

- Single Choice
- Matching

Future versions may support:

- Multiple Choice
- Ordering
- Fill in the Blank
- Numeric Answer
- Drag & Drop
- Image Selection

The architecture should allow new question types without redesigning existing entities.

---

# 6. Business Rules

A Question:

- belongs to one Topic;
- must contain valid content;
- must have at least one correct answer;
- must contain at least two answer options;
- may optionally be tagged with a Difficulty level, used for administrative filtering.

Automatic difficulty-based quiz balancing is a future capability; the difficulty tag itself is part of the MVP.

Questions are reusable across multiple quiz sessions.

---

# 7. Validation Rules

The system validates:

- question text is not empty;
- referenced Topic exists;
- at least two answer options exist;
- the correct answer configuration matches the question type.

Correctness by type:

- **Single Choice** — exactly one Answer Option has `isCorrect = true`; `configuration` stays empty.
- **Matching** — correctness lives in `configuration` as pairs of option order values (`{"pairs": [{"left": 0, "right": 1}]}`); every option participates in exactly one pair, and `isCorrect` is not used.

The question type is immutable after creation — administrators create a new question instead of converting an existing one.

Invalid questions cannot be published.

---

# 8. Content

Question content may include:

- plain text;
- images;
- mathematical formulas (LaTeX).

Future versions may additionally support:

- tables;
- code snippets;
- embedded media.

---

# 9. Images

Questions may contain an optional image.

Supported formats:

- PNG
- JPG
- WEBP

Images should enhance understanding rather than replace question text.

---

# 10. Mathematical Formulas

Questions support LaTeX notation.

Mathematical expressions should render consistently across all supported platforms.

---

# 11. Localization

Questions support multiple languages.

Each localized version represents the same logical question.

Translated values are stored in a dedicated QuestionTranslation record per Question per locale (see the Database documentation). The `title` field on the Question itself holds the default-locale (English) value, used as a fallback whenever a translation is missing.

Translations should remain synchronized.

---

# 12. Historical Integrity

Questions may be updated by administrators.

Historical Quiz Sessions and Question Attempts must continue to reference the original version used during the session.

The platform should preserve historical accuracy.

---

# 13. Public Exposure

Questions reach learners through the read-only Questions API.

A question is publicly visible only when the whole publication chain holds: the question, its Topic, and the Topic's Subject are all published and not soft-deleted.

The public representation carries only what taking a quiz requires: id, type, localized title, difficulty, imageUrl, ordered answer options (id, localized content, imageUrl, order), and — for Matching questions — the configuration. `isCorrect`, `explanation`, publication and deletion metadata, and raw translation records are never exposed.

---

# 14. Administration

Questions are managed through the Admin Panel.

Administrators can:

- create questions;
- edit questions;
- archive questions;
- delete questions (when allowed).

Deleted questions should not invalidate historical quiz sessions.

---

# 15. Future Improvements

Potential future enhancements include:

- Difficulty balancing
- AI-generated questions
- AI-generated explanations
- Tags
- References
- Version history
- Attachments

These features are outside the MVP.

---

# 16. Constraints

The Question entity:

- contains no user-specific data;
- contains no XP logic;
- contains no statistics;
- remains independent of Quiz Sessions.

Business logic belongs to dedicated services.

---

# 17. Non-Functional Requirements

The Question entity should:

- support efficient querying;
- scale to large question banks;
- remain immutable during active quiz sessions;
- support future extensibility.

---

# 18. Success Criteria

The Question entity is considered successful if it:

- accurately represents educational content;
- supports all MVP question types;
- integrates cleanly with Topics and Answer Options;
- remains reusable across quiz sessions;
- supports future expansion without architectural changes.