# Learning Material

**Document Version:** 1.0  
**Status:** Planned (Post-MVP)  
**Last Updated:** July 2026

---

# 1. Purpose

The Learning Material entity represents educational resources that help users study a subject before or after completing quizzes.

Learning materials complement quizzes by providing structured theoretical content.

This entity is planned for future releases and is not included in the MVP.

---

# 2. Responsibilities

The Learning Material entity is responsible for:

- storing educational content;
- organizing study resources;
- connecting materials to subjects and topics;
- supporting future learning workflows.

The entity contains no quiz logic.

---

# 3. Relationships

A Learning Material:

- belongs to exactly one Subject;
- may belong to one Topic;
- may contain multiple sections.

Relationship summary:

Subject (1)

↓

Learning Material (N)

↓

Topic (0..1)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| subjectId | UUID | Yes | Parent subject |
| topicId | UUID | No | Related topic |
| title | String | Yes | Material title |
| description | Text | No | Short description |
| content | Rich Text / Markdown | Yes | Main educational content |
| estimatedReadingTime | Integer | No | Estimated reading time (minutes) |
| createdAt | DateTime | Yes | Creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |

---

# 5. Business Rules

A Learning Material:

- belongs to one Subject;
- may optionally belong to a Topic;
- can exist without quizzes;
- may be updated by administrators.

Learning materials are read-only for regular users.

---

# 6. Validation Rules

The system validates:

- title is not empty;
- content is not empty;
- referenced Subject exists;
- referenced Topic belongs to the same Subject.

Invalid references are rejected.

---

# 7. Content

Learning materials may contain:

- headings;
- paragraphs;
- bullet lists;
- numbered lists;
- tables;
- images;
- mathematical formulas (LaTeX);
- code blocks (future).

The content format should remain structured and easy to read.

---

# 8. Organization

Learning materials are organized hierarchically.

Structure:

Subject

↓

Topic (optional)

↓

Learning Material

This allows users to navigate educational content logically.

---

# 9. Localization

Learning materials support multiple languages.

Each translation represents the same educational content.

Translations should remain synchronized across supported languages.

---

# 10. Future Features

Possible future enhancements include:

- Embedded videos
- Interactive diagrams
- Practice examples
- Downloadable PDFs
- AI-generated summaries
- AI-assisted explanations
- Bookmarking
- Reading progress

These features are outside the initial implementation.

---

# 11. Constraints

The Learning Material entity:

- contains no quiz logic;
- contains no scoring logic;
- cannot award XP directly;
- should remain independent of Quiz Sessions.

Learning materials support learning but do not replace quizzes.

---

# 12. Non-Functional Requirements

The entity should:

- support rich content;
- remain performant for large documents;
- allow future media expansion;
- support efficient searching and indexing.

---

# 13. Success Criteria

The Learning Material entity is considered successful if it:

- organizes educational content effectively;
- integrates naturally with Subjects and Topics;
- supports future learning workflows;
- remains scalable as content grows;
- complements the quiz-based learning experience.

Learning materials should enhance learning without replacing the platform's core quiz experience.