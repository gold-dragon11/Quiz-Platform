# Design System — Typography

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the typography system used throughout the Quiz Platform.

Typography establishes visual hierarchy, improves readability, and creates a consistent reading experience across the application.

The typography system prioritizes clarity over decoration.

---

# 2. Design Philosophy

Typography should feel:

- modern;
- clean;
- highly readable;
- professional;
- minimal.

The interface should encourage focus on learning rather than visual styling.

---

# 3. Font Family

Primary font:

```text
Inter
```

Fallback fonts:

```text
system-ui,
-apple-system,
BlinkMacSystemFont,
Segoe UI,
sans-serif
```

The same font family should be used throughout the application.

---

# 4. Type Scale

| Style | Size | Weight | Line Height |
|--------|-----:|-------:|------------:|
| Display | 48 px | 700 | 56 px |
| H1 | 36 px | 700 | 44 px |
| H2 | 30 px | 700 | 38 px |
| H3 | 24 px | 600 | 32 px |
| H4 | 20 px | 600 | 28 px |
| H5 | 18 px | 600 | 26 px |
| Body Large | 18 px | 400 | 28 px |
| Body | 16 px | 400 | 24 px |
| Body Small | 14 px | 400 | 20 px |
| Caption | 12 px | 500 | 16 px |

The type scale should remain consistent across all screens.

---

# 5. Font Weights

Supported font weights:

| Weight | Usage |
|---------|------|
| 400 | Body text |
| 500 | Labels |
| 600 | Section headings |
| 700 | Main headings |

Avoid unnecessary font weight variations.

---

# 6. Heading Usage

Headings establish content hierarchy.

Examples:

Display

Landing pages.

H1

Primary page title.

H2

Major sections.

H3

Cards and subsections.

H4–H5

Small content groups.

Heading levels should always follow semantic order.

---

# 7. Body Text

Body text should prioritize readability.

Recommended style:

- 16 px
- Weight 400
- Line Height 24 px

Long paragraphs should remain easy to scan.

---

# 8. Labels

Labels are used for:

- forms;
- buttons;
- navigation;
- filters.

Recommended style:

- 14 px
- Weight 500

Labels should remain concise.

---

# 9. Captions

Captions are used for:

- metadata;
- timestamps;
- helper text;
- secondary information.

Recommended style:

- 12 px
- Weight 500

Captions should never compete with primary content.

---

# 10. Alignment

Preferred alignment:

Left aligned.

Center alignment may be used for:

- onboarding;
- empty states;
- authentication screens.

Justified text should be avoided.

---

# 11. Line Length

Recommended maximum line length:

60–80 characters.

Long text blocks should remain comfortable to read.

---

# 12. Text Hierarchy

Hierarchy should be created using:

- size;
- weight;
- spacing.

Avoid relying solely on color.

---

# 13. Accessibility

Typography should support accessibility.

Requirements:

- sufficient font size;
- appropriate line height;
- strong color contrast;
- scalable text.

Text should remain readable at browser zoom levels.

---

# 14. Responsive Typography

Typography should scale across devices.

Desktop

Full type scale.

Tablet

Slightly reduced headings.

Mobile

Compact headings while maintaining readability.

Body text should remain at least 16 px whenever possible.

---

# 15. Future Expansion

The typography system should support future additions including:

- learning materials;
- documentation pages;
- AI-generated content;
- mobile applications.

New screens should reuse the existing typography scale.

---

# 16. Success Criteria

The typography system is considered successful if it:

- provides clear visual hierarchy;
- maintains excellent readability;
- remains consistent across the application;
- supports accessibility;
- scales with future product growth.