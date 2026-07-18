# Quiz Results

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Quiz Results screen is displayed immediately after a quiz has been completed or ended early.

Its purpose is to summarize the user's performance, visualize learning progress, and provide clear feedback before the user starts another learning session.

The Results screen represents the conclusion of the "One Session" experience.

---

# 2. Goals

The Results screen should:

- summarize quiz performance;
- visualize progress;
- reward completion;
- encourage continued learning;
- provide meaningful insights.

The user should leave this screen feeling informed and motivated.

---

# 3. Layout

The Results screen consists of:

- Result Header
- Overall Score
- XP Summary
- Performance Metrics
- Question Review
- Subject Performance
- Action Buttons

Each section should be visually distinct and easy to scan.

---

# 4. Result Header

The header displays a completion message.

Examples:

- Quiz Completed
- Great Job!
- Session Finished

The message should celebrate completion without exaggeration.

---

# 5. Overall Score

Displayed information:

- Correct Answers
- Incorrect Answers
- Total Questions
- Final Percentage

Example:

18 / 20 Correct

90%

The score should be the primary visual focus.

---

# 6. XP Summary

Users immediately see the XP earned during the session.

Displayed information:

- XP Earned
- Current Total XP
- Current Level
- XP Required for Next Level

If the user reaches a new level, a level-up animation is shown.

The animation should be brief and non-disruptive.

---

# 7. Performance Metrics

The platform displays:

- Accuracy
- Quiz Duration
- Average Time Per Question
- Timer Mode Used

These metrics help users understand their performance.

---

# 8. Question Review

Users can review every question from the completed quiz.

For each question the platform displays:

- Question text
- User's answer
- Correct answer
- Result (Correct / Incorrect)

Future versions may include explanations for each question.

---

# 9. Subject Performance

The Results screen summarizes performance within the selected subject.

Displayed information:

- Subject Name
- Accuracy
- XP Earned
- Questions Completed

Future versions may compare current performance with previous sessions.

---

# 10. Early Finish

If the user ends the quiz before answering all questions:

- unanswered questions are marked as unanswered;
- the score is calculated using all questions;
- XP is awarded according to completed performance.

The Results screen should clearly indicate that the quiz was finished early.

---

# 11. Action Buttons

Available actions:

- Return to Dashboard
- Start Another Quiz
- Retry Quiz
- Review Questions

The primary action should be **Start Another Quiz**.

---

# 12. Empty States

This screen is only accessible after completing a quiz.

Direct access without a completed session should redirect the user to the Dashboard.

---

# 13. Future Improvements

Possible future enhancements include:

- Performance trends
- Weak topic analysis
- Personalized recommendations
- AI-generated feedback
- Printable reports

These features are outside the MVP.

---

# 14. Design Principles

The Results screen should feel:

- rewarding;
- motivating;
- informative;
- premium.

Animations should reinforce achievement without distracting from the presented information.

---

# 15. Non-Functional Requirements

The Results screen should:

- load instantly after quiz completion;
- display accurate statistics;
- remain responsive across all devices;
- preserve session data for future review.

---

# 16. Success Criteria

The Results screen is considered successful if users can:

- immediately understand their performance;
- recognize their learning progress;
- review mistakes;
- see the XP earned;
- feel motivated to continue learning.

The Results screen should reinforce the platform's core philosophy:

> Learn. Progress. Repeat.