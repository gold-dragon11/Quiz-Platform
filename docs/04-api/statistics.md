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

- totalXP;
- currentLevel;
- completedQuizzes;
- averageAccuracy (cumulative: correctAnswers ÷ totalQuestions × 100);
- totalQuestions;
- correctAnswers;
- totalStudyTime (seconds);
- xpForCurrentLevel, xpForNextLevel, xpIntoLevel, completionPercent.

Internal fields (incorrect answers, streaks, raw records) are never exposed. A user with no completed quizzes receives a well-formed zero payload (level 1, 0 XP) rather than an empty response.

### Level formula

Level is derived from total XP with a linear MVP progression of 100 XP per level:

- `currentLevel = floor(totalXP / 100) + 1`
- `xpForCurrentLevel = (currentLevel - 1) × 100`
- `xpForNextLevel = currentLevel × 100`
- `xpIntoLevel = totalXP - xpForCurrentLevel`
- `completionPercent = (xpIntoLevel / 100) × 100`

The formula is isolated in a dedicated service so the curve can evolve without changing the API.

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
- averageAccuracy (correctAnswers ÷ totalQuestions × 100 for that subject);
- earnedXP.

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
- averageAccuracy;
- earnedXP.

This endpoint supports progress tracking within individual topics.

---

# 7. Progress Summary

## Retrieve Progress Overview

```http
GET /api/v1/statistics/progress
```

Returns high-level progress information.

Typical response includes:

- current level;
- total XP;
- XP required for next level;
- completion percentage.

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
- xpEarned;
- completedAt.

Names are localized (see §10a). In-progress sessions never appear.

---

# 9. Performance Trends

## Retrieve Learning Trends

```http
GET /api/v1/statistics/trends
```

**Deferred.** Trend/chart data (quiz activity over time, accuracy trend, XP progression) is not part of the MVP statistics API; it is deferred to the future analytics phase, where its bucket granularity, time window, and response schema will be specified. This endpoint is not implemented.

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