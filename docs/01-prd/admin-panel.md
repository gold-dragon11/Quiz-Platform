# Admin Panel

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

The Admin Panel is an internal content management system (CMS) used to manage all educational content and platform configuration.

It allows administrators to maintain the quiz database without modifying the application's source code.

The Admin Panel is accessible only to authorized users with administrative privileges.

---

# 2. Goals

The Admin Panel should allow administrators to:

- manage subjects;
- manage topics;
- manage questions;
- manage quizzes;
- upload images;
- review content;
- import and export data;
- maintain content quality.

The interface should prioritize efficiency and consistency over visual effects.

---

# 3. Access Control

Only users with the **Administrator** role may access the Admin Panel.

Non-administrative users must never be able to view or access administrative pages.

Unauthorized requests must return an appropriate error response.

---

# 4. Dashboard

The dashboard provides a high-level overview of the platform.

Displayed information includes:

- Total Subjects
- Total Topics
- Total Questions
- Total Quizzes
- Registered Users
- Completed Quiz Sessions
- Average Accuracy
- Total XP Awarded

The dashboard serves as a quick summary rather than a detailed analytics page.

---

# 5. Subject Management

Administrators can:

- create a subject;
- edit a subject;
- delete a subject;
- enable or disable a subject.

Each subject includes:

- Name
- Description
- Icon (optional)
- Color (optional)
- Status

Deleting a subject should require confirmation.

A subject with existing questions should not be permanently deleted unless explicitly confirmed.

---

# 6. Topic Management

Each topic belongs to exactly one subject.

Administrators can:

- create topics;
- rename topics;
- change subject assignment;
- archive topics;
- delete topics.

Topics should support future expansion without database changes.

---

# 7. Question Management

Question management is the primary responsibility of the Admin Panel.

Administrators can:

- create questions;
- edit questions;
- duplicate questions;
- archive questions;
- delete questions.

Each question includes:

- Subject
- Topic
- Question Text
- Question Type
- Difficulty
- Image (optional)
- Explanation (future)
- Status

Supported question types (MVP):

- Single Choice
- Matching

Future question types should be supported by the architecture.

---

# 8. Answer Management

Each question contains one or more answer options.

Administrators can:

- add answers;
- edit answers;
- reorder answers;
- delete answers;
- define the correct answer.

Validation rules:

- At least two answer options are required.
- Exactly one correct answer is required for Single Choice questions.
- Matching questions must contain valid matching pairs.

---

# 9. Quiz Management

Administrators can create reusable quiz templates.

Quiz configuration includes:

- Name
- Subject
- Number of Questions
- Random Question Generation
- Timer Availability
- Visibility

The system generates quiz sessions dynamically using the configured question pool.

---

# 10. Image Management

Administrators can upload images used in questions.

Supported formats:

- PNG
- JPG
- WEBP

Images should be optimized before storage.

Unused images should be removable.

---

# 11. Import & Export

The platform supports JSON import and export.

Supported operations:

- Import Subjects
- Import Topics
- Import Questions
- Export Questions
- Backup Question Bank

Imported files must be validated before processing.

Invalid records should generate detailed error reports.

---

# 12. Search & Filtering

Administrators should be able to search and filter content by:

- Subject
- Topic
- Difficulty
- Question Type
- Status
- Keywords

Filtering should remain fast even with large question banks.

---

# 13. Validation

Before saving any content, the system validates:

- required fields;
- duplicate records;
- question structure;
- answer consistency;
- image references.

Invalid content must never be published.

---

# 14. Audit Trail (Future)

Future versions may record administrative actions.

Examples:

- Question Created
- Question Edited
- Subject Deleted
- Import Completed

The audit log helps track content changes over time.

---

# 15. Future Improvements

Possible future enhancements include:

- Bulk editing
- Version history
- Draft mode
- Question approval workflow
- Rich text editor
- Markdown support
- LaTeX preview
- AI-assisted question generation
- AI-assisted proofreading

---

# 16. Non-Functional Requirements

The Admin Panel should:

- remain responsive with large datasets;
- support keyboard navigation where practical;
- minimize the number of clicks required for common actions;
- provide clear validation feedback;
- prevent accidental destructive actions.

---

# 17. Success Criteria

The Admin Panel is considered successful if an administrator can:

- manage all educational content without writing code;
- add new subjects and topics independently;
- maintain a large question bank efficiently;
- import and export content safely;
- keep the platform updated through a simple and intuitive interface.