# Answer Option

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Answer Option entity represents a possible answer for a question.

Each question contains one or more answer options.

The Answer Option is a reusable domain entity that supports multiple question types.

---

# 2. Responsibilities

The Answer Option is responsible for:

- storing answer content;
- identifying the correct answer;
- defining answer order;
- supporting future question types.

The entity contains no scoring logic.

---

# 3. Relationships

An Answer Option:

- belongs to exactly one Question;
- may be selected during a Quiz Session;
- may participate in Matching questions.

Relationship summary:

Question (1)
↓

Answer Option (2..N)

---

# 4. Attributes

| Field | Type | Required | Description |
|---------|----------|----------|------------------------------|
| id | UUID | Yes | Unique identifier |
| questionId | UUID | Yes | Parent question |
| content | Text | Yes | Answer text (default locale, English) |
| imageUrl | String | No | Optional image |
| isCorrect | Boolean | Yes | Correct answer flag |
| order | Integer | Yes | Display order |
| createdAt | DateTime | Yes | Creation timestamp |
| updatedAt | DateTime | Yes | Last update timestamp |

---

# 5. Business Rules

An Answer Option:

- must belong to exactly one Question;
- cannot exist independently;
- cannot have empty content;
- must preserve its display order;
- may include text and/or an image.

---

# 6. Validation Rules

The system validates:

- content is not empty;
- display order is unique within the question;
- question exists;
- image format is supported.

---

# 7. Supported Content

MVP supports:

- plain text;
- LaTeX mathematical expressions;
- images.

Future versions may support:

- audio;
- video;
- rich text;
- interactive content.

---

# 8. Single Choice Questions

For Single Choice questions:

- exactly one Answer Option has isCorrect = true;
- all remaining options have isCorrect = false.

---

# 9. Matching Questions

For Matching questions:

each Answer Option represents one matching element.

The matching relationship is defined by the Question configuration.

Future implementations may use dedicated matching entities if additional flexibility is required.

---

# 10. Ordering

Answer Options contain an explicit display order.

The stored order determines the default presentation.

The quiz engine may randomize the presentation order without modifying stored data.

---

# 11. Images

An Answer Option may reference an image.

Supported formats:

- PNG
- JPG
- WEBP

Images are optional.

---

# 12. Localization

Answer content should support multiple languages.

Each localized version represents the same logical answer.

Translated values are stored in a dedicated AnswerOptionTranslation record per Answer Option per locale (see the Database documentation). The `content` field on the Answer Option itself holds the default-locale (English) value, used as a fallback whenever a translation is missing.

Translations should remain synchronized.

---

# 13. Future Improvements

Possible future enhancements include:

- Rich text formatting
- Markdown support
- Audio answers
- Video answers
- Mathematical editors
- Code snippets
- Interactive answer widgets

---

# 14. Constraints

The Answer Option entity must:

- always reference an existing Question;
- remain immutable during an active Quiz Session;
- never store user selections.

User answers belong to the QuestionAttempt entity.

---

# 15. Non-Functional Requirements

The entity should:

- remain lightweight;
- support efficient querying;
- scale to millions of records;
- remain independent of presentation logic.

---

# 16. Success Criteria

The Answer Option entity is considered successful if it:

- supports all MVP question types;
- validates answer integrity;
- remains reusable;
- supports localization;
- can be extended without breaking existing data.