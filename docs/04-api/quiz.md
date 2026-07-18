# Quiz API

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Quiz API manages the complete quiz lifecycle.

It allows users to start quizzes, retrieve questions, submit answers, complete quiz sessions, and receive final results.

The Quiz API is the primary entry point for all learning activities.

---

# 2. Design Principles

The Quiz API follows these principles:

- Session-based workflow
- Stateless HTTP communication
- Secure question delivery
- No answer leakage
- RESTful resource design

The backend controls quiz generation and session integrity.

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

# 4. Start Quiz

## Create Quiz Session

```http
POST /api/v1/quiz/start
```

Creates a new Quiz Session.

Request may include:

- quizId (optional — starts a session from a stored Quiz configuration)
- subjectId (required if quizId is not provided)
- topicId (optional)
- questionCount (required if quizId is not provided)
- timerEnabled (required if quizId is not provided)

If quizId is provided, the Subject, Topic, question count, and timer default are loaded from the referenced Quiz. Otherwise, the session is generated ad hoc directly from subjectId/topicId, following the Subject Quiz and Random Quiz modes.

The backend:

- creates QuizSession;
- selects random questions;
- stores the generated question set.

Response:

```http
201 Created
```

Returns:

- sessionId
- quiz metadata

---

# 5. Get Quiz Questions

## Retrieve Session Questions

```http
GET /api/v1/quiz/{sessionId}/questions
```

Returns the questions assigned to the Quiz Session.

Each question includes:

- text;
- type;
- image (optional);
- LaTeX (optional);
- answer options.

Correct answers are never returned.

---

# 6. Submit Answer

## Save User Answer

```http
POST /api/v1/quiz/{sessionId}/answers
```

Creates or updates a QuestionAttempt.

Request includes:

- questionId
- selectedAnswer

The backend validates:

- session ownership;
- question belongs to session;
- session is active.

---

# 7. Complete Quiz

## Finish Quiz

```http
POST /api/v1/quiz/{sessionId}/complete
```

Completes the Quiz Session.

The backend:

1. finalizes QuestionAttempts;
2. calculates Result;
3. awards XP;
4. updates Statistics;
5. closes the Quiz Session.

The operation is atomic.

---

# 8. Get Quiz Result

## Retrieve Result

```http
GET /api/v1/quiz/{sessionId}/result
```

Returns:

- score;
- accuracy;
- correct answers;
- incorrect answers;
- unanswered questions;
- earned XP.

Question explanations will be included here once the Explanation field is introduced; it is not part of the MVP question schema (see the Question domain documentation).

---

# 9. Resume Quiz

## Continue Active Session

```http
GET /api/v1/quiz/{sessionId}
```

Returns the current Quiz Session state.

Used when:

- refreshing the page;
- reopening the application;
- recovering an interrupted session.

---

# 10. Cancel Quiz

Reserved for future implementation.

Possible endpoint:

```http
DELETE /api/v1/quiz/{sessionId}
```

Not included in the MVP.

---

# 11. Timer

When enabled:

- remaining time is tracked by the backend;
- expired sessions are completed automatically.

The client displays the countdown.

---

# 12. Validation

The API validates:

- authenticated user;
- if quizId is provided, that the Quiz exists, is published, and its Subject/Topic match the request;
- active Quiz Session;
- session ownership;
- valid answers;
- completed state.

Invalid operations return appropriate HTTP errors.

---

# 13. Error Responses

Standard HTTP status codes:

| Status | Meaning |
|---------|---------|
| 200 | Success |
| 201 | Quiz Created |
| 400 | Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Session Not Found |
| 409 | Invalid Quiz State |
| 500 | Internal Server Error |

All errors follow a consistent JSON structure.

---

# 14. Security

The Quiz API never exposes:

- correct answers before completion;
- unpublished questions;
- internal scoring rules;
- questions from another user's session.

Every request is validated against the authenticated user.

---

# 15. Future Improvements

Possible future features include:

- Adaptive Quizzes
- AI Question Selection
- Multiplayer Quizzes
- Practice Mode
- Retry Incorrect Answers
- Offline Quiz Synchronization

These features are outside the MVP.

---

# 16. Success Criteria

The Quiz API is considered successful if it:

- securely manages quiz sessions;
- prevents answer leakage;
- preserves session integrity;
- supports reliable result calculation;
- integrates seamlessly with XP and Statistics.