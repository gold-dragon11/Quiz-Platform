# Profile

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Profile entity represents the public identity of a user within the Quiz Platform.

It stores personal information that can be displayed throughout the application and separates profile data from authentication and account management.

The Profile entity is focused on identity, not security.

---

# 2. Responsibilities

The Profile entity is responsible for:

- storing public user information;
- managing profile personalization;
- providing data for public profile pages;
- supporting future social features.

The Profile entity does not store authentication data or learning statistics.

---

# 3. Relationships

A Profile:

- belongs to exactly one User;
- is displayed alongside the User's Avatar, which is a sibling entity owned directly by the User rather than by the Profile;
- is displayed on the Public Profile;
- is displayed throughout the application where user identity is required.

Relationship summary:

User (1)

↓

Profile (1)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| userId | UUID | Yes | Owner of the profile |
| displayName | String | Yes | Public display name |
| username | String | Yes | Unique username |
| bio | Text | No | Short user description |
| createdAt | DateTime | Yes | Creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |

---

# 5. Business Rules

A Profile:

- belongs to exactly one User;
- cannot exist without a User;
- must contain a unique username;
- may contain an optional biography;
- may use a default avatar.

At registration the Profile is created with `displayName` initialized to the chosen `username`, since registration does not collect a separate display name. The user may change it afterwards through the Profile API.

---

# 6. Validation Rules

Display Name:

- required;
- maximum 50 characters.

Username:

- required;
- unique;
- 3–30 characters;
- letters, numbers, and underscores only.

Bio:

- optional;
- maximum 250 characters.

Avatar validation (image format, size, and dimensions) is the responsibility of the Avatar entity, not the Profile.

---

# 7. Visibility

Profile information is divided into public and private data.

### Public

- Display Name
- Username
- Avatar
- Bio

### Private

- Email
- Password
- Security Settings
- Authentication Data

Private information belongs to the User entity, not the Profile.

---

# 8. Public Profile

The Profile entity provides data for the public profile page.

It does not expose sensitive account information.

Public statistics (such as total XP or level) are retrieved from other domain entities and are not stored in the Profile itself.

Similarly, the displayed Avatar image is retrieved from the User's Avatar entity and is not stored within the Profile.

---

# 9. Localization

Profile content supports localization where appropriate.

Examples:

- Bio (future multilingual support)

Names and usernames are language-independent.

---

# 10. Future Improvements

Potential future additions include:

- Social Links
- Country
- Learning Goals
- Interests
- Custom Profile Themes
- Verification Badge
- Profile Banner

These features are outside the scope of the MVP.

---

# 11. Constraints

The Profile entity:

- must always reference an existing User;
- contains no authentication logic;
- contains no quiz logic;
- contains no XP calculations.

It serves solely as the user's public identity.

---

# 12. Non-Functional Requirements

The Profile entity should:

- remain lightweight;
- support efficient retrieval;
- allow future expansion;
- remain independent of presentation logic.

---

# 13. Success Criteria

The Profile entity is considered successful if it:

- provides a clear public identity for each user;
- separates profile information from account data;
- supports personalization;
- remains extensible for future social features;
- integrates seamlessly with the rest of the domain model.