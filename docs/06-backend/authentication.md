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

## Verification Token Design

Verification tokens are stateless signed JWTs. They are not persisted — unlike refresh tokens, which require hashed storage.

Each token carries:

- the user id (`sub`);
- a `purpose` claim identifying it as an email verification token;
- an expiration set by configuration (24 hours by default).

Tokens are signed with a dedicated secret (`EMAIL_VERIFICATION_SECRET`), separate from both JWT secrets, so a verification token can never be accepted as an access or refresh token — and vice versa.

Activation is atomic: the account is switched to Active only if it is still Pending Verification. A replayed token therefore finds an already-active account and is rejected with the same generic error as any other invalid token.

Verification emails are sent after registration commits. A delivery failure is logged but never rolls back the registration — the resend endpoint is the documented recovery path.

---

# 9. Password Reset

Password recovery flow:

1. user requests reset;
2. generate reset token;
3. send email;
4. validate token;
5. update password;
6. invalidate previous sessions.

## Reset Token Design

Reset tokens are stateless signed JWTs, like email verification tokens — they are never persisted.

Each token carries:

- the user id (`sub`);
- a `purpose` claim identifying it as a password reset token;
- `pwd` — a short one-way HMAC fingerprint of the user's current password hash;
- an expiration set by configuration (1 hour by default).

Tokens are signed with a dedicated secret (`PASSWORD_RESET_SECRET`), distinct from every other signing secret.

The `pwd` fingerprint is what makes stateless tokens single-use: a token is only accepted while the account still holds the password hash it was issued against, and the password swap itself is an atomic compare-and-swap on that hash. The moment any reset succeeds, the hash changes and every outstanding reset token for the account stops matching. The fingerprint is HMAC-derived and truncated, so it reveals nothing about the hash and cannot be forged without the secret.

Reset emails are sent only for Active accounts; the endpoint's response never varies, so it cannot be used to probe account existence or status. After a successful reset, all refresh-token sessions are revoked (see Security §5); access tokens expire naturally.

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