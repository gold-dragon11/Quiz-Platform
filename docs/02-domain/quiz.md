# Quiz

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Quiz entity represents an optional, reusable quiz configuration that administrators can define and publish.

It specifies how a quiz should be generated — subject, topic, question count, and timer defaults — before a user begins a Quiz Session.

Not every Quiz Session originates from a stored Quiz. Users can also start a quiz directly from a Subject or Topic using the Subject Quiz and Random Quiz modes; in that case the session is generated ad hoc, using the same generation rules, without referencing a persisted Quiz record.

A Quiz does not store user progress or results.

---

# 2. Responsibilities

The Quiz entity is responsible for:

- defining quiz configuration;
- specifying generation rules;
- determining quiz mode;
- providing metadata.

The Quiz entity contains no user-specific information.

---

# 3. Relationships

A Quiz:

- belongs to one Subject;
- may belong to one Topic;
- may generate many Quiz Sessions.

A Quiz Session does not require a Quiz. Ad hoc sessions reference a Subject, and optionally a Topic, directly.

Relationship summary:

Subject (1)

↓

Quiz (N) — optional

↓

QuizSession (N)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| subjectId | UUID | Yes | Subject |
| topicId | UUID | No | Topic |
| title | String | Yes | Quiz title |
| description | Text | No | Quiz description |
| mode | Enum | Yes | Quiz generation mode |
| questionCount | Integer | Yes | Number of questions |
| timerEnabled | Boolean | Yes | Default timer mode |
| isPublished | Boolean | Yes | Availability status |
| createdAt | DateTime | Yes | Creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |

---

# 5. Quiz Modes

Supported quiz modes:

- Subject Quiz
- Random Quiz

Future modes:

- Daily Challenge
- Mock Exam
- Practice Quiz
- Custom Quiz

---

# 6. Business Rules

A Quiz:

- belongs to one Subject;
- may belong to one Topic;
- defines quiz settings;
- may generate multiple Quiz Sessions.

A Quiz Session may be created either from a stored Quiz or ad hoc, directly from a Subject and optional Topic.

The Quiz itself never stores user answers.

---

# 7. Generation

A Quiz Session can be created in one of two ways.

## From a stored Quiz

1. The Quiz configuration is loaded.
2. Questions are selected from the Question Bank according to the Quiz's Subject, Topic, and question count.
3. A QuizSession is created, referencing the Quiz.
4. QuestionAttempts are recorded.
5. A Result is generated.

## Ad hoc (Subject Quiz / Random Quiz)

1. The user selects a Subject and, optionally, a Topic.
2. Questions are selected randomly from the Question Bank.
3. A QuizSession is created without referencing a Quiz.
4. QuestionAttempts are recorded.
5. A Result is generated.

Both paths produce an identical QuizSession structure and identical scoring behavior.

---

# 8. Validation Rules

The system validates:

- Subject exists;
- Topic belongs to the Subject;
- sufficient questions exist;
- question count is valid.

---

# 9. Historical Integrity

Quiz configuration may change over time.

Existing QuizSessions remain unaffected.

Historical sessions always preserve the configuration used when they were created.

---

# 10. Future Improvements

Possible future enhancements:

- Difficulty settings
- Adaptive quizzes
- Scheduled quizzes
- Public quizzes
- Community-created quizzes
- AI-generated quizzes

---

# 11. Constraints

The Quiz entity:

- contains no user data;
- contains no XP logic;
- contains no statistics;
- contains no results.

Its purpose is to define quiz configuration.

---

# 12. Non-Functional Requirements

The Quiz entity should:

- remain lightweight;
- support flexible generation;
- integrate with the Question Bank;
- support future quiz types.

---

# 13. Success Criteria

The Quiz entity is considered successful if it:

- defines reusable quiz configurations;
- supports all quiz modes;
- generates valid Quiz Sessions;
- remains extensible for future learning scenarios.