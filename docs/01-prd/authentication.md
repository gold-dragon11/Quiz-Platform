# Authentication

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the authentication and authorization system of the Quiz Platform.

The authentication system is responsible for:

- user registration;
- user login;
- user logout;
- session management;
- password security;
- protected routes.

The goal is to provide a secure and seamless authentication experience.

---

# 2. Authentication Method

The platform uses:

- Email
- Password

Authentication is performed using JSON Web Tokens (JWT).

The system issues:

- Access Token
- Refresh Token

---

# 3. Registration

Users must provide:

- Username
- Email
- Password

Users may optionally provide:

- Preferred Language (defaults to English if omitted)

During registration, the system automatically creates:

- User
- User Profile
- User Settings
- Statistics
- Default Avatar

These are created atomically: if any step fails, none of them are persisted.

The following values are applied automatically, since registration does not collect them:

| Record | Field | Value |
|---|---|---|
| User | Account Status | Pending Verification |
| User | Email Verified | false |
| User | Role | User |
| Profile | Display Name | the chosen username |
| Profile | Bio | empty |
| Avatar | Type | Predefined |
| Avatar | Image | the platform's default avatar asset |
| User Settings | Language | the preferred language, or English if omitted |
| User Settings | Theme | Dark |
| User Settings | Public Profile | enabled |
| Statistics | all counters | zero |

The user is considered registered only after successful validation.

---

# 4. Login

Users log in using:

- Email
- Password

Only Active accounts may log in:

- accounts that have not completed email verification cannot log in until verification is complete;
- suspended accounts cannot log in;
- deleted accounts receive the same response as invalid credentials, so they never reveal that the account once existed.

An unknown email address and an incorrect password produce identical responses, so neither reveals whether an account exists.

After successful authentication, the system returns:

- Access Token
- Refresh Token

Details of the authenticated user are retrieved separately after login.

The user is redirected to the Dashboard.

---

# 5. Logout

Logging out invalidates the current session.

The frontend removes all authentication data.

Protected pages become inaccessible until the user logs in again.

---

# 6. Password Requirements

Passwords must:

- contain at least 8 characters;
- contain at least one uppercase letter;
- contain at least one lowercase letter;
- contain at least one number;
- contain at least one special character.

Passwords are never stored in plain text.

---

# 7. Password Storage

Passwords are hashed using Argon2 before being stored.

The original password is never recoverable.

Only password hashes are stored in the database.

---

# 8. Email Validation

The system validates:

- email format;
- uniqueness.

Duplicate email addresses are not allowed.

New accounts remain in a Pending Verification state until the user confirms their email address through a verification link sent at registration. Verified accounts gain full access to protected routes; a new verification email can be requested if the original expires or is lost.

---

# 9. Username Validation

Usernames must:

- be unique;
- contain only supported characters;
- have a minimum length of 3 characters;
- have a maximum length of 30 characters.

Usernames are publicly visible.

---

# 10. Authentication States

A user may be in one of the following states:

- Guest
- Authenticated
- Administrator

Permissions depend on the current authentication state.

---

# 11. Authorization

Role-based authorization is used.

MVP Roles:

- User
- Administrator

Protected endpoints verify both authentication and authorization.

---

# 12. Session Management

Each successful login creates a new authenticated session.

Sessions remain valid until:

- logout;
- refresh token expiration;
- manual revocation (future).

Future versions may support viewing and managing active sessions.

---

# 13. Token Strategy

The platform uses:

- Short-lived Access Token
- Long-lived Refresh Token

Access Tokens authenticate API requests.

Refresh Tokens issue new Access Tokens without requiring the user to log in again.

---

# 14. Protected Routes

Authentication is required for:

- Dashboard
- Profile
- Quiz Sessions
- Statistics
- Settings
- Admin Panel

Public routes include:

- Home
- Login
- Registration

---

# 15. Error Handling

Authentication errors should provide clear but secure messages.

Examples:

- Invalid email or password.
- Email already exists.
- Username already exists.
- Email not verified.
- Session expired.
- Unauthorized access.

Sensitive implementation details must never be exposed.

---

# 16. Security Measures

The authentication system should protect against:

- SQL Injection;
- Cross-Site Scripting (XSS);
- brute-force login attempts;
- credential stuffing;
- token theft.

Input validation is required on both the client and the server.

---

# 17. Future Improvements

Possible future authentication features include:

- Two-Factor Authentication (2FA)
- OAuth (Google, Apple, GitHub)
- Session Management
- Login Notifications
- Device Recognition

Email verification and password reset are part of the MVP and are described in the sections above.

These features are outside the scope of the MVP.

---

# 18. Non-Functional Requirements

The authentication system should be:

- secure;
- reliable;
- scalable;
- maintainable.

Authentication should not noticeably delay the user experience.

---

# 19. Success Criteria

The authentication system is considered successful if:

- users can register and log in securely;
- credentials are protected;
- unauthorized access is prevented;
- authentication integrates seamlessly with the rest of the platform;
- future authentication methods can be added without major architectural changes.