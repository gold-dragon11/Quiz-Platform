# Users API

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Users API provides endpoints for managing user accounts, public identity (Profile and Avatar), and personal preferences (Settings).

It is responsible for retrieving account information, updating account details, managing the account lifecycle, and managing the data that makes up a user's public identity.

Authentication and Statistics are handled by their respective APIs.

---

# 2. Design Principles

The Users API follows these principles:

- Resource-oriented design
- Account-focused operations
- Secure access
- RESTful endpoints
- Consistent JSON responses

Users can only manage their own accounts unless they have administrative privileges.

---

# 3. Authentication

All endpoints require authentication, with one exception: retrieving another user's Public Profile (§12) is a public route and does not require an access token.

```http
Authorization: Bearer <access_token>
```

Unauthorized requests to protected endpoints return:

```http
401 Unauthorized
```

---

# 4. Get Current User

## Retrieve Account

```http
GET /api/v1/users/me
```

Returns the authenticated user's account information.

Typical response includes:

- user ID;
- email;
- account status;
- email verification status;
- creation date.

This endpoint does not return profile or statistics data.

---

# 5. Update Account

## Update User Information

```http
PATCH /api/v1/users/me
```

Allows updating account-level information.

Supported fields:

- email (future)

Profile, Avatar, and Settings fields are managed by the dedicated sections of this API (§9–§11), not by this endpoint.

---

# 6. Change Password

## Update Password

```http
PATCH /api/v1/users/me/password
```

Allows the authenticated user to change their password.

Requirements:

- current password;
- new password.

The new password must satisfy the platform's password policy.

---

# 7. Delete Account

## Deactivate Account

```http
DELETE /api/v1/users/me
```

Performs a soft delete.

The account becomes inactive.

Historical learning data remains in the database.

---

# 8. Account Status

Users may have the following statuses:

- Pending Verification
- Active
- Suspended
- Deleted

Inactive accounts cannot access protected resources.

---

# 9. Profile

## Get My Profile

```http
GET /api/v1/users/me/profile
```

Returns the authenticated user's Profile.

Response includes:

- displayName;
- username;
- bio;
- registrationDate.

---

## Update My Profile

```http
PATCH /api/v1/users/me/profile
```

Allows partial updates to Profile fields.

Supported fields:

- displayName (max 50 characters);
- username (unique, 3–30 characters, letters, numbers, and underscores only);
- bio (optional, max 250 characters).

---

# 10. Avatar

## Get My Avatar

```http
GET /api/v1/users/me/avatar
```

Returns the authenticated user's active avatar.

Response includes:

- type (Predefined or Custom Upload);
- imageUrl.

---

## Select a Predefined Avatar

```http
PUT /api/v1/users/me/avatar
```

Sets the active avatar to one of the platform's predefined options.

Required fields:

- predefinedAvatarId

---

## Upload a Custom Avatar

```http
POST /api/v1/users/me/avatar/upload
```

Uploads a custom avatar image, replacing the current avatar.

Request:

- multipart/form-data image file.

Supported formats:

- PNG
- JPG
- WEBP

The uploaded image is validated for format, file size, and dimensions before becoming active.

---

# 11. Settings

## Get My Settings

```http
GET /api/v1/users/me/settings
```

Returns the authenticated user's application preferences.

Response includes:

- language;
- theme;
- publicProfileEnabled.

---

## Update My Settings

```http
PATCH /api/v1/users/me/settings
```

Allows partial updates to Settings fields.

Supported fields:

- language (English or Ukrainian);
- theme (Dark, the only MVP option);
- publicProfileEnabled (boolean).

Changing the language takes effect immediately and does not require a new login.

---

# 12. Public Profile

## Get Public Profile

```http
GET /api/v1/users/{username}
```

Public endpoint. Does not require authentication.

Returns the public subset of a user's identity and progress:

- avatar;
- displayName;
- username;
- currentLevel;
- totalXP;
- completedQuizzes;
- averageAccuracy.

If the target user has disabled their public profile (§11), or the username does not exist, the endpoint returns:

```http
404 Not Found
```

This avoids revealing whether a given username is registered.

---

# 13. Validation

The API validates:

- authenticated user;
- email uniqueness;
- password strength;
- account status;
- display name length;
- username uniqueness and format;
- bio length;
- avatar image format, size, and dimensions;
- language and theme values.

Invalid requests return:

```http
400 Bad Request
```

---

# 14. Error Responses

Standard HTTP status codes:

| Status | Meaning |
|---------|---------|
| 200 | Success |
| 204 | Account Deactivated |
| 400 | Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | User Not Found |
| 409 | Conflict |
| 413 | Avatar Image Too Large |
| 500 | Internal Server Error |

All errors return a consistent JSON structure.

---

# 15. Security

The Users API follows these security practices:

- Account ownership verification
- Password confirmation for sensitive operations
- Soft deletion
- Audit logging
- JWT authentication
- Avatar upload validation (format, size, dimensions)
- Public Profile visibility respects the user's privacy setting

Sensitive account changes require re-authentication if configured by the platform.

---

# 16. Future Improvements

Possible future features include:

- Change Email
- Connected Accounts
- Session Management
- Device Management
- Account Export
- Account Recovery
- Privacy Controls

These features are outside the MVP.

---

# 17. Success Criteria

The Users API is considered successful if it:

- securely manages user accounts;
- protects sensitive account operations;
- preserves historical learning data;
- provides a single, coherent surface for account, profile, avatar, and settings management;
- supports future account features.