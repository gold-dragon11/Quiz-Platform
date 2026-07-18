# Quiz

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Quiz module is the core learning experience of the platform.

It allows users to test their knowledge through structured quizzes, receive meaningful feedback, and make measurable learning progress.

Every quiz session should support the product philosophy:

> **Learn. Progress. Repeat.**

---

# 2. Goals

The Quiz module should:

- provide engaging learning sessions;
- accurately assess user knowledge;
- encourage continuous improvement;
- support multiple subjects and question types;
- remain simple and intuitive.

A complete quiz should typically take between **10 and 15 minutes**, following the **One Session Principle**.

---

# 3. Quiz Types

The platform supports two quiz modes.

## Subject Quiz

The user selects:

- Subject
- Topic (optional)

The system generates a random quiz using questions from the selected subject or topic.

---

## Random Quiz

The system automatically generates a quiz from the selected subject using random questions.

Every generated quiz should be different whenever possible.

---

# 4. Quiz Generation

Quizzes are generated dynamically from the question bank.

The generation process should:

- randomly select questions;
- avoid duplicates within the same quiz;
- respect selected filters;
- support future difficulty balancing.

For the Subject Quiz and Random Quiz modes, the quiz itself is **not permanently stored** — each quiz exists only as an individual quiz session.

Administrators may separately define reusable quiz templates through the Admin Panel. Starting a quiz from such a template does not change this generation process; it only changes the source of the configuration used to generate the session.

---

# 5. Question Types

### MVP

Supported question types:

- Single Choice
- Matching

Future versions may support:

- Multiple Choice
- Ordering
- Fill in the Blank
- Numeric Answer
- Drag & Drop
- Image Selection

The architecture should allow adding new question types without redesigning the system.

---

# 6. Quiz Flow

A standard quiz session consists of:

1. Quiz Start
2. Question Navigation
3. Question Answering
4. Quiz Completion
5. Results Screen

The flow should remain linear and predictable.

---

# 7. Navigation

Users may:

- move to the next question;
- move to the previous question;
- review unanswered questions;
- change previous answers;
- finish the quiz at any time.

Question order remains fixed throughout the session.

---

# 8. Timer Modes

Two modes are supported.

## Timer Enabled

The quiz displays:

- remaining time;
- progress indicator.

When time expires, the quiz ends automatically.

---

## Timer Disabled

The user may complete the quiz without time restrictions.

Both modes provide identical scoring.

---

# 9. Answer Submission

Answers are stored immediately after selection.

Users may change answers until the quiz is submitted.

Correctness is never revealed during the quiz.

---

# 10. Quiz Completion

A quiz ends when:

- all questions have been answered and submitted;
- the user finishes early;
- the timer expires.

The system immediately calculates the results.

---

# 11. Scoring

The system calculates:

- Correct Answers
- Incorrect Answers
- Unanswered Questions
- Final Score
- Accuracy Percentage

Scoring is deterministic.

Identical answers always produce identical results.

---

# 12. XP Rewards

After completion the user receives XP.

XP depends on:

- quiz completion;
- accuracy;
- future bonus rules.

XP is awarded only once per quiz session.

---

# 13. Progress Tracking

Each completed quiz updates:

- User Statistics
- XP
- Level
- Subject Statistics
- Quiz History

The user's progress should always remain visible.

---

# 14. Images

Questions may include images.

Supported formats:

- PNG
- JPG
- WEBP

Images should load efficiently without interrupting the quiz experience.

---

# 15. Mathematical Formulas

Questions support mathematical notation using **LaTeX**.

Formulas should render consistently across all supported devices.

---

# 16. Validation

Before a quiz starts, the system verifies:

- sufficient number of questions;
- valid question structure;
- correct answer integrity;
- available assets.

Invalid quizzes should never be generated.

---

# 17. Error Handling

If quiz generation fails:

- the user receives a clear message;
- no incomplete quiz session is created;
- the user may retry.

Unexpected errors should never result in data loss.

---

# 18. Future Improvements

Potential future enhancements include:

- Adaptive quizzes
- Difficulty balancing
- AI-generated quizzes
- Daily Challenge
- Mixed-subject quizzes
- Custom quiz lengths
- Saved quiz drafts

These features are outside the scope of the MVP.

---

# 19. Non-Functional Requirements

The Quiz module should:

- load quickly;
- save answers reliably;
- support large question banks;
- remain responsive on all devices;
- provide a smooth user experience.

---

# 20. Success Criteria

The Quiz module is considered successful if users can:

- start a quiz within seconds;
- complete it without confusion;
- receive accurate results;
- clearly understand their performance;
- leave the session feeling that they have learned something.

The Quiz module should embody the platform's core philosophy:

> **Learn. Progress. Repeat.**