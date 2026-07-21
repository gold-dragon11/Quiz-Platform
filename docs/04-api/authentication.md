# Authentication API

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Authentication API manages user authentication, account creation, session management, and account security.

It provides secure endpoints for user registration, login, logout, email verification, password recovery, and token refresh.

Authentication is based on JWT access tokens and refresh tokens.

---

# 2. Design Principles

The Authentication API follows these principles:

- Stateless authentication
- Secure password storage
- JWT-based authorization
- Refresh token support
- Consistent JSON responses
- RESTful endpoint design

---

# 3. Authentication Flow

```text
Register

↓

Verify Email

↓

Login

↓

Receive Access Token

↓

Access Protected Resources

↓

Refresh Token

↓

Logout
```

---

# 4. Register

## Create Account

```http
POST /api/v1/auth/register
```

Creates a new user account.

Required fields:

- email
- password
- username

Optional fields:

- preferredLanguage (defaults to English if omitted)

Automatically creates:

- User
- Profile
- UserSettings
- Statistics
- Avatar (default)

Response:

```http
201 Created
```

---

# 5. Email Verification

## Verify Email

```http
POST /api/v1/auth/verify-email
```

Verifies the user's email using a verification token.

Successful verification activates the account.

---

## Resend Verification Email

```http
POST /api/v1/auth/resend-verification
```

Sends a new verification email.

---

# 6. Login

## Sign In

```http
POST /api/v1/auth/login
```

Authenticates a user.

Required fields:

- email
- password

Returns:

- Access Token
- Refresh Token

The response contains tokens only. Details of the authenticated user are retrieved separately through `GET /api/v1/auth/me`.

Login succeeds only for Active accounts:

| Account Status | Response |
|---|---|
| Active | 200 with tokens |
| Pending Verification | 403 Email not verified |
| Suspended | 403 Account suspended |
| Deleted | 401 Unauthorized, identical to invalid credentials |

An unknown email and an incorrect password return exactly the same 401 response, so neither reveals whether an account exists. Deleted accounts are treated the same way and never reveal that they once existed.

---

# 7. Logout

## Sign Out

```http
POST /api/v1/auth/logout
```

Invalidates the current refresh token.

Access tokens expire naturally.

---

# 8. Refresh Token

## Refresh Session

```http
POST /api/v1/auth/refresh
```

Returns a new Access Token using a valid Refresh Token.

The user does not need to log in again.

---

# 9. Forgot Password

## Request Password Reset

```http
POST /api/v1/auth/forgot-password
```

Sends a password reset email.

For security reasons, the response is always identical regardless of whether the email exists.

---

# 10. Reset Password

## Create New Password

```http
POST /api/v1/auth/reset-password
```

Allows the user to set a new password using a valid reset token.

---

# 11. Current User

## Get Current User

```http
GET /api/v1/auth/me
```

Returns information about the authenticated user.

Requires:

```http
Authorization: Bearer <access_token>
```

---

# 12. Password Policy

Passwords must:

- contain at least 8 characters;
- include uppercase and lowercase letters;
- include at least one number;
- include at least one special character.

Weak passwords are rejected.

---

# 13. Token Strategy

The platform uses two tokens.

## Access Token

Purpose:

- authenticate API requests.

Characteristics:

- short-lived;
- included in Authorization header.

---

## Refresh Token

Purpose:

- obtain new access tokens.

Characteristics:

- long-lived;
- securely stored;
- invalidated during logout.

---

# 14. Authorization

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

Invalid or expired tokens return:

```http
401 Unauthorized
```

---

# 15. Validation

The API validates:

- email format;
- password strength;
- username uniqueness;
- email uniqueness;
- verification tokens;
- refresh tokens.

Invalid requests return:

```http
400 Bad Request
```

---

# 16. Error Responses

Standard HTTP status codes:

| Status | Meaning |
|---------|---------|
| 200 | Success |
| 201 | Account Created |
| 400 | Validation Error |
| 401 | Unauthorized |
| 403 | Email Not Verified / Account Suspended |
| 404 | Resource Not Found |
| 409 | Email Already Exists |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

All errors return a consistent JSON response.

---

# 17. Security

The Authentication API follows these security practices:

- Passwords are hashed using Argon2.
- JWT tokens are cryptographically signed.
- Refresh tokens are securely stored.
- Sensitive endpoints are rate-limited.
- Password reset tokens expire automatically.
- Email verification tokens expire automatically.

---

# 18. Future Improvements

Possible future features include:

- OAuth (Google, Apple)
- Two-Factor Authentication (2FA)
- Device Management
- Session Management
- Passkeys (WebAuthn)
- Login History

These features are outside the MVP.

---

# 19. Success Criteria

The Authentication API is considered successful if it:

- securely authenticates users;
- protects user accounts;
- supports reliable session management;
- follows modern authentication standards;
- remains extensible for future authentication methods.