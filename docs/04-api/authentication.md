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
- role — `USER` or `TEACHER`, a student's account when omitted (decisions 17 and 18 in docs/00-overview/teacher-side-decisions.md: anyone may teach, and the two are separate account types). `ADMIN` is rejected with `400`; afterwards only an administrator can change the role

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

Request body:

```json
{ "token": "..." }
```

The token is delivered to the user as a verification link pointing at the frontend's `/verify-email` route; the frontend submits it to this endpoint.

Successful verification activates the account: `emailVerified` becomes true and the account status changes from Pending Verification to Active. The reader is signed in as part of the same request — the response has the same shape as Sign In (Access Token, Refresh Token) rather than an empty body, so the frontend can apply the session immediately instead of sending the reader to the login form. This is not a new trust boundary: the verification token is already a single-use, short-lived proof of control over the mailbox, the same standard the password reset flow relies on.

Every failure — an invalid, expired, malformed, or wrong-purpose token, or an account that is not awaiting verification — returns the same generic response:

```http
400 Bad Request — "Invalid or expired verification token."
```

No failure mode is distinguishable from another, so the endpoint reveals nothing about accounts or tokens.

---

## Resend Verification Email

```http
POST /api/v1/auth/resend-verification
```

Sends a new verification email.

Request body:

```json
{ "email": "..." }
```

Always responds `202 Accepted` with an empty body — whether the email is unknown, already verified, or pending — so the endpoint cannot be used to discover which addresses are registered. An email is actually sent only for existing accounts still awaiting verification.

Previously issued verification tokens remain valid until they expire; every valid token performs the same single action on the same account.

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

- Access Token, in the response body
- Refresh Token, as the `quix_rt` cookie (§6.1)

The response body contains the access token only. Details of the authenticated
user are retrieved separately through `GET /api/v1/auth/me`.

Login succeeds only for Active accounts:

| Account Status | Response |
|---|---|
| Active | 200 with an access token and a session cookie |
| Pending Verification | 403 Email not verified |
| Suspended | 403 Account suspended |
| Deleted | 401 Unauthorized, identical to invalid credentials |

An unknown email and an incorrect password return exactly the same 401 response, so neither reveals whether an account exists. Deleted accounts are treated the same way and never reveal that they once existed.

## 6.1 The session cookie

The refresh token never appears in a response body and is never handled by the
client's JavaScript. It is set as a cookie:

```http
Set-Cookie: quix_rt=<token>; HttpOnly; Secure; SameSite=Lax;
            Path=/api/v1/auth; Expires=<token exp>
```

- **`HttpOnly`** — the page cannot read it, so a cross-site scripting flaw
  cannot steal it. An access token is worth fifteen minutes and lives in a
  tab's memory; a refresh token is worth a week, and that difference is what
  this attribute pays for. It is also what makes a session that survives the
  browser being closed defensible at all (decision 36).
- **`SameSite=Lax`** — the entire CSRF defence for these routes, and enough
  because the site and the API share a registrable domain: `learn-ls.com` and
  `api.learn-ls.com` are the same site, so the browser sends the cookie on our
  own requests and withholds it from a POST made by anyone else's page. The
  access token that refresh answers with is unreadable cross-origin in any
  case, so a forged call would gain nothing. No separate CSRF token is used.
- **No `Domain`** — the cookie is host-only. It is set by the API and sent
  back to the API, and a browser attaches a cookie by where the request is
  going rather than by which page made it, so the site renews the session
  without the cookie ever being shared with another subdomain.
  `SESSION_COOKIE_DOMAIN` can widen it and is expected to stay unset.
- **`Path`** — narrowed to the auth routes: the cookie has no business
  travelling with every request for a question.
- **`Expires`** — the token's own `exp` claim, so the cookie, the JWT and the
  session row cannot disagree about when the session ends.

Because rotation issues a fresh seven-day token on every refresh, a reader who
opens the app at least once a week is never asked to sign in again.

Clients must send credentials on these requests (`withCredentials`, or
`credentials: 'include'`); without it the browser attaches no cookie, whatever
the cookie itself says.

---

# 7. Logout

## Sign Out

```http
POST /api/v1/auth/logout
```

Invalidates the current session and removes its cookie.

No request body. The session cookie is the credential — no access token is
required, so logout works even after the access token has expired.

Logout is idempotent and responds `204 No Content` whether the session was
active, already revoked, unknown, malformed, or absent entirely. It therefore
cannot be used to probe whether a session is valid. The response clears the
cookie in every one of those cases, so a reader holding something stale leaves
without it.

Access tokens expire naturally.

---

# 8. Refresh Token

## Refresh Session

```http
POST /api/v1/auth/refresh
```

Exchanges the session cookie for a new access token and a rotated cookie.

The user does not need to log in again.

No request body: the cookie is the whole request. A token supplied in the body
is ignored, and a request arriving without the cookie is answered `401` — which
is how a client asks, on startup, whether anyone is signed in at all, since it
cannot read the cookie to find out.

Returns a new Access Token in the body and a new Refresh Token in the cookie.
Refresh Token Rotation is enabled: the presented token is invalidated the moment
it is used, and the browser replaces the cookie from the response.

A client must serialise its refreshes across tabs. Two tabs presenting the same
cookie at once look exactly like a replay, and the reader is logged out
everywhere — see reuse detection below.

Refresh succeeds only when the presented token:

- carries a valid signature and has not expired;
- matches a stored, unrevoked session record;
- belongs to an account that is still Active.

Every failure returns the same `401 Unauthorized`.

**Reuse detection:** presenting a refresh token that has already been rotated or logged out is treated as evidence of token theft — all of that user's active sessions are revoked, and the request is rejected with 401.

---

# 9. Forgot Password

## Request Password Reset

```http
POST /api/v1/auth/forgot-password
```

Sends a password reset email.

Request body:

```json
{ "email": "..." }
```

Always responds `202 Accepted` with an empty body.

For security reasons, the response is always identical regardless of whether the email exists — and regardless of the account's status. A reset email is actually sent only for Active accounts; pending, suspended, deleted, and unknown addresses receive the same 202 and no email.

The reset link points at the frontend's `/reset-password` route.

---

# 10. Reset Password

## Create New Password

```http
POST /api/v1/auth/reset-password
```

Allows the user to set a new password using a valid reset token.

Request body:

```json
{ "token": "...", "newPassword": "..." }
```

The new password must satisfy exactly the registration password policy, enforced with the same rules and error messages.

On success the endpoint responds `200` with an empty body, and every refresh-token session the user holds is revoked — previously issued access tokens expire naturally, and no new tokens are issued by this endpoint. The user logs in again with the new password.

Reset tokens are single-use: the moment a reset succeeds, the presented token and every other outstanding reset token for that account become invalid.

Every token-related failure — invalid, expired, malformed, wrong-purpose, replayed, unknown user, or an account that is not Active — returns the same generic response:

```http
400 Bad Request — "Invalid or expired reset token."
```

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

The response is the authenticated user's session summary — the account together with the records it owns that the interface needs in order to render:

| Section | Fields |
|---|---|
| Account | id, email, role, accountStatus, emailVerified, isDemo, createdAt |
| Profile | username, displayName, bio |
| Avatar | type, imageUrl |
| Settings | language, theme, publicProfileEnabled, assignmentEmailsEnabled, shareSelfStudyWithTutors |

Learning progress is **not** included. Level, XP, and other metrics are retrieved from the Statistics API.

This endpoint differs from `GET /api/v1/users/me`, which returns account fields only and is used for account management rather than for establishing a session.

The user is always loaded from the database; token claims are never used as the source of profile data.

Responses:

| Condition | Response |
|---|---|
| Valid token, Active account | 200 with the session summary |
| Missing, malformed, or expired token | 401 Unauthorized |
| Account no longer Active (Pending Verification, Suspended, or Deleted) | 401 Unauthorized |
| User record no longer exists | 401 Unauthorized |

Account status is re-checked on every authenticated request, so access is revoked as soon as an account stops being Active — even while a previously issued access token is still within its lifetime. All of these failures return the same 401, so none reveals whether an account exists or why it was rejected.

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