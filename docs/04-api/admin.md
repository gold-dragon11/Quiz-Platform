# Admin API

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Admin API provides endpoints for managing educational content within the Quiz Platform.

It enables administrators to create, update, publish, archive, and organize learning resources.

Administrative endpoints are accessible only to authenticated users with administrative privileges.

---

# 2. Design Principles

The Admin API follows these principles:

- RESTful resource design;
- predictable endpoint naming;
- stateless communication;
- JSON request and response bodies;
- role-based authorization.

All administrative actions require authentication.

---

# 3. Authentication

Every request must include a valid access token.

Unauthenticated requests return:

```http
401 Unauthorized
```

Users without administrator permissions return:

```http
403 Forbidden
```

---

# 4. Subjects

## Get Subjects

```http
GET /api/v1/admin/subjects
```

Returns subjects — published and unpublished. Soft-deleted subjects are never returned.

Supported query parameters:

| Parameter | Default | Constraints |
|---|---|---|
| page | 1 | integer ≥ 1 |
| pageSize | 20 | integer 1–100 |
| isPublished | — | true or false |
| search | — | case-insensitive match against name and slug |
| sortBy | displayOrder | displayOrder, name, or createdAt |
| sortOrder | asc | asc or desc |

Responses use the pagination envelope (§12).

There is no single-subject endpoint — the list endpoint is the only read.

---

## Create Subject

```http
POST /api/v1/admin/subjects
```

Creates a new subject in the default locale (English). `locale` is not accepted here — translations are managed through Update Subject.

Required fields:

- name
- slug

Optional fields:

- description
- icon
- color
- displayOrder (append to the end — max + 1 — when omitted)

New subjects always start unpublished; publishing happens through Update Subject.

Responds `201 Created` with the created subject.

Uniqueness (all violations return `409 Conflict`):

- name — unique, including soft-deleted subjects (names stay reserved);
- slug — unique, including soft-deleted subjects (slugs stay reserved);
- displayOrder — unique among non-deleted subjects.

Field validation (`400 Bad Request` on violation):

- name: 1–100 characters;
- slug: 1–100 characters, `^[a-z0-9]+(?:-[a-z0-9]+)*$`;
- description: up to 500 characters;
- icon: up to 100 characters;
- color: hex `#RRGGBB`;
- displayOrder: integer ≥ 0.

---

## Update Subject

```http
PUT /api/v1/admin/subjects/{id}
```

Updates an existing subject using **merge semantics**: only supplied fields change, and an explicit `null` clears a nullable field (description, icon, color). Omitted fields are never touched — there is no destructive full replacement.

All Create Subject fields may be supplied, plus `isPublished` to publish or unpublish.

The same uniqueness and validation rules as Create Subject apply. Responds `200` with the updated subject; an unknown or deleted id returns `404 Not Found`.

### Localization

Update Subject accepts an optional `locale` field. When provided, the request upserts the SubjectTranslation for that locale instead of updating the default-locale record:

- only the localizable fields — `name` and `description` — may accompany `locale`; any other field returns `400`;
- `locale` must be a non-default locale — English content lives on the Subject itself;
- `name` is required when the translation does not exist yet;
- responds `200` with the translation (`locale`, `name`, `description`).

---

## Delete Subject

```http
DELETE /api/v1/admin/subjects/{id}
```

Performs a soft delete: the subject disappears from every listing, but its slug and name remain reserved, and historical learning data remains valid.

Responds `204 No Content`; an unknown or already-deleted id returns `404 Not Found`.

---

# 5. Topics

## Get Topics

```http
GET /api/v1/admin/topics
```

Returns topics — published and unpublished. Soft-deleted topics are never returned.

Supported query parameters:

| Parameter | Default | Constraints |
|---|---|---|
| page | 1 | integer ≥ 1 |
| pageSize | 20 | integer 1–100 |
| subjectId | — | UUID; restricts the list to one subject |
| isPublished | — | true or false |
| search | — | case-insensitive match against name and slug |
| sortBy | displayOrder | displayOrder, name, or createdAt |
| sortOrder | asc | asc or desc |

Responses use the pagination envelope (§12).

There is no single-topic endpoint — the list endpoint is the only read.

---

## Create Topic

```http
POST /api/v1/admin/topics
```

Creates a new topic in the default locale (English). `locale` is not accepted here — translations are managed through Update Topic.

Required fields:

- subjectId — the parent subject must exist and not be soft-deleted, otherwise `404 Not Found`;
- name
- slug

Optional fields:

- description
- displayOrder (append at the end of the subject — max + 1 within it — when omitted)

New topics always start unpublished; publishing happens through Update Topic.

Responds `201 Created` with the created topic.

Uniqueness is scoped to the parent subject (violations return `409 Conflict`):

- name — unique within the subject, including soft-deleted topics (names stay reserved);
- slug — unique within the subject, including soft-deleted topics (slugs stay reserved);
- displayOrder — unique among the subject's non-deleted topics.

Different subjects may contain topics with identical names or slugs.

Field validation (`400 Bad Request` on violation):

- subjectId: UUID, required;
- name: 1–100 characters;
- slug: 1–100 characters, `^[a-z0-9]+(?:-[a-z0-9]+)*$`;
- description: up to 500 characters;
- displayOrder: integer ≥ 0.

---

## Update Topic

```http
PUT /api/v1/admin/topics/{id}
```

Updates an existing topic using **merge semantics**: only supplied fields change, and an explicit `null` clears the nullable description. Omitted fields are never touched — there is no destructive full replacement.

All Create Topic fields may be supplied except `subjectId` — a topic cannot be moved to another subject — plus `isPublished` to publish or unpublish.

The same uniqueness and validation rules as Create Topic apply. Responds `200` with the updated topic; an unknown or deleted id returns `404 Not Found`.

### Localization

Update Topic accepts an optional `locale` field. When provided, the request upserts the TopicTranslation for that locale instead of updating the default-locale record:

- only the localizable fields — `name` and `description` — may accompany `locale`; any other field returns `400`;
- `locale` must be a non-default locale — English content lives on the Topic itself;
- `name` is required when the translation does not exist yet;
- responds `200` with the translation (`locale`, `name`, `description`).

---

## Delete Topic

```http
DELETE /api/v1/admin/topics/{id}
```

Performs a soft delete: the topic disappears from every listing, but its name and slug remain reserved within its subject, and historical learning data remains valid.

Responds `204 No Content`; an unknown or already-deleted id returns `404 Not Found`.

---

# 6. Questions

## Get Questions

```http
GET /api/v1/admin/questions
```

Returns questions — published and unpublished. Soft-deleted questions are never returned.

Supported query parameters:

| Parameter | Default | Constraints |
|---|---|---|
| page | 1 | integer ≥ 1 |
| pageSize | 20 | integer 1–100 |
| topicId | — | UUID |
| subjectId | — | UUID; filters through the topic relation |
| type | — | SINGLE_CHOICE or MATCHING |
| difficulty | — | BEGINNER, INTERMEDIATE, or ADVANCED |
| isPublished | — | true or false |
| search | — | case-insensitive match against the title |
| sortBy | createdAt | createdAt or title |
| sortOrder | desc | asc or desc |

Responses use the pagination envelope (§12). Every item includes its answer options (with `isCorrect`) and its `configuration` — there is no single-question endpoint, so the list is the editing source.

---

## Create Question

```http
POST /api/v1/admin/questions
```

Creates a new question with its answer options, in the default locale (English). `locale` is not accepted here — translations are managed through Update Question.

Required fields:

- topicId — the parent topic must exist and not be soft-deleted, otherwise `404 Not Found`;
- type — SINGLE_CHOICE or MATCHING (Multiple Choice is future);
- title (plain text and/or raw LaTeX);
- options — 2 to 20 answer options.

Optional fields:

- imageUrl
- difficulty
- configuration (MATCHING only — see below)

Each option carries `content` (required, text and/or LaTeX), optional `imageUrl`, optional `isCorrect` (SINGLE_CHOICE only), and optional `order`. Either every option provides `order` or none does — when omitted, order is assigned from array position. Option ids are not accepted at creation.

Correctness rules by type:

- **SINGLE_CHOICE** — exactly one option has `isCorrect: true`; `configuration` is not allowed.
- **MATCHING** — `isCorrect` is not accepted on options; `configuration` is required and defines the correct pairs by option order:

```json
{ "pairs": [ { "left": 0, "right": 1 }, { "left": 2, "right": 3 } ] }
```

Every option order must appear in exactly one pair.

New questions always start unpublished; publishing happens through the publish endpoint (§10). `explanation` is not part of the MVP schema and is rejected. `isPublished` is likewise rejected.

Responds `201 Created` with the created question, including its options.

---

## Update Question

```http
PUT /api/v1/admin/questions/{id}
```

Updates an existing question using **merge semantics**: only supplied fields change; explicit `null` clears the nullable imageUrl and difficulty.

Not updatable here:

- `type` — immutable; create a new question instead;
- `isPublished` — changes only through the publish endpoint (§10);
- `explanation` — not part of the MVP schema.

When the request includes `options`, the array is the complete desired option set, **merged by id**:

- an entry with an `id` updates that option (omitted fields keep their values);
- an entry without an `id` creates a new option;
- persisted options missing from the array are deleted.

Omitting `options` entirely leaves the option set untouched. After every update the complete option set and configuration are re-validated against the question type; the same rules as Create Question apply. The whole update is atomic.

Responds `200` with the updated question; an unknown or deleted id returns `404 Not Found`.

### Localization

Update Question accepts an optional `locale` field. When provided, the request upserts translations instead of updating the default-locale record:

- `title` upserts the QuestionTranslation for that locale;
- `options` entries of the form `{ "id": "...", "content": "..." }` upsert AnswerOptionTranslations — each id must belong to this question;
- only `title` and `options` may accompany `locale`; any other field returns `400`;
- `locale` must be a non-default locale — English content lives on the Question and its options;
- `title` is required when the question's translation does not exist yet;
- responds `200` with the written translation (`locale`, `title`, `options`).

---

## Delete Question

```http
DELETE /api/v1/admin/questions/{id}
```

Performs a soft delete: the question disappears from every listing. Historical Quiz Sessions remain unaffected.

Responds `204 No Content`; an unknown or already-deleted id returns `404 Not Found`.

---

Field validation (`400 Bad Request` on violation):

- title: 1–2000 characters;
- option content: 1–500 characters;
- imageUrl (question and options): up to 500 characters;
- options: 2–20 entries;
- order: integer ≥ 0, unique within the question;
- type and difficulty: enum values.

Question titles have no uniqueness requirement.

---

# 7. Answer Options

Answer Options are managed together with their parent Question — inline in Create Question and Update Question (§6).

Separate endpoints are not required in the MVP. Answer Options have no soft delete: they are created, updated, and deleted through their question's edits.

---

# 8. Quizzes

## Get Quizzes

```http
GET /api/v1/admin/quizzes
```

Returns all Quiz configurations.

Supports filtering by subject, topic, and published status, plus pagination.

---

## Create Quiz

```http
POST /api/v1/admin/quizzes
```

Creates a new reusable Quiz configuration.

Required fields:

- subjectId
- title
- mode
- questionCount

Optional fields:

- topicId
- description
- timerEnabled
- isPublished

---

## Update Quiz

```http
PUT /api/v1/admin/quizzes/{id}
```

Updates an existing Quiz configuration.

Existing Quiz Sessions generated from this Quiz are unaffected — they preserve the configuration used at the time they were created.

---

## Delete Quiz

```http
DELETE /api/v1/admin/quizzes/{id}
```

Performs a soft delete.

Historical Quiz Sessions that reference this Quiz remain valid.

---

# 9. Learning Materials

Reserved for future implementation.

Future endpoints:

```http
GET /api/v1/admin/learning-materials

POST /api/v1/admin/learning-materials

PUT /api/v1/admin/learning-materials/{id}

DELETE /api/v1/admin/learning-materials/{id}
```

---

# 10. Publishing

Content can be published or unpublished.

Subjects and Topics change publication state through their Update endpoints (`isPublished` in the PUT body, §4-5).

Questions use a dedicated endpoint — the only way their publication state changes:

```http
PATCH /api/v1/admin/questions/{id}/publish
```

Request body:

```json
{ "isPublished": true }
```

Publication re-validates the question: invalid questions cannot be published. Responds `200` with the updated question; an unknown or deleted id returns `404 Not Found`.

Publishing changes visibility without affecting historical data.

---

# 11. Bulk Operations

Future versions may support:

- bulk publish;
- bulk archive;
- bulk delete;
- bulk import;
- bulk export.

Not included in the MVP.

---

# 12. Pagination

Collection endpoints support pagination.

Example query:

```http
GET /api/v1/admin/questions?page=1&pageSize=20
```

Responses include:

- items;
- page;
- pageSize;
- totalItems;
- totalPages.

---

# 13. Filtering

Supported filters include:

Subjects

Topics

Question Type

Difficulty

Published Status

Creation Date

Search Text

Filters may be combined.

---

# 14. Validation

The API validates:

- required fields;
- unique constraints;
- foreign key references;
- supported question types;
- content consistency.

Invalid requests return:

```http
400 Bad Request
```

---

# 15. Error Responses

Standard HTTP status codes:

| Status | Meaning |
|---------|---------|
| 200 | Success |
| 201 | Resource Created |
| 204 | Resource Deleted |
| 400 | Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Resource Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

All errors return a consistent JSON structure.

---

# 16. Versioning

All endpoints in this document use versioned paths, as shown throughout (`/api/v1/admin/...`).

Future breaking changes should introduce a new API version — for example, `/api/v2/admin/...` — rather than modifying existing v1 behavior.

---

# 17. Future Improvements

Possible future endpoints include:

- Import Questions
- Export Questions
- AI Question Generation
- Question Review Workflow
- Draft System
- Audit Logs
- Content Version History

These features are outside the MVP.

---

# 18. Success Criteria

The Admin API is considered successful if it:

- securely manages educational content;
- provides consistent REST endpoints;
- validates all incoming data;
- preserves historical learning integrity;
- supports future platform expansion.