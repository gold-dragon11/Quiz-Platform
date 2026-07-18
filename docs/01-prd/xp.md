# XP System

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The XP (Experience Points) System measures and visualizes the user's learning progress.

XP rewards users for completing quizzes and reflects consistent learning rather than time spent in the application.

The XP System supports the platform philosophy:

> **Learn. Progress. Repeat.**

---

# 2. Goals

The XP System should:

- reward meaningful learning;
- visualize long-term progress;
- motivate continued improvement;
- remain fair and predictable.

XP should never encourage addictive or repetitive behavior.

---

# 3. Core Principles

The XP System follows these principles:

- Progress over repetition
- Reward completion
- Reward accuracy
- Transparency
- Consistency

Users should always understand why XP was awarded.

---

# 4. Earning XP

Users earn XP after completing a quiz.

XP is awarded only once per quiz session.

Factors that may influence XP include:

- Quiz completion
- Accuracy
- Quiz size (future)

Time spent on a quiz does not affect XP rewards.

---

# 5. Level System

XP contributes to the user's overall level.

Each level requires more XP than the previous one.

Levels represent long-term learning progress.

Levels do not unlock exclusive content in the MVP.

---

# 6. XP Calculation

The exact XP formula is defined by the backend and may evolve over time.

The system should ensure that:

- higher accuracy generally results in more XP;
- incomplete quizzes receive proportionally reduced rewards;
- identical results always produce identical XP.

The calculation must be deterministic and transparent.

---

# 7. XP Feedback

Immediately after completing a quiz, users see:

- XP Earned
- Current Total XP
- Current Level
- XP Remaining Until Next Level

If a level is reached, a short level-up animation is displayed.

Animations should be subtle and brief.

---

# 8. Progress Visualization

XP progress is displayed using a progress bar.

The progress bar appears in:

- Dashboard
- Profile
- Quiz Results

Users should always understand how close they are to the next level.

---

# 9. XP History

Every XP reward is recorded.

Each XP transaction includes:

- Date
- Quiz Session
- XP Earned
- Total XP After Transaction

This history supports future analytics and debugging.

---

# 10. Abuse Prevention

The XP System should prevent exploitation.

Examples include:

- duplicate rewards for the same quiz session;
- repeated submissions of identical sessions;
- unauthorized XP modification.

XP values should only be calculated by the backend.

---

# 11. Future Improvements

Possible future enhancements include:

- Bonus XP Events
- Weekly Challenges
- Subject Milestones
- Learning Goals
- Seasonal Progress
- Special Achievement XP

These features are outside the scope of the MVP.

---

# 12. Design Principles

The XP System should feel:

- motivating;
- fair;
- rewarding;
- premium.

Visual effects should celebrate progress without becoming distracting.

---

# 13. Non-Functional Requirements

The XP System should:

- calculate rewards accurately;
- remain deterministic;
- support future balancing;
- scale efficiently with user growth.

XP calculations should have minimal impact on application performance.

---

# 14. Success Criteria

The XP System is considered successful if users:

- clearly understand how XP is earned;
- feel rewarded for meaningful learning;
- recognize long-term progress through levels;
- remain motivated without feeling pressured to maximize screen time.

The XP System should reinforce the platform's philosophy:

> **Learn. Progress. Repeat.**