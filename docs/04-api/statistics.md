# Statistics API

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Statistics API provides read-only access to a user's learning statistics and progress.

Statistics are automatically calculated and updated by the backend after quiz completion.

Clients cannot modify statistics directly.

---

# 2. Design Principles

The Statistics API follows these principles:

- Read-only access
- RESTful resource design
- Fast response times
- Precomputed statistics
- Consistent JSON responses

Statistics are optimized for dashboard performance.

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

# 4. Get User Statistics

## Retrieve Overall Statistics

```http
GET /api/v1/statistics
```

Returns the authenticated user's overall learning statistics.

Response fields:

- completedQuizzes;
- averageAccuracy (cumulative: correctAnswers ÷ totalQuestions × 100);
- totalQuestions;
- correctAnswers;
- totalStudyTime (seconds).

Internal fields (incorrect answers, streaks, raw records) are never exposed. A user with no completed quizzes receives a well-formed zero payload rather than an empty response.

XP and the level are gone since 30.10.2026 (decision 46): XP was the quiz's accuracy paid out as points, so a five-question test at 100% outearned a mock paper at 80%, and the level unlocked nothing. What a learner has learned is in §7. The `xp_transactions` rows and `Statistics.totalXP` already written are kept as history; nothing reads or writes them.

---

# 5. Subject Statistics

## Retrieve Statistics by Subject

```http
GET /api/v1/statistics/subjects
```

Returns learning statistics grouped by subject, computed at request time from completed Quiz Sessions (no precomputed per-subject table). Only subjects the user has completed at least one quiz in are returned; the array is empty otherwise. Subject names are localized (see §10a). Supports an optional `locale` query parameter.

Each subject includes:

- subjectId;
- subjectName;
- completedQuizzes;
- totalQuestions;
- averageAccuracy (correctAnswers ÷ totalQuestions × 100 for that subject).

---

# 6. Topic Statistics

## Retrieve Statistics by Topic

```http
GET /api/v1/statistics/topics
```

Returns learning statistics grouped by topic, computed at request time. Only topics the user has completed at least one quiz in appear (topic-scoped sessions only — Random Quizzes without a topic are excluded). Supports an optional `subjectId` filter and an optional `locale` parameter. Names are localized (see §10a).

Each topic includes:

- topicId;
- topicName;
- subjectId;
- subjectName;
- completedQuizzes;
- totalQuestions;
- averageAccuracy.

This endpoint supports progress tracking within individual topics.

---

# 7. Progress

## Retrieve What the Learner Has Learned

```http
GET /api/v1/statistics/progress
```

Topics mastered per subject, each answered topic's state, and mistakes fixed (decision 46). Optional `locale`.

```json
{
  "subjects": [
    { "subjectId": "…", "subjectName": "Математика", "topicsTotal": 31, "mastered": 5, "inProgress": 3 }
  ],
  "topics": [{ "topicId": "…", "state": "MASTERED" }],
  "mistakesFixed": 37
}
```

- **A topic is `MASTERED`** when its last ten answers are at least 80% right and none of its questions waits on the mistake ladder. Answers count by the question's own topic, whatever the session was: a test, a mock paper, a review, homework or a duel. A topic with answers but not that yet is `IN_PROGRESS`; a topic never answered is not listed.
- **`subjects`** lists every published subject with its count of published topics, so a subject not started reads as «0 з 31» rather than missing.
- **`mistakesFixed`** counts the questions once answered wrong that have since cleared the whole ladder (1, 3 and 7 days).

The thresholds are `MASTERY_WINDOW` and `MASTERY_ACCURACY` in `statistics.service.ts`; the statistics page prints the rule under the figure, so the two must change together.

---

# 8. Recent Activity

## Retrieve Recent Quiz Activity

```http
GET /api/v1/statistics/recent
```

Returns the user's latest **completed** quiz sessions, newest first, using the standard pagination envelope (items, page, pageSize, totalItems, totalPages). Query parameters: `page` (default 1), `pageSize` (default 20, max 100), optional `locale`.

Each item includes:

- sessionId;
- subjectId, subjectName;
- topicId, topicName (null for Random Quizzes);
- score;
- accuracy;
- completedAt.

Names are localized (see §10a). In-progress sessions never appear.

---

# 8a. Mistakes

## Retrieve Unresolved Mistakes

```http
GET /api/v1/statistics/mistakes
```

Returns the topics the user still answers incorrectly, so they can practise exactly those instead of re-drawing random questions.

A question counts as a mistake when its **most recent** attempt by this user was wrong. Answering it correctly later removes it from the list — the list shrinks as the reader improves rather than accumulating every mistake ever made. Only questions that could actually be served again are counted: the full publication chain (question, topic, subject all published and not deleted) must hold.

Grouping is by the question's own topic, not the session's — a random subject-wide quiz stores no topic on the session, yet each of its questions belongs to one.

Each entry carries: `subjectId`, `subjectName`, `topicId`, `topicName`, `mistakeCount`, and `lastMistakeAt`. Entries are ordered by `mistakeCount` descending, then by most recent mistake.

`mistakeCount` is exactly the number of questions a practice quiz over that topic would draw from, so it can be passed straight to `POST /api/v1/quiz/start` as `questionCount` alongside `onlyMistakes: true` (Quiz API §4).

Accepts the optional `locale` query parameter (§9a).

---

# 9. Performance Trends

## Retrieve Learning Trends

```http
GET /api/v1/statistics/trends
```

**Deferred.** Trend/chart data (quiz activity over time, accuracy trend, mastery over time) is not part of the MVP statistics API; it is deferred to the future analytics phase, where its bucket granularity, time window, and response schema will be specified. This endpoint is not implemented.

---

# 9a. Localization

The subjects, topics, and recent-activity endpoints accept an optional `locale` query parameter. Locale is resolved as: the requested `locale`, then the user's language setting, then English — an unsupported value simply falls back. Subject and topic names use the translated value with per-record fallback, exactly like the Public Content API.

---

# 10. Validation

The API validates:

- authenticated user;
- resource ownership.

Users can access only their own statistics.

---

# 11. Error Responses

Standard HTTP status codes:

| Status | Meaning |
|---------|---------|
| 200 | Success |
| 400 | Invalid Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Resource Not Found |
| 500 | Internal Server Error |

All errors follow a consistent JSON structure.

---

# 12. Security

The Statistics API never exposes:

- statistics of other users;
- internal calculation logic;
- raw QuestionAttempt records;
- administrative metrics.

Only aggregated information is returned.

---

# 13. Performance

Statistics are precomputed and stored in the `Statistics` entity.

The API should avoid expensive runtime calculations.

Frequently requested data should be retrieved with a minimal number of database queries.

---

# 14. Future Improvements

Possible future endpoints include:

- Daily Progress
- Weekly Reports
- Monthly Reports
- Learning Heatmaps
- Subject Rankings
- Personal Bests
- Achievement Progress

These features are outside the MVP.

---

# 15. Success Criteria

The Statistics API is considered successful if it:

- provides fast access to learning metrics;
- accurately reflects user progress;
- supports dashboard visualization;
- scales efficiently with growing user activity;
- remains read-only and secure.