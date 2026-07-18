# User

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The User entity represents a registered account within the Quiz Platform.

It is responsible for authentication, identity, and ownership of user-related data.

The User entity serves as the root entity for all user-specific information.

---

# 2. Responsibilities

The User entity is responsible for:

- account identity;
- authentication;
- account lifecycle;
- ownership of profile, settings, quiz sessions, and statistics.

The User entity intentionally contains minimal business data.

---

# 3. Relationships

A User:

- owns one Profile;
- owns one UserSettings;
- owns one Avatar;
- owns one Statistics;
- owns many QuizSessions;
- owns many XPTransactions.

Relationship summary:

User (1)

├── Profile (1)

├── UserSettings (1)

├── Avatar (1)

├── Statistics (1)

├── QuizSession (N)

└── XPTransaction (N)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| email | String | Yes | User email |
| passwordHash | String | Yes | Encrypted password |
| emailVerified | Boolean | Yes | Email verification status |
| accountStatus | Enum | Yes | Current account status |
| createdAt | DateTime | Yes | Registration timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |
| lastLoginAt | DateTime | No | Last successful login |

---

# 5. Account Status

Supported statuses:

- Active
- Pending Verification
- Suspended
- Deleted (Soft Delete)

The system should never permanently remove user data required for historical integrity.

---

# 6. Business Rules

A User:

- must have a unique email address;
- owns exactly one Profile;
- owns exactly one UserSettings;
- owns exactly one Avatar;
- owns exactly one Statistics;
- may complete unlimited QuizSessions;
- may earn unlimited XPTransactions.

The User entity should remain lightweight.

---

# 7. Registration

During registration the system creates:

1. User
2. Profile
3. UserSettings
4. Statistics
5. Avatar

This guarantees that every account starts with a complete domain structure.

---

# 8. Authentication

Authentication is based on:

- email;
- password.

Passwords are never stored in plain text.

Only password hashes are persisted.

---

# 9. Validation Rules

The system validates:

- email format;
- email uniqueness;
- password strength;
- account status consistency.

Invalid users cannot be created.

---

# 10. Account Lifecycle

The User lifecycle:

Registration

↓

Email Verification

↓

Active Account

↓

Optional Suspension

↓

Soft Deletion

Historical learning data must remain available even after account deactivation.

---

# 11. Historical Integrity

A User may deactivate their account.

However:

- QuizSessions remain;
- Results remain;
- XPTransactions remain;
- Statistics remain.

Historical records must never lose ownership.

---

# 12. Future Improvements

Possible future enhancements include:

- OAuth Sign-In
- Two-Factor Authentication
- Multiple Email Addresses
- Account Recovery
- Connected Devices
- Security Sessions
- Login History

These features are outside the MVP.

---

# 13. Constraints

The User entity:

- stores no profile information;
- stores no statistics;
- stores no XP;
- stores no quiz content.

These responsibilities belong to dedicated domain entities.

---

# 14. Non-Functional Requirements

The User entity should:

- remain lightweight;
- support efficient authentication;
- scale to millions of accounts;
- maintain strong security practices.

---

# 15. Success Criteria

The User entity is considered successful if it:

- securely represents registered accounts;
- integrates with authentication;
- owns all user-related entities;
- remains independent of business logic;
- supports future authentication methods without architectural changes.