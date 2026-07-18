# Avatar

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Avatar entity represents a user's profile image.

It provides visual identity within the platform while remaining independent of the User entity.

The Avatar system supports both predefined avatars and user-uploaded images.

---

# 2. Responsibilities

The Avatar entity is responsible for:

- storing avatar metadata;
- referencing the avatar image;
- identifying the avatar type;
- supporting future avatar extensions.

The Avatar entity contains no presentation logic.

---

# 3. Relationships

An Avatar:

- belongs to exactly one User;
- is displayed in the user's Profile;
- is shown on the Dashboard;
- appears on the Public Profile;
- may be replaced by another avatar.

Relationship summary:

User (1)

↓

Avatar (1)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|-----------------------------|
| id | UUID | Yes | Unique identifier |
| userId | UUID | Yes | Owner of the avatar |
| imageUrl | String | Yes | Avatar image location |
| type | Enum | Yes | Avatar type |
| createdAt | DateTime | Yes | Creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |

---

# 5. Avatar Types

Supported avatar types:

- Predefined
- Custom Upload

Future versions may support:

- AI Generated
- Animated Avatar
- Seasonal Avatar

Predefined avatars are a fixed, application-defined set of static image assets, each identified by a stable key. They are not stored as a separate database-backed catalog; the Avatar entity only records which option is currently active for a User.

---

# 6. Business Rules

An Avatar:

- belongs to one User;
- has exactly one active image;
- may be replaced;
- cannot exist without an owner.

Only one avatar may be active at a time.

---

# 7. Validation Rules

The system validates:

- supported image format;
- maximum file size;
- valid image dimensions;
- successful upload.

Invalid images are rejected.

---

# 8. Supported Formats

Supported formats:

- PNG
- JPG
- WEBP

Animated formats are not supported in the MVP.

---

# 9. Image Requirements

Uploaded avatars should:

- be square;
- remain clear at small sizes;
- be optimized for storage;
- preserve image quality.

The system may automatically resize uploaded images.

---

# 10. Default Avatar

Every newly registered user receives a default avatar.

The default avatar remains active until the user selects or uploads another image.

---

# 11. Storage

The Avatar entity stores only metadata.

Image files are stored separately in the file storage system.

The entity references images through the `imageUrl` field.

---

# 12. Localization

Avatar images are language-independent.

No localization is required.

---

# 13. Future Improvements

Possible future enhancements include:

- Avatar Cropping
- Avatar Editor
- AI-generated Avatars
- Animated Avatars
- Avatar Collections
- Seasonal Themes

These features are outside the scope of the MVP.

---

# 14. Constraints

The Avatar entity must:

- always belong to a User;
- never store image binary data;
- remain independent from presentation logic;
- support future storage providers.

---

# 15. Non-Functional Requirements

The Avatar entity should:

- remain lightweight;
- support efficient retrieval;
- scale with user growth;
- support cloud storage integration.

---

# 16. Success Criteria

The Avatar entity is considered successful if it:

- provides visual identity for every user;
- supports predefined and uploaded images;
- validates uploaded files correctly;
- remains scalable for future enhancements;
- integrates seamlessly with the User Profile.