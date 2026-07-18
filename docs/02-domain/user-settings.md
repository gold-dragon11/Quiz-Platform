# User Settings

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The UserSettings entity stores user-specific preferences that personalize the learning experience.

It contains application settings only and is independent of authentication, profile information, and learning progress.

---

# 2. Responsibilities

The UserSettings entity is responsible for:

- storing application preferences;
- personalizing the user experience;
- controlling interface behavior;
- supporting future settings without modifying the User entity.

The entity contains no authentication or statistics data.

---

# 3. Relationships

UserSettings:

- belong to exactly one User;
- are loaded whenever the user signs in;
- influence the application's presentation layer.

Relationship summary:

User (1)

↓

UserSettings (1)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| userId | UUID | Yes | Owner of the settings |
| language | Enum | Yes | Preferred application language |
| theme | Enum | Yes | Preferred visual theme |
| publicProfileEnabled | Boolean | Yes | Controls whether the Public Profile is visible to other users |
| createdAt | DateTime | Yes | Creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |

---

# 5. MVP Settings

The MVP includes:

### Language

Supported values:

- English
- Ukrainian

### Theme

Supported values:

- Dark

### Privacy

publicProfileEnabled:

- Boolean;
- defaults to true.

The architecture should support additional options in future versions.

---

# 6. Business Rules

UserSettings:

- belong to exactly one User;
- are automatically created during registration;
- may be updated by the user;
- contain application preferences only.

Every user always has one UserSettings record.

---

# 7. Validation Rules

The system validates:

- language is supported;
- theme is supported;
- referenced User exists.

Invalid settings cannot be saved.

---

# 8. Localization

The selected language determines:

- interface language;
- navigation labels;
- buttons;
- system messages;
- future educational content translations.

Changing the language should immediately affect the application.

---

# 9. Themes

The MVP supports:

- Dark Theme

Future versions may include:

- Light Theme
- System Theme
- Custom Themes

---

# 10. Future Improvements

Possible future settings include:

- Notification Preferences
- Privacy Settings
- Accessibility Options
- Sound Effects
- Animation Level
- Font Size
- High Contrast Mode
- Reading Preferences

These features are outside the MVP.

---

# 11. Constraints

The UserSettings entity:

- contains no authentication data;
- contains no profile information;
- contains no learning statistics;
- contains no XP information.

Its purpose is solely to personalize the application.

---

# 12. Non-Functional Requirements

The UserSettings entity should:

- remain lightweight;
- load quickly during authentication;
- support future personalization features;
- remain independent of presentation logic.

---

# 13. Success Criteria

The UserSettings entity is considered successful if it:

- stores user preferences reliably;
- personalizes the application experience;
- supports localization and theming;
- remains extensible for future settings;
- integrates seamlessly with the User entity.