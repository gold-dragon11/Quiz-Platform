# Result

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Result entity represents the outcome of a completed Quiz Session.

It contains the final performance metrics for a single quiz attempt and serves as the source for XP rewards, statistics, and historical records.

Each Quiz Session produces exactly one Result.

---

# 2. Responsibilities

The Result entity is responsible for:

- storing final quiz performance;
- recording calculated metrics;
- providing historical quiz outcomes;
- serving as input for statistics and XP calculation.

The Result entity does not calculate values itself.

---

# 3. Relationships

A Result:

- belongs to exactly one QuizSession;
- belongs indirectly to one User through the QuizSession;
- generates one XPTransaction;
- contributes to Statistics.

Relationship summary:

QuizSession (1)

↓

Result (1)

↓

XPTransaction (1)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| quizSessionId | UUID | Yes | Related quiz session |
| correctAnswers | Integer | Yes | Number of correct answers |
| incorrectAnswers | Integer | Yes | Number of incorrect answers |
| unansweredQuestions | Integer | Yes | Number of unanswered questions |
| totalQuestions | Integer | Yes | Total number of questions |
| accuracy | Decimal | Yes | Accuracy percentage |
| score | Decimal | Yes | Final score |
| completedAt | DateTime | Yes | Completion timestamp |
| createdAt | DateTime | Yes | Creation timestamp |

---

# 5. Business Rules

A Result:

- belongs to one QuizSession;
- is created only after successful quiz completion;
- cannot exist without a completed QuizSession;
- becomes immutable after creation.

Only one Result may exist for each QuizSession.

---

# 6. Result Calculation

The Result is calculated using QuestionAttempts.

The calculation includes:

- correct answers;
- incorrect answers;
- unanswered questions;
- total questions;
- final accuracy.

The calculation is deterministic.

Identical QuestionAttempts always produce the same Result.

---

# 7. Score

The score represents the overall quiz performance.

For the MVP:

- Score is based entirely on quiz accuracy.

Future versions may include:

- weighted questions;
- difficulty modifiers;
- bonus scoring.

---

# 8. Accuracy

Accuracy is calculated as:

Correct Answers ÷ Total Questions × 100

Accuracy is stored as a percentage.

Example:

- 18 correct out of 20 questions = 90%.

---

# 9. Historical Integrity

A Result never changes after creation.

Even if:

- questions are edited;
- answer options change;
- scoring rules evolve.

Historical Results remain unchanged.

---

# 10. Validation Rules

Before creating a Result, the system validates:

- QuizSession is completed;
- all QuestionAttempts belong to the same QuizSession;
- calculated values are internally consistent.

Invalid Results cannot be created.

---

# 11. Future Improvements

Possible future enhancements include:

- Weighted Scoring
- Partial Credit
- Subject Breakdown
- Topic Breakdown
- AI Performance Analysis
- Personalized Recommendations

These features are outside the scope of the MVP.

---

# 12. Constraints

The Result entity:

- stores calculated values only;
- contains no question content;
- contains no answer content;
- contains no XP calculation logic.

Business calculations belong to dedicated services.

---

# 13. Non-Functional Requirements

The Result entity should:

- remain immutable;
- support efficient querying;
- scale with user activity;
- preserve historical accuracy.

---

# 14. Success Criteria

The Result entity is considered successful if it:

- accurately reflects quiz performance;
- provides reliable input for XP and Statistics;
- remains immutable after creation;
- supports future scoring enhancements;
- preserves historical learning records.