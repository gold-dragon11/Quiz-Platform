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

Creates a new Quiz Session, generated ad hoc. (`quizId` templates are reserved for a later phase and not accepted yet.)

Request body:

- subjectId (required)
- topicId (optional)
- questionCount (required, 1–50)
- timerEnabled (required)

The `mode` is derived from `topicId`: present → `SUBJECT_QUIZ`, absent → `RANDOM_QUIZ`.

The backend, in a single transaction:

- verifies the user has no other active session (otherwise `409 Conflict`);
- selects `questionCount` random questions whose full publication chain holds (question, topic, and subject all published and not deleted);
- if fewer eligible questions exist than requested, creates nothing and returns `409 Conflict`;
- creates the QuizSession directly as **Active**, stores the fixed question set, and — when the timer is enabled — stores the deadline (`60 seconds × questionCount`).

Only one Active session may exist per user at a time.

Response `201 Created` returns the session metadata: sessionId, mode, subjectId, topicId, questionCount, timerEnabled, status, startedAt, expiresAt.

---

# 5. Get Quiz Questions

## Retrieve Session Questions

```http
GET /api/v1/quiz/{sessionId}/questions
```

Returns the questions assigned to the Quiz Session, in their fixed order, localized (optional `locale` query — resolved against the user's language, falling back to English).

Each question includes:

- id;
- type;
- title (text and/or LaTeX);
- difficulty;
- imageUrl (optional);
- answerOptions — each with id, content, imageUrl, order.

Correct answers are **never** returned while the session is active: `AnswerOption.isCorrect` and (for Matching) the question `configuration` are withheld — the client submits its guesses and the backend evaluates. These values become available only in the result review after completion.

---

# 6. Submit Answer

## Save User Answer

```http
POST /api/v1/quiz/{sessionId}/answers
```

Creates or updates a QuestionAttempt (upsert keyed by session + question). Answers may be changed until completion; the latest submission wins.

Request body:

- questionId
- selectedAnswer — shape depends on the question type:
  - Single Choice: `{ "answerOptionId": "uuid" }`
  - Matching: `{ "pairs": [ { "left": "uuid", "right": "uuid" } ] }`
- timeSpentSeconds (optional, analytics only — never affects scoring or XP)

The backend validates session ownership (a foreign or unknown session is `404`), that the question belongs to the session's fixed set (`404` otherwise), and that the session is active (`409` otherwise — including a session whose timer has expired, which is auto-completed on access). The submitted answer must reference options that belong to the question, otherwise `400`; a well-formed but wrong answer is accepted and recorded as incorrect.

Correctness is evaluated immediately and stored, but is **never** returned here. Responds `200` echoing the saved `questionId` and `selectedAnswer`.

---

# 7. Complete Quiz

## Finish Quiz

```http
POST /api/v1/quiz/{sessionId}/complete
```

Completes the Quiz Session. In a single atomic transaction, guarded so it can only succeed once, the backend:

1. flips the session from Active to Completed (a second attempt returns `409`);
2. calculates the Result from the stored QuestionAttempts;
3. awards XP;
4. updates Statistics;
5. stamps completion time and server-computed duration.

**Scoring:** `score = accuracy = correctAnswers ÷ totalQuestions × 100`, stored to two decimals. Unanswered questions count against the total (i.e. as incorrect). Matching is all-or-nothing.

**XP:** a `QUIZ_COMPLETION` transaction of `round(accuracy)` XP is always recorded (even 0). When the exact accuracy is ≥ 90.00%, an additional `HIGH_ACCURACY_BONUS` transaction of 25 XP is recorded. Examples: 82% → 82 XP; 91% → 91 + 25 = 116 XP; 100% → 100 + 25 = 125 XP.

Responds `200` with the aggregate result summary (counts, accuracy, score, xpEarned, completedAt).

---

# 8. Get Quiz Result

## Retrieve Result

```http
GET /api/v1/quiz/{sessionId}/result
```

Returns the full post-completion **review** — available only after the session is Completed (`409` otherwise):

- `result` — the aggregate: correctAnswers, incorrectAnswers, unansweredQuestions, totalQuestions, accuracy, score, xpEarned, completedAt;
- `questions` — for every question in the session: the question and its options, the user's `submittedAnswer` (null if unanswered), the `correctAnswer` (in the same shape as a submission — `{ optionId }` for Single Choice, `{ pairs: [{ left, right }] }` of option UUIDs for Matching), whether it `isCorrect`, and `explanation` (reserved; always null until the Explanation field is introduced).

The correct answer is only ever revealed here, after completion. The historical result, per-question correctness, score, and XP are immutable; note that the *displayed* correct answer reflects the current version of the question, so a later admin edit may change what the review shows (a known MVP limitation) while the frozen result stays unchanged.

---

# 9. Resume Quiz

## Continue Active Session

```http
GET /api/v1/quiz/{sessionId}
```

Returns the current Quiz Session state for recovery after a refresh or reconnect: the session metadata, its questions (same withheld-answer view as §5), and the user's own already-saved selections (`answers`). Correctness, correct answers, and Matching configuration are never included.

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