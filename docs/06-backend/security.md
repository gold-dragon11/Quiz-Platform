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

Sensitive endpoints should be rate-limited.

Examples:

- Login
- Register
- Forgot Password
- Reset Password
- Refresh Token

Rate limiting protects against brute-force attacks.

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