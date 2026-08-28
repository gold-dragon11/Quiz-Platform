# Learning Materials API

**Document Version:** 1.0  
**Status:** Implemented  
**Last Updated:** August 2026

---

# 1. Purpose

The Learning Materials API serves the study notes that accompany quizzes.

A material is the theory behind one topic: definitions, worked examples, and the mistakes learners typically make. It is offered in two places — next to a topic in the subject browser, and on the result page of a quiz on that topic, where the reader has just seen what they missed.

Learners read materials; they never write them. Authoring happens either in the seed content files or through the Admin API.

---

# 2. Design Principles

- Read-only for learners; all writes are administrator-only.
- Content is stored and served as **Markdown**, never as HTML.
- Visibility follows the same publication chain as questions: subject → topic → material.
- "Not published" and "does not exist" are indistinguishable to a learner.
- Reading time is derived, never authored, so it cannot drift from the text.

---

# 3. Authentication

All endpoints require authentication.

```http
Authorization: Bearer <access_token>
```

Unauthorized requests return `401 Unauthorized`. Administrative endpoints additionally require the `ADMIN` role and return `403 Forbidden` otherwise.

---

# 4. Public Endpoints

## Get the material for a topic

```http
GET /api/v1/topics/{topicId}/material
```

Returns the published material attached to the topic.

```json
{
  "id": "c5f93de9-fee7-479a-922e-1c86f2a104a5",
  "subjectId": "878c42c1-d8ad-4fe9-b20b-ceea1ac87358",
  "topicId": "ff6c5410-a6df-48fe-ba59-683e427667cb",
  "title": "Київська Русь",
  "slug": "kyivan-rus",
  "description": "Від Олега до монгольської навали.",
  "content": "## Утворення держави\n\n…",
  "estimatedReadingTime": 5
}
```

`subjectId` is included so the reader can start a quiz on the topic without a second request.

Responses:

| Status | Meaning |
|--------|---------|
| 200 | The published material |
| 401 | Not authenticated |
| 404 | No material, an unpublished material, an unpublished topic, or an unpublished subject |

The four 404 cases are deliberately identical: the endpoint reveals nothing about unpublished content.

## List the materials of a subject

```http
GET /api/v1/subjects/{subjectId}/materials
```

Returns every published material of the subject in `displayOrder` ascending, **without** the bodies.

```json
[
  {
    "id": "c5f93de9-fee7-479a-922e-1c86f2a104a5",
    "topicId": "ff6c5410-a6df-48fe-ba59-683e427667cb",
    "title": "Київська Русь",
    "slug": "kyivan-rus",
    "description": "Від Олега до монгольської навали.",
    "estimatedReadingTime": 5
  }
]
```

This exists so a topic list can tell which topics have a material in one request rather than one per topic. An unknown or unpublished subject returns an empty list — again, indistinguishable from a subject with no materials.

---

# 5. Administrative Endpoints

All routes below are administrator-only.

## List

```http
GET /api/v1/admin/learning-materials
```

Paginated. Query parameters: `page`, `pageSize`, `subjectId`, `topicId`, `isPublished`, `search` (title or slug), `sortBy`, `sortOrder`.

Unpublished and unattached materials are included; soft-deleted ones are not.

## Create

```http
POST /api/v1/admin/learning-materials
```

```json
{
  "subjectId": "…",
  "topicId": "…",
  "title": "Квадратична функція",
  "slug": "quadratic-functions",
  "description": "Парабола та її властивості.",
  "content": "## Означення\n\n$y = ax^2 + bx + c$, де $a \\ne 0$."
}
```

`isPublished` is not accepted — a new material always starts unpublished, so a half-written note is never visible. `estimatedReadingTime` is not accepted either: the service derives it. `displayOrder` may be omitted, and the material is appended to the end of its subject.

Returns `201` with the full record.

## Update

```http
PUT /api/v1/admin/learning-materials/{id}
```

Merge semantics — only supplied fields change. Explicit `null` clears `description` and detaches the material from its topic. `subjectId` is immutable (moving a material would break the slug reservation it holds), and `estimatedReadingTime` stays derived; both are rejected by the whitelist pipe with `400`.

Changing `content` recomputes the reading time.

## Delete

```http
DELETE /api/v1/admin/learning-materials/{id}
```

Soft delete. Returns `204`. The slug stays reserved afterwards; a repeated delete returns `404`.

---

# 6. Validation

| Rule | Failure |
|------|---------|
| `subjectId` references an existing subject | 404 |
| `topicId`, when given, belongs to that subject | 400 |
| `slug` matches `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 100 characters | 400 |
| `slug` is unused in the subject (including by deleted materials) | 409 |
| `displayOrder`, when given, is unused among the subject's visible materials | 409 |
| `title` is non-empty, ≤ 200 characters | 400 |
| `content` is non-empty, ≤ 20 000 characters | 400 |
| `content` contains no raw HTML tags | 400 |
| `content` has no `javascript:`, `data:`, or `vbscript:` links | 400 |

The last two rules are not the only defence — the renderer has raw HTML disabled — but they keep stored content free of markup a future renderer might decide to trust, and they make the rule visible to the author instead of silently dropping text.

---

# 7. Content Format

`content` is Markdown:

- headings, paragraphs, bold, lists;
- tables (GitHub-flavoured);
- links (`http(s)` and internal only);
- LaTeX between `$…$` (inline) and `$$…$$` (display), rendered with KaTeX.

Raw HTML is rejected on write and escaped on render.

Authored materials live in the seed content tree as one file per topic:

```
backend/prisma/seed/content/<subject>/materials/<topic-slug>.md
```

Each file opens with a `---` header carrying `title` and optional `description`; the rest is the body. The filename is both the material slug and the slug of the topic it attaches to, so the seed can match them without a manifest. Seeding is idempotent by `(subjectId, slug)`; a file whose name matches no topic is reported and skipped rather than attached to nothing.

---

# 8. Error Format

Errors use the platform-wide shape:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Навчальний матеріал не знайдено.",
  "path": "/api/v1/topics/…/material",
  "timestamp": "2026-08-28T10:42:19.317Z"
}
```

Learner-facing messages are Ukrainian; administrative validation messages follow the Admin API convention and stay in English.
