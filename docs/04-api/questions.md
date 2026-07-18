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

Returns all published Subjects, ordered by displayOrder.

Supported query parameters:

- locale (optional — defaults to the user's UserSettings.language, falling back to English)

Each Subject includes:

- id;
- name;
- slug;
- description;
- icon;
- color.

Unpublished Subjects are never returned.

---

## Get Topics

```http
GET /api/v1/topics
```

Returns published Topics for a Subject.

Supported query parameters:

- subjectId (required)
- locale (optional — defaults to the user's UserSettings.language, falling back to English)

Example:

```http
GET /api/v1/topics?subjectId=uuid
```

Each Topic includes:

- id;
- name;
- slug;
- description;
- displayOrder.

Unpublished Topics are never returned.

---

# 5. Get Question

## Retrieve Question

```http
GET /api/v1/questions/{id}
```

Returns a single question.

Supported query parameters:

- locale (optional — defaults to the user's UserSettings.language, falling back to English)

The response includes:

- question ID;
- question type;
- question text;
- optional image;
- optional LaTeX content;
- answer options.

Correct answers are never included.

---

# 6. Get Questions by Topic

## Retrieve Topic Questions

```http
GET /api/v1/questions
```

Supported query parameters:

- topicId
- page
- pageSize
- locale (optional — defaults to the user's UserSettings.language, falling back to English)

Example:

```http
GET /api/v1/questions?topicId=uuid&page=1&pageSize=20
```

This endpoint is primarily intended for administrative previews or future learning features, not for active quiz sessions.

---

# 7. Question Response

Each question may contain:

- text;
- image;
- LaTeX expressions;
- explanation (future — not part of the MVP schema, see §11);
- answer options.

The client should render the content according to the question type.

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
