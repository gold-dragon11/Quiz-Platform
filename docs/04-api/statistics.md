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

Response includes:

- total XP;
- current level;
- completed quizzes;
- average accuracy;
- total questions answered;
- total correct answers;
- total study time.

---

# 5. Subject Statistics

## Retrieve Statistics by Subject

```http
GET /api/v1/statistics/subjects
```

Returns learning statistics grouped by subject.

Each subject includes:

- completed quizzes;
- average accuracy;
- earned XP;
- total questions answered.

---

# 6. Topic Statistics

## Retrieve Statistics by Topic

```http
GET /api/v1/statistics/topics
```

Returns learning statistics grouped by topic.

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

Returns the user's latest quiz sessions.

Each item may include:

- quiz date;
- subject;
- topic;
- score;
- earned XP.

Supports pagination.

---

# 9. Performance Trends

## Retrieve Learning Trends

```http
GET /api/v1/statistics/trends
```

Returns historical learning metrics.

Examples include:

- quiz activity over time;
- accuracy trend;
- XP progression.

The API returns data optimized for chart visualization.

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