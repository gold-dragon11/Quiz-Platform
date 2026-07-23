# Questions API

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Questions API provides read-only access to quiz questions for the Quiz Platform.

It is used during quiz generation and quiz sessions, and provides the Subject and Topic catalog used to initiate them.

The API never exposes correct answers before a quiz is completed.

---

# 2. Design Principles

The Questions API follows these principles:

- Read-only access
- Secure content delivery
- No answer leakage
- Stateless communication
- RESTful endpoint design

Question management is handled exclusively by the Admin API.

---

# 3. Authentication

All endpoints require authentication.

```http
Authorization: Bearer <access_token>
```

Unauthorized requests return:

```http
401 Unauthorized
```

---

# 4. Subjects and Topics

## Get Subjects

```http
GET /api/v1/subjects
```

Returns all published Subjects, ordered by displayOrder ascending. The list is complete — no pagination.

Supported query parameters:

- locale (optional — see §4a Localization)

Each Subject includes exactly:

- id;
- name;
- slug;
- description;
- icon;
- color.

Unpublished and soft-deleted Subjects are never returned.

---

## Get Topics

```http
GET /api/v1/subjects/{subjectId}/topics
```

Returns published Topics of one published Subject, ordered by displayOrder ascending. The list is complete — no pagination.

Supported query parameters:

- locale (optional — see §4a Localization)

Each Topic includes exactly:

- id;
- name;
- slug;
- description;
- displayOrder.

Unpublished and soft-deleted Topics are never returned. An unknown, unpublished, or soft-deleted Subject returns `404 Not Found` — all indistinguishable. A malformed subjectId returns `400`.

---

## 4a. Localization

Every public content endpoint accepts an optional `locale` query parameter (a language name, case-insensitive).

Resolution chain:

1. the requested `locale`, when it names a supported language;
2. otherwise the user's UserSettings.language;
3. otherwise English.

An unsupported `locale` value is never an error — it simply falls back.

Translated fields: subject name and description, topic name and description, question title, answer option content. A missing translation falls back to the default-locale (English) value stored on the record itself, field by field. Everything else always comes from the default records.

---

# 5. Get Questions by Topic

## Retrieve Topic Questions

```http
GET /api/v1/topics/{topicId}/questions
```

Returns published questions of one fully published Topic, newest first (createdAt descending), paginated.

Supported query parameters:

- page (default 1)
- pageSize (default 20, maximum 100)
- locale (optional — see §4a Localization)

Responses use the standard pagination envelope (items, page, pageSize, totalItems, totalPages).

A question is visible only when the entire publication chain holds:

- the question is published and not deleted;
- its topic is published and not deleted;
- the topic's subject is published and not deleted.

An unknown, unpublished, or soft-deleted topic — or a topic under an unpublished or deleted subject — returns `404 Not Found`, all indistinguishable. A malformed topicId returns `400`.

There is no single-question endpoint in the MVP; questions are always delivered through their topic.

---

# 6. Question Response

Each question carries exactly what taking a quiz requires:

- id;
- type;
- title (text and/or raw LaTeX, localized);
- difficulty;
- imageUrl;
- answerOptions — each with id, content (localized), imageUrl, order;
- configuration — MATCHING questions only; absent for SINGLE_CHOICE.

Never included:

- isCorrect;
- explanation;
- isPublished, deletedAt, timestamps, or any other internal metadata;
- raw translation records.

---

# 7. Rendering

The client should render the content according to the question type.

Answer options arrive in their stored order (0..n-1); the quiz engine may shuffle the presentation without modifying stored data.

---

# 8. Supported Question Types

Current MVP supports:

- Single Choice
- Matching

Future versions may include:

- Multiple Choice
- Ordering
- Fill in the Blank
- Numeric Answer
- True / False

The API is designed to support additional types without breaking existing clients.

---

# 9. Images

Questions may reference images.

Supported use cases:

- diagrams;
- charts;
- historical photos;
- geometric figures.

Image URLs are returned only when an image is attached.

---

# 10. LaTeX Support

Questions may include mathematical expressions.

The frontend is responsible for rendering LaTeX.

The API returns raw LaTeX strings.

---

# 11. Explanations

Explanations are not part of the MVP question schema (future) — see the Question domain documentation.

Once introduced, explanations will only be returned after a quiz is completed and results are calculated; they will never be exposed during an active quiz session.

---

# 12. Validation

The API validates:

- question exists;
- question is published;
- user has permission to access the content.

Invalid requests return:

```http
404 Not Found
```

or

```http
403 Forbidden
```

---

# 13. Error Responses

Standard HTTP status codes:

| Status | Meaning |
|---------|---------|
| 200 | Success |
| 400 | Invalid Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Question Not Found |
| 500 | Internal Server Error |

All errors return a consistent JSON structure.

---

# 14. Security

The Questions API never returns:

- correct answers;
- scoring rules;
- internal metadata;
- unpublished content.

Only information required to display the question is exposed.

---

# 15. Future Improvements

Possible future enhancements include:

- Question bookmarking
- Question reporting
- AI-generated hints
- Adaptive question delivery
- Rich media support
- Versioned questions

These features are outside the MVP.

---

# 16. Success Criteria

The Questions API is considered successful if it:

- delivers questions securely;
- prevents answer leakage;
- supports multiple question types;
- integrates seamlessly with Quiz Sessions;
- remains extensible for future content formats.
