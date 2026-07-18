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

Returns all subjects.

Supports filtering, sorting, and pagination.

---

## Create Subject

```http
POST /api/v1/admin/subjects
```

Creates a new subject.

Required fields:

- name
- slug

Optional fields:

- description
- icon
- color
- displayOrder

---

## Update Subject

```http
PUT /api/v1/admin/subjects/{id}
```

Updates an existing subject.

---

## Delete Subject

```http
DELETE /api/v1/admin/subjects/{id}
```

Performs a soft delete.

Historical learning data must remain valid.

---

Create Subject and Update Subject both accept an optional `locale` field. When provided, the request creates or updates a SubjectTranslation instead of the default-locale record.

---

# 5. Topics

## Get Topics

```http
GET /api/v1/admin/topics
```

Returns all topics.

Supports filtering by subject.

---

## Create Topic

```http
POST /api/v1/admin/topics
```

Creates a new topic.

---

## Update Topic

```http
PUT /api/v1/admin/topics/{id}
```

Updates topic information.

---

## Delete Topic

```http
DELETE /api/v1/admin/topics/{id}
```

Performs a soft delete.

---

Create Topic and Update Topic both accept an optional `locale` field. When provided, the request creates or updates a TopicTranslation instead of the default-locale record.

---

# 6. Questions

## Get Questions

```http
GET /api/v1/admin/questions
```

Supports:

- pagination;
- search;
- filtering;
- sorting.

---

## Create Question

```http
POST /api/v1/admin/questions
```

Creates a new question.

Supported question types:

- Single Choice
- Multiple Choice (future)
- Matching

Supports:

- images;
- LaTeX;
- difficulty tagging.

Explanations are not part of the MVP question schema (future).

---

## Update Question

```http
PUT /api/v1/admin/questions/{id}
```

Updates an existing question.

---

## Delete Question

```http
DELETE /api/v1/admin/questions/{id}
```

Uses soft delete.

Historical Quiz Sessions remain unaffected.

---

Create Question and Update Question both accept an optional `locale` field. When provided, the request creates or updates a QuestionTranslation instead of the default-locale record.

---

# 7. Answer Options

Answer Options are managed together with their parent Question.

Separate endpoints are not required in the MVP.

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

Example endpoint:

```http
PATCH /api/v1/admin/questions/{id}/publish
```

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