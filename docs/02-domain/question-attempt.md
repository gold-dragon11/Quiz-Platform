# Question Attempt

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The QuestionAttempt entity represents a user's interaction with a single question during a Quiz Session.

Each QuestionAttempt records the answer submitted by the user and serves as the foundation for result calculation, statistics, and learning analytics.

QuestionAttempt represents historical data and must remain immutable after quiz completion.

---

# 2. Responsibilities

The QuestionAttempt entity is responsible for:

- recording the user's submitted answer;
- linking a question to a quiz session;
- storing evaluation results;
- supporting historical analysis.

The entity contains no scoring logic.

---

# 3. Relationships

A QuestionAttempt:

- belongs to exactly one QuizSession;
- references exactly one Question;
- contributes to exactly one Result.

Relationship summary:

QuizSession (1)

↓

QuestionAttempt (N)

↓

Question (1)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| quizSessionId | UUID | Yes | Parent quiz session |
| questionId | UUID | Yes | Referenced question |
| selectedAnswer | JSON | No | User's submitted answer(s) |
| isCorrect | Boolean | Yes | Evaluation result |
| answeredAt | DateTime | Yes | Submission timestamp |
| timeSpentSeconds | Integer | No | Time spent on the question |
| createdAt | DateTime | Yes | Creation timestamp |

---

# 5. Business Rules

A QuestionAttempt:

- belongs to one QuizSession;
- references one Question;
- stores the submitted answer exactly as provided;
- cannot exist without a QuizSession.

Once the QuizSession is completed, the QuestionAttempt becomes immutable.

---

# 6. Answer Storage

The selected answer is stored in a flexible structure.

Examples:

Single Choice

```json
{
  "answerOptionId": "UUID"
}
```

Matching

```json
{
  "pairs": [
    {
      "left": "UUID",
      "right": "UUID"
    }
  ]
}
```

This approach allows support for future question types without modifying the domain model.

Both Single Choice `answerOptionId` and Matching `left`/`right` values are **Answer Option UUIDs**. Matching correctness is stored on the Question as `configuration` using option *order* values; the evaluator translates the submitted UUIDs to orders to compare them. The submitted answer is always stored verbatim, exactly as the user provided it.

There is at most one QuestionAttempt per question per session (a unique constraint on `quizSessionId + questionId`); re-answering upserts the same row, and the latest submission wins.

---

# 7. Validation Rules

The system validates:

- referenced QuizSession exists;
- referenced Question exists;
- answer format matches the question type;
- submitted answer is structurally valid.

Invalid submissions are rejected.

---

# 8. Evaluation

After submission, each QuestionAttempt records:

- whether the answer is correct;
- submission time;
- time spent.

The evaluation result is stored to preserve historical accuracy.

---

# 9. Time Tracking

Time spent on each question is optional.

If enabled, it records the number of seconds between displaying the question and submitting the answer.

Time tracking is used only for analytics.

It does not affect scoring or XP.

---

# 10. Historical Integrity

QuestionAttempts must remain unchanged after quiz completion.

Even if a Question is later edited or deleted, historical QuestionAttempts should continue to represent the original quiz session accurately.

---

# 11. Future Improvements

Possible future enhancements include:

- Partial scoring
- Confidence rating
- Answer revisions during the session
- AI evaluation metadata
- Explanation viewed flag

These features are outside the MVP.

---

# 12. Constraints

The QuestionAttempt entity:

- stores user interaction only;
- contains no XP logic;
- contains no statistics calculations;
- does not modify Question data.

Business calculations are performed by dedicated services.

---

# 13. Non-Functional Requirements

The QuestionAttempt entity should:

- support efficient storage;
- scale to millions of records;
- preserve historical accuracy;
- remain independent of UI and presentation logic.

---

# 14. Success Criteria

The QuestionAttempt entity is considered successful if it:

- accurately records every user answer;
- supports all question types;
- preserves immutable historical data;
- provides reliable input for Results, Statistics, and XP;
- remains extensible for future quiz formats.