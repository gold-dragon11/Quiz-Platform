# Backend Validation

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the validation strategy for the Quiz Platform backend.

Validation ensures that all incoming data is correct, complete, and safe before entering the business layer.

The backend treats every client request as untrusted input.

---

# 2. Validation Principles

The validation system follows these principles:

- Validate early
- Fail fast
- Never trust client input
- Keep validation predictable
- Separate structural validation from business validation

Validation should stop invalid requests before they reach business logic.

---

# 3. Validation Layers

Validation is performed in multiple layers.

```text
HTTP Request

↓

DTO Validation

↓

Controller

↓

Service Validation

↓

Repository
```

Each layer validates different concerns.

---

# 4. DTO Validation

DTO validation is responsible for validating request structure.

Examples include:

- required fields;
- data types;
- string length;
- email format;
- UUID format;
- enum values;
- numeric ranges.

DTO validation should not contain business rules.

---

# 5. Business Validation

Business validation is performed inside services.

Examples include:

- user already exists;
- email already verified;
- quiz already completed;
- question belongs to quiz;
- subject exists;
- topic belongs to subject.

Business validation depends on application state.

---

# 6. Validation Library

The backend uses:

- class-validator
- class-transformer

Validation decorators should be applied to DTO classes.

---

# 7. Global Validation Pipe

NestJS ValidationPipe should be configured globally.

Recommended options include:

- whitelist
- forbidNonWhitelisted
- transform

Unexpected properties should be rejected automatically.

---

# 8. Input Sanitization

Incoming data should be normalized before business processing.

Examples:

- trim strings;
- normalize email addresses;
- remove unnecessary whitespace;
- convert numeric values where appropriate.

Sanitization should not change user intent.

---

# 9. UUID Validation

All entity identifiers must use UUID validation.

Examples:

- userId;
- quizId;
- questionId;
- topicId;
- subjectId.

Invalid identifiers should immediately return a validation error.

---

# 10. Enum Validation

Enumerated values should be validated.

Examples include:

- user role;
- language;
- theme;
- question type;
- quiz status.

Only supported values are accepted.

---

# 11. Password Validation

Passwords must satisfy the platform policy.

Requirements:

- minimum length;
- uppercase letter;
- lowercase letter;
- number;
- special character.

Passwords are validated before hashing.

---

# 12. File Validation

Future file uploads should validate:

- file type;
- file size;
- allowed MIME types.

Unsupported files must be rejected.

---

# 13. API Error Responses

Validation failures return:

```http
400 Bad Request
```

Responses should include:

- error code;
- validation message;
- invalid field.

Clients should receive actionable feedback.

---

# 14. Error Messages

Validation messages should:

- be consistent;
- avoid technical details;
- clearly identify invalid fields.

Internal implementation details should never be exposed.

---

# 15. Performance

Validation should:

- execute before business logic;
- minimize unnecessary database queries;
- reject invalid requests as early as possible.

Expensive validation should occur only when required.

---

# 16. Security

Validation contributes to application security by helping prevent:

- malformed requests;
- injection attacks;
- invalid identifiers;
- unexpected payloads;
- oversized input.

Validation complements, but does not replace, authorization and authentication.

---

# 17. Future Improvements

Possible future enhancements include:

- custom validation decorators;
- reusable validation rules;
- localized validation messages;
- schema versioning;
- advanced file validation.

These features are outside the MVP.

---

# 18. Success Criteria

The validation architecture is considered successful if it:

- rejects invalid requests early;
- separates structural and business validation;
- provides consistent error responses;
- improves application security;
- remains easy to extend.