# Learning Material

**Document Version:** 2.0  
**Status:** Implemented  
**Last Updated:** August 2026

---

# 1. Purpose

The Learning Material entity represents educational resources that help users study a subject before or after completing quizzes.

Learning materials complement quizzes by providing structured theoretical content.

A material is the theory behind one topic. It is surfaced in two places: next to the topic in the subject browser, and on the result page of a quiz on that topic — the moment the reader has just seen which questions they missed.

The API contract is documented in [docs/04-api/learning-materials.md](../04-api/learning-materials.md).

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
| title | String | Yes | Material title (≤ 200 characters) |
| slug | String | Yes | URL-safe identifier, unique per subject |
| description | Text | No | Short description (≤ 500 characters) |
| content | Markdown | Yes | Main educational content (≤ 20 000 characters) |
| estimatedReadingTime | Integer | No | Minutes to read — **derived**, never authored |
| displayOrder | Integer | Yes | Order within the subject; unique among visible materials |
| isPublished | Boolean | Yes | Visible to learners; defaults to `false` |
| createdAt | DateTime | Yes | Creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |
| deletedAt | DateTime | No | Soft-delete timestamp |

`estimatedReadingTime` is computed from the word count at 150 words per minute — a deliberately slow rate, because these are notes with formulas and definitions rather than prose. Deriving it means it cannot drift away from the text it describes.

---

# 5. Business Rules

A Learning Material:

- belongs to one Subject;
- may optionally belong to a Topic;
- can exist without quizzes;
- may be updated by administrators.

Learning materials are read-only for regular users.

**Visibility** follows the same publication chain as questions. A material reaches a learner only when the material, its topic (when it has one), and its subject are all published and none is soft-deleted. Every failing case answers the same 404, so the API never distinguishes "hidden" from "does not exist".

A new material is always created unpublished; publishing is a separate, deliberate act.

**Slugs stay reserved after deletion**, backed by the `(subjectId, slug)` unique constraint, so a deleted material cannot be silently replaced by a different one at the same address. `displayOrder`, by contrast, is contested only among visible materials.

`subjectId` is immutable: moving a material between subjects would break the slug reservation it holds.

---

# 6. Validation Rules

The system validates:

- title is not empty;
- content is not empty and within the length limit;
- content contains no raw HTML tags;
- content contains no `javascript:`, `data:`, or `vbscript:` links;
- slug is URL-safe and unused in the subject;
- referenced Subject exists;
- referenced Topic belongs to the same Subject.

Invalid references are rejected.

The two content-safety rules are not the only defence — the renderer runs with raw HTML disabled, so a tag could never execute — but they keep stored content free of markup a future renderer might decide to trust, and they tell the author why their text was rejected instead of silently dropping it.

---

# 7. Content

Content is Markdown. Materials may contain:

- headings, paragraphs, bold;
- bullet and numbered lists;
- tables (GitHub-flavoured);
- links to `http(s)` or internal pages;
- mathematical formulas in LaTeX, between `$…$` inline and `$$…$$` on their own line, rendered with KaTeX;
- code blocks (future).

Images are not yet used: no material references one, and there is no upload path for them.

Authored materials live in the seed content tree, one file per topic:

```
backend/prisma/seed/content/<subject>/materials/<topic-slug>.md
```

Each file opens with a `---` header carrying `title` and an optional `description`; the rest is the body. Prose is written as prose rather than escaped into a JSON string, so it stays readable in the editor where it is written. The filename is both the material slug and the slug of the topic it attaches to, which lets the seed match the two without a manifest.

Seeding upserts by `(subjectId, slug)`, so re-running it edits materials in place instead of accumulating copies. A file whose name matches no topic is reported and skipped — the name is meant to be a topic, so an unmatched one is a typo, not a subject-wide material.

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

Materials are currently **single-language** (Ukrainian), unlike subjects, topics, and questions, which carry translation rows.

The reason is practical rather than principled: a material is a long piece of prose, and a second language means writing it again, not translating a label. Adding translations later means a `LearningMaterialTranslation` table alongside the existing ones — the entity shape does not have to change.

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