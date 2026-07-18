# Quiz Session

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The QuizSession entity represents a single quiz attempt performed by a user.

It records the complete lifecycle of a quiz, from generation to completion, and serves as the primary source of historical learning data.

Every completed quiz creates exactly one QuizSession.

---

# 2. Responsibilities

The QuizSession entity is responsible for:

- tracking a quiz attempt;
- storing session metadata;
- linking questions and user answers;
- producing a Result;
- serving as the basis for statistics and XP.

The QuizSession does not calculate scores or XP itself.

---

# 3. Relationships

A QuizSession:

- belongs to exactly one User;
- may optionally reference the Quiz used to generate it;
- contains multiple QuestionAttempts;
- produces exactly one Result;
- contributes to Statistics;
- generates one XPTransaction after successful completion.

Relationship summary:

User (1)

↓

QuizSession (N) ── optional reference ──> Quiz (0..1)

↓

QuestionAttempt (N)

↓

Result (1)

↓

XPTransaction (1)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| userId | UUID | Yes | Owner of the session |
| quizId | UUID | No | Optional reference to the Quiz used to generate this session |
| subjectId | UUID | Yes | Selected subject |
| topicId | UUID | No | Selected topic (optional) |
| mode | Enum | Yes | Quiz mode |
| timerEnabled | Boolean | Yes | Timer state |
| questionCount | Integer | Yes | Number of generated questions |
| status | Enum | Yes | Session status |
| startedAt | DateTime | Yes | Quiz start time |
| completedAt | DateTime | No | Quiz completion time |
| durationSeconds | Integer | No | Total session duration |
| createdAt | DateTime | Yes | Creation timestamp |

---

# 5. Quiz Modes

Supported quiz modes:

- Subject Quiz
- Random Quiz

Future versions may introduce:

- Daily Challenge
- Practice Quiz
- Mock Exam
- Custom Quiz

The architecture should support additional quiz modes without redesign.

---

# 6. Session Lifecycle

A QuizSession progresses through the following states:

Draft *(temporary during generation)*

↓

Active

↓

Completed

or

Abandoned *(future)*

Only completed sessions generate Results and XP.

---

# 7. Business Rules

A QuizSession:

- belongs to one User;
- contains at least one QuestionAttempt;
- may only be completed once;
- becomes immutable after completion.

Historical sessions must never be modified.

---

# 8. Question Snapshot

At the start of a session, the selected questions are fixed.

Subsequent edits to the Question Bank must not affect completed sessions.

Historical accuracy is mandatory.

---

# 9. Timer

A QuizSession may be created with:

- Timer Enabled
- Timer Disabled

The timer configuration remains fixed throughout the session.

---

# 10. Completion

A QuizSession is completed when:

- the user submits the quiz;
- the timer expires;
- the user finishes early.

Completion immediately triggers result calculation.

---

# 11. Cancellation

Future versions may support abandoned sessions.

Abandoned sessions:

- do not award XP;
- do not generate Results;
- may optionally appear in learning history.

This feature is outside the MVP.

---

# 12. Historical Integrity

Completed QuizSessions are immutable.

Historical records must remain valid even if:

- questions change;
- answer options change;
- topics change.

Historical consistency takes precedence over current content.

---

# 13. Validation Rules

Before a QuizSession starts, the system validates:

- User exists;
- Subject exists;
- if a Quiz is referenced, it exists, is published, and its Subject/Topic match the session's Subject/Topic;
- sufficient questions are available;
- selected mode is valid.

Invalid sessions cannot be created.

---

# 14. Future Improvements

Potential future enhancements include:

- Session Resume
- Pause Functionality
- Offline Sessions
- Shared Sessions
- Multiplayer Quizzes
- AI-generated Quiz Sessions

These features are outside the scope of the MVP.

---

# 15. Constraints

The QuizSession entity:

- stores no question content directly;
- contains no scoring logic;
- contains no XP calculation logic;
- delegates business calculations to dedicated services.

It serves as the central historical record of a learning session.

---

# 16. Non-Functional Requirements

The QuizSession entity should:

- support efficient querying;
- remain immutable after completion;
- scale to millions of sessions;
- preserve historical integrity.

---

# 17. Success Criteria

The QuizSession entity is considered successful if it:

- accurately records every quiz attempt;
- supports all quiz modes;
- maintains historical consistency;
- integrates seamlessly with Results, Statistics, and XP;
- serves as the primary source of learning history.