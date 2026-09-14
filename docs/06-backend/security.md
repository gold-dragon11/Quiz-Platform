# Backend Security

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the security architecture of the Quiz Platform backend.

Security is treated as a core architectural concern and is applied consistently across all backend modules.

The goal is to protect user data, prevent unauthorized access, and ensure the integrity of the platform.

---

# 2. Security Principles

The backend follows these principles:

- Defense in Depth
- Least Privilege
- Secure by Default
- Fail Securely
- Zero Trust
- Principle of Least Knowledge

Every request must be validated and authenticated before accessing protected resources.

---

# 3. Authentication

Authentication is based on:

- JWT Access Tokens
- Refresh Tokens
- Refresh Token Rotation

Access Tokens are short-lived.

Refresh Tokens are rotated after every successful refresh.

---

# 4. Password Security

Passwords are never stored in plain text.

Requirements:

- Argon2 hashing
- Minimum 8 characters
- Uppercase letter
- Lowercase letter
- Number
- Special character

Passwords are validated before hashing.

---

# 5. Refresh Token Security

Refresh Tokens follow these rules:

- hashed before storage;
- rotated after every use;
- invalidated on logout;
- invalidated after password reset;
- invalidated after account deletion.

Plain Refresh Tokens are never stored in the database.

---

# 6. Authorization

Authorization is role-based.

Supported roles:

- User
- Admin

Protected endpoints verify both:

- authentication;
- authorization.

Role requirements are declared on routes with the `@Roles()` decorator and enforced by `RolesGuard`. Administrator-only routes use the composite `@AdminOnly()` decorator, which bundles the role requirement with the guards that enforce it. There is no role hierarchy — a role requirement matches exactly, and routes open to any authenticated user require authentication alone.

The role used for authorization is loaded from the database on every request, never taken from the token claim, so role changes take effect immediately.

---

# 7. Route Protection

Protected routes use authentication guards.

Examples:

- JWT Guard
- Admin Guard

Unauthorized requests return:

```http
401 Unauthorized
```

Forbidden requests return:

```http
403 Forbidden
```

---

# 8. Input Validation

All incoming requests are validated.

Validation includes:

- required fields;
- data types;
- string length;
- enum validation;
- UUID validation;
- business rules.

Invalid requests never reach business logic.

---

# 9. SQL Injection Protection

Database access is performed exclusively through Prisma ORM.

Raw SQL queries should be avoided.

Parameterized queries are used whenever raw SQL is required.

---

# 10. XSS Protection

The backend returns JSON responses only.

User-generated content should be sanitized when appropriate.

The frontend is responsible for safe rendering.

---

# 11. CSRF

The platform uses the Authorization header strategy: Access Tokens are attached to each request via `Authorization: Bearer <access_token>`, as documented throughout the API specification. Tokens are not transmitted via cookies.

Because the browser never automatically attaches the Access Token to a request, traditional CSRF attacks — which rely on the browser's automatic cookie inclusion — do not apply to this authentication strategy.

The Access Token must not be persisted in a location that would defeat this protection (see the Frontend State Management documentation). The authentication strategy must remain consistent across the application.

---

# 12. Rate Limiting

Implemented with `@nestjs/throttler`, registered as a global guard so a new
controller is protected by default rather than by remembering to add one.

## Who a request counts against

The library counts by client address, and on its own that is wrong for this
product. A school class on one Wi-Fi, or everyone behind one mobile carrier's
NAT, shares a public address: thirty-five students sitting a mock exam in one
room would share one allowance, and the limiter would reject someone's saved
answer mid-paper. So every request is counted twice
(`src/common/throttle/request-trackers.ts`):

| Limit | Counted per | Allowance | Purpose |
| --- | --- | --- | --- |
| `default` | person — the user behind a **verified** bearer token, else the address | `THROTTLE_LIMIT` per `THROTTLE_TTL` s, 120 / minute by default | Stop one client's scripted abuse without one busy classmate spending the room's allowance |
| `address` | client address | 600 / minute | A ceiling for everything from one network, sized for a class of about 35 |

The token is verified, not decoded. An unverified `sub` would let a script
claim a different user on every request and never be counted twice; a missing,
forged or expired token falls back to the address.

## Tighter per-route limits

Routes that guard a credential or spend money carry tighter limits, declared
with `@Throttle` in `auth.controller.ts`:

| Route | Limit | Why |
| --- | --- | --- |
| `POST /auth/login` | 10 / minute per account, 100 / minute per address | Guessing one account's password is stopped wherever it comes from; a class logging in at once is not stopped as one |
| `POST /auth/register` | 40 / hour per address | Bulk account creation, sized so a class of 35 can sign up from one room |
| `POST /auth/verify-email` | 40 / hour per address | Token guessing, sized for the same class confirming its email |
| `POST /auth/reset-password` | 40 / hour per address | Token guessing |
| `POST /auth/resend-verification` | 3 / hour per email address, 20 / hour per network address | Each request sends mail: one inbox cannot be flooded, and provider quota and the sending domain's reputation are protected |
| `POST /auth/forgot-password` | as above | As above |

Registration and token submission are counted by address explicitly, not by
person: otherwise any valid bearer token would buy a fresh allowance per
account.

`GET /health` is exempt via `@SkipThrottle({ default: true, address: true })`.
A bare `@SkipThrottle()` skips only `default`. The hosting platform polls the
endpoint on a fixed schedule, and a 429 would read as an unhealthy instance.

## What the tests hold

Covered by `test/throttling.e2e-spec.ts`:

- **The allowance is not spent by the limiter.** The first ten login attempts
  must reach the handler and fail on credentials, not on 429.
- **Two people on one address are counted separately**, and a forged token
  earns no allowance of its own.
- **A locked account does not lock out the room:** after ten failed logins on
  one account, the next account from the same address still reaches the
  handler.
- **A class can register:** forty registrations from one address pass the
  limiter before the forty-first is refused.
- **The rejection is Ukrainian and says nothing quantitative.** The library's
  default message is `ThrottlerException: Too Many Requests`, which the
  frontend would render verbatim; saying how many attempts remain would tell
  an attacker their budget.
- **The health check is never throttled.**

Rate limiting is disabled when `NODE_ENV=test`, because 500-odd e2e requests
from one address would trip it for reasons unrelated to what they assert. The
throttling spec sets `THROTTLE_ENABLED=true` to switch it back on for itself.
An empty `THROTTLE_ENABLED` counts as unset rather than as `false`, so a key
left blank in a copied `.env` cannot silently disable it in production.

---

# 13. Sensitive Data

Sensitive information includes:

- passwords;
- refresh tokens;
- email verification tokens;
- password reset tokens.

Sensitive values must never appear in:

- logs;
- API responses;
- error messages.

---

# 14. Logging

Security logs should include:

- login attempts;
- failed authentication;
- permission violations;
- unexpected errors.

Passwords, tokens, and personal data must never be logged.

---

# 15. Error Responses

Error responses should not expose internal implementation details.

Clients receive generic error messages.

Stack traces remain server-side.

---

# 16. Database Security

Database access follows these rules:

- least privilege;
- parameterized queries;
- migrations only;
- transaction support.

Application credentials should have only the permissions required.

---

# 17. Environment Variables

Sensitive configuration is stored in environment variables.

Examples:

- JWT secrets
- Database URL
- Email credentials
- API keys

Secrets must never be committed to version control.

---

# 18. HTTPS

Production deployments require HTTPS.

All authentication traffic must be encrypted.

Unencrypted HTTP should redirect to HTTPS.

---

# 19. Security Headers

Recommended HTTP headers include:

- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Strict-Transport-Security

Headers should be configured globally.

---

# 20. Dependency Security

Dependencies should be:

- regularly updated;
- monitored for vulnerabilities;
- locked using a package lock file.

Unused dependencies should be removed.

---

# 21. Backups

The production database should support:

- automated backups;
- recovery testing;
- secure storage.

Backups containing user data must remain encrypted.

---

# 22. Future Improvements

Possible future enhancements include:

- Two-Factor Authentication
- Device Management
- Security Dashboard
- Login Notifications
- IP Reputation
- WebAuthn
- Security Audit Logs

These features are outside the MVP.

---

# 23. Success Criteria

The backend security architecture is considered successful if it:

- protects user accounts;
- prevents unauthorized access;
- secures sensitive data;
- follows modern security practices;
- remains maintainable as the platform grows.