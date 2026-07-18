# Statistics

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Statistics entity represents aggregated learning data for a user.

It summarizes the user's overall learning progress across all completed Quiz Sessions.

Statistics provide users with insights into their long-term performance rather than individual quiz results.

---

# 2. Responsibilities

The Statistics entity is responsible for:

- storing aggregated learning metrics;
- tracking long-term progress;
- supporting dashboard visualizations;
- providing data for analytics.

Statistics do not store individual quiz results.

---

# 3. Relationships

Statistics:

- belong to exactly one User;
- are derived from completed Quiz Sessions;
- are updated after each completed quiz.

Relationship summary:

User (1)

↓

Statistics (1)

↑

QuizSession (N)

↓

Result (N)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| userId | UUID | Yes | Owner of the statistics |
| totalQuizzes | Integer | Yes | Total completed quizzes |
| totalQuestions | Integer | Yes | Total answered questions |
| correctAnswers | Integer | Yes | Total correct answers |
| incorrectAnswers | Integer | Yes | Total incorrect answers |
| totalXP | Integer | Yes | Total earned XP |
| averageAccuracy | Decimal | Yes | Average quiz accuracy |
| totalLearningTimeSeconds | Integer | Yes | Total learning time |
| currentStreak | Integer | Yes | Current learning streak (future) |
| longestStreak | Integer | Yes | Longest learning streak (future) |
| updatedAt | DateTime | Yes | Last update timestamp |

---

# 5. Business Rules

Statistics:

- belong to one User;
- are automatically updated;
- cannot be edited manually;
- represent cumulative learning progress.

Statistics are recalculated after every completed Quiz Session.

---

# 6. Calculation

Statistics are derived from:

- Quiz Sessions;
- Results;
- XP Transactions.

No user input directly modifies Statistics.

---

# 7. Dashboard Usage

Statistics power the Dashboard.

Examples include:

- Total XP
- Completed Quizzes
- Average Accuracy
- Learning Time
- Progress Overview

Statistics should provide an immediate overview of learning progress.

---

# 8. Historical Integrity

Statistics summarize historical data.

Historical Quiz Sessions remain the source of truth.

If Statistics are lost, they can be fully rebuilt from historical records.

---

# 9. Validation Rules

The system validates:

- User exists;
- aggregated values remain consistent;
- values are never negative.

Statistics should always reflect completed Quiz Sessions.

---

# 10. Future Metrics

Future versions may include:

- Subject Performance
- Topic Performance
- Weak Topics
- Strong Topics
- Learning Heatmap
- Weekly Activity
- Monthly Progress
- Accuracy Trends
- Average Response Time
- Personal Bests

These metrics are outside the MVP.

---

# 11. Constraints

The Statistics entity:

- stores aggregated values only;
- contains no quiz content;
- contains no answer content;
- contains no business logic.

Calculations are performed by dedicated services.

---

# 12. Non-Functional Requirements

The Statistics entity should:

- support fast dashboard loading;
- remain lightweight;
- scale efficiently;
- be easily recalculated.

Statistics should optimize read performance while preserving consistency.

---

# 13. Success Criteria

The Statistics entity is considered successful if it:

- accurately summarizes user progress;
- updates automatically after completed quizzes;
- powers dashboard analytics;
- remains consistent with historical data;
- supports future analytical features.