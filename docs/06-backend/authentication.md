# Backend Authentication

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document describes the internal authentication architecture of the Quiz Platform backend.

The Authentication module is responsible for user registration, login, JWT token management, password security, email verification, and session management.

---

# 2. Responsibilities

The Authentication module is responsible for:

- user registration;
- user login;
- JWT token generation;
- refresh token management;
- email verification;
- password reset;
- logout;
- authentication guards.

Authorization rules are implemented separately.

---

# 3. Module Structure

```text
auth/

├── controllers/
├── services/
├── dto/
├── guards/
├── strategies/
├── repositories/
├── entities/
├── utils/
└── auth.module.ts
```

Each directory has a clearly defined responsibility.

---

# 4. Authentication Flow

```text
Register

↓

Create User

↓

Hash Password

↓

Store User

↓

Generate Verification Token

↓

Send Verification Email

↓

Verify Email

↓

Login

↓

Generate Access Token

↓

Generate Refresh Token
```

---

# 5. Password Security

Passwords are never stored in plain text.

Passwords are hashed using:

- Argon2

The original password cannot be recovered.

---

# 6. JWT Authentication

Authentication uses:

- Access Token
- Refresh Token

Access tokens authenticate API requests.

Refresh tokens create new access tokens.

---

# 7. Token Lifecycle

## Access Token

Characteristics:

- short-lived;
- included in Authorization header;
- cryptographically signed.

---

## Refresh Token

Characteristics:

- long-lived;
- securely stored;
- rotated after use;
- invalidated on logout.

Refresh Token Rotation is enabled.

---

# 8. Email Verification

New accounts remain inactive until email verification.

The verification process:

1. generate token;
2. send email;
3. validate token;
4. activate account.

Expired tokens cannot be reused.

---

# 9. Password Reset

Password recovery flow:

1. user requests reset;
2. generate reset token;
3. send email;
4. validate token;
5. update password;
6. invalidate previous sessions.

---

# 10. Authentication Guards

The backend uses authentication guards to protect endpoints.

Examples:

- JWT Guard
- Admin Guard

Guards execute before controller logic.

---

# 11. Session Management

Each authenticated session is associated with:

- user;
- refresh token;
- expiration time.

Expired sessions are rejected automatically.

---

# 12. Validation

The Authentication module validates:

- email format;
- password strength;
- email uniqueness;
- username uniqueness;
- token validity.

Invalid requests never reach business logic.

---

# 13. Error Handling

Authentication errors include:

- invalid credentials;
- expired token;
- invalid refresh token;
- email not verified;
- account suspended.

Errors return standardized API responses.

---

# 14. Security

Security measures include:

- Argon2 password hashing;
- JWT signature validation;
- refresh token rotation;
- rate limiting;
- secure password reset tokens;
- email verification tokens with expiration.

Sensitive information is never exposed.

---

# 15. Dependencies

The Authentication module depends on:

- Users Module
- Email Service
- JWT Service
- Prisma
- Configuration Module

Authentication remains independent of quiz functionality.

---

# 16. Future Improvements

Possible future features include:

- OAuth (Google, Apple)
- Two-Factor Authentication (2FA)
- Passkeys (WebAuthn)
- Device Management
- Session Dashboard
- Login History

These features are outside the MVP.

---

# 17. Success Criteria

The Authentication module is considered successful if it:

- securely authenticates users;
- protects user credentials;
- supports modern JWT authentication;
- integrates with the Users module;
- remains extensible for future authentication methods.