# Localization

**Document Version:** 2.0  
**Status:** Current  
**Last Updated:** August 2026

---

# 1. Purpose

This document describes how language works in L&S.

Version 1.0 of this document specified a fully bilingual product: an English
and Ukrainian interface, a switcher, and educational content mirrored across
both. That is no longer what the product does, and the difference is
deliberate rather than unfinished work. This version records what was built,
what was removed, and what remains available if the decision is revisited.

See ADR-014 in `docs/08-development/adr.md` for the decision itself.

---

# 2. Current Behaviour

**The interface is Ukrainian. There is no language selection anywhere in the
product.**

Concretely:

- Every user-facing string is written in Ukrainian directly in the component
  that renders it. There is no translation layer and no message catalogue.
- API responses — error messages, validation failures, business rule
  rejections — are Ukrainian.
- There is no language switcher, and Settings offers no language option.
- Registration does not ask for a preferred language.
- The product name **L&S** is the single exception: it is a mark, not text,
  and is never translated.

---

# 3. Educational Content

Content language follows the subject, not the user.

| Subject | Content language |
| --- | --- |
| Математика | Ukrainian |
| Історія України | Ukrainian |
| Українська мова | Ukrainian |
| English Language | English |

The English Language subject is written in English because the subject *is*
English — its questions test English, so presenting them in Ukrainian would
defeat the exercise. Its titles, options and reading passages are English;
the interface around them stays Ukrainian.

This is the rule for future subjects: a subject about a language is written in
that language, everything else is Ukrainian.

---

# 4. Why the Bilingual Interface Was Removed

The audience is Ukrainian students preparing for the НМТ/ЗНО. None of them
needs an English interface, and the second language was carrying real cost:

- every new string had to be written twice, and the second one was never
  reviewed by anyone who would notice it was wrong;
- subject and topic names existed only in Ukrainian regardless of the
  interface language, so an English interface was never actually coherent —
  it was Ukrainian content inside English chrome;
- the switcher was a visible control that changed less than it appeared to,
  which is worse than not offering it.

Removing it made the product smaller and more honest. It did not make it
harder to add languages later, for the reason in the next section.

---

# 5. What Remains in the Backend

The database and API still carry a complete translation mechanism, unused:

- `SubjectTranslation`, `TopicTranslation`, `QuestionTranslation` and
  `AnswerOptionTranslation` tables exist, with the repository-level merge that
  overlays a translation onto its base row;
- public and statistics endpoints still accept a `locale` query parameter;
- `UserSettings.language` still exists, and `GET`/`PATCH /users/me/settings`
  still read and write it.

**All four translation tables are empty.** Every request therefore resolves to
the base row, which holds the Ukrainian text.

This is kept rather than deleted because it is the expensive half of
localization and it already works and is tested. Adding a language later means
populating translations and building an interface layer — not redesigning the
schema.

Two consequences worth knowing before touching it:

- `UserSettings.language` defaults to `UKRAINIAN` and registration stores
  Ukrainian when no preference is sent. An unsupported `locale` value falls
  back to this stored preference, so it resolves to Ukrainian.
- `DEFAULT_LOCALE` in `subjects.service.ts` is `ENGLISH`, describing the base
  row as the English one. The base rows in fact hold Ukrainian. Nothing
  observable depends on this today — both paths reach the same row — but the
  constant is misleading and should be corrected before translations are
  populated.

---

# 6. Formatting

Dates and numbers are rendered with Ukrainian conventions. No formatting
depends on a user preference, because there is no preference to depend on.

---

# 7. If the Decision Is Revisited

Adding an interface language would need, in order:

1. an interface translation layer and message catalogue — this was deleted and
   would be rebuilt;
2. rows in the four translation tables for every subject, topic, question and
   answer option to be offered;
3. correcting `DEFAULT_LOCALE` as described in §5;
4. a language control in Settings, and a preference field at registration;
5. layout review — Ukrainian strings are typically longer than English, so the
   current layouts have slack in one direction only.

Steps 2 and 3 are already supported by the backend. Steps 1, 4 and 5 are the
real work.

---

# 8. Success Criteria

Current behaviour is correct when:

- no English text appears in the interface, other than the L&S mark and the
  English Language subject's own content;
- API error messages reaching the user are Ukrainian;
- no control anywhere offers a language choice;
- content language is determined by the subject alone.
