# XP Transaction

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The XPTransaction entity represents a single experience point (XP) event within the Quiz Platform.

Each transaction records when and why XP was awarded to a user.

XPTransaction provides a complete and auditable history of user progression.

---

# 2. Responsibilities

The XPTransaction entity is responsible for:

- recording earned XP;
- preserving XP history;
- supporting level progression;
- providing an audit trail for user progression.

The entity does not calculate XP.

---

# 3. Relationships

An XPTransaction:

- belongs to exactly one User;
- is generated from exactly one completed QuizSession;
- references exactly one Result.

Relationship summary:

User (1)

↓

XPTransaction (N)

↑

Result (1)

↓

QuizSession (1)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| userId | UUID | Yes | Owner of the transaction |
| quizSessionId | UUID | Yes | Related Quiz Session |
| resultId | UUID | Yes | Related Result |
| amount | Integer | Yes | Awarded XP |
| reason | Enum | Yes | XP source |
| createdAt | DateTime | Yes | Creation timestamp |

---

# 5. XP Sources

Supported XP sources in the MVP:

- Quiz Completion
- High Accuracy Bonus

Future versions may include:

- Daily Challenge
- Learning Streak
- Achievements
- Special Events
- AI Challenges

The architecture supports additional XP sources without redesign.

---

# 6. Business Rules

An XPTransaction:

- belongs to one User;
- references one QuizSession;
- references one Result;
- cannot be edited after creation.

Each completed QuizSession may generate one or more XP transactions.

---

# 7. XP Awarding

XP is awarded immediately after:

1. Quiz completion.
2. Result calculation.
3. XP calculation.

The transaction is then permanently stored.

---

# 8. Historical Integrity

XPTransactions are immutable.

Historical XP records must never change, even if XP calculation rules evolve in future versions.

If XP rules are updated, only future transactions use the new logic.

---

# 9. Validation Rules

The system validates:

- User exists;
- QuizSession is completed;
- Result exists;
- XP amount is positive.

Invalid transactions cannot be created.

---

# 10. Level Progress

User level is derived from the cumulative sum of XPTransactions.

The XPTransaction entity does not store the user's current level.

Level calculation belongs to a dedicated Progression Service.

---

# 11. Future Improvements

Possible future enhancements include:

- XP Multipliers
- Seasonal Events
- Bonus Campaigns
- Refund Transactions
- Manual Administrator Rewards
- Achievement Rewards

These features are outside the MVP.

---

# 12. Constraints

The XPTransaction entity:

- stores no quiz content;
- stores no statistics;
- stores no user profile information;
- contains no XP calculation logic.

Its sole purpose is to record awarded XP.

---

# 13. Non-Functional Requirements

The XPTransaction entity should:

- remain immutable;
- support efficient querying;
- scale to millions of transactions;
- provide a complete audit history.

---

# 14. Success Criteria

The XPTransaction entity is considered successful if it:

- accurately records every XP event;
- provides a complete history of user progression;
- supports future reward systems;
- integrates with Statistics and Progression;
- remains immutable throughout its lifecycle.