# Design System — Colors

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the color system used throughout the Quiz Platform.

The design language follows a calm, premium dark interface inspired by Apple and Linear.

Colors are implemented as design tokens to ensure consistency across the application.

---

# 2. Design Principles

The color system should be:

- minimal;
- elegant;
- accessible;
- consistent;
- distraction-free.

Color should communicate hierarchy and meaning rather than decoration.

---

# 3. Theme Strategy

The MVP supports:

- Dark Theme

Light Theme may be introduced in the future.

All components must rely on color tokens instead of hardcoded values.

---

# 4. Primary Palette

## Primary

Used for:

- primary buttons;
- active states;
- links;
- progress indicators.

```text
#7C3AED
```

---

## Primary Hover

```text
#8B5CF6
```

---

## Primary Active

```text
#6D28D9
```

---

# 5. Background Colors

## Background

Main application background.

```text
#0F1117
```

---

## Surface

Cards and containers.

```text
#181C24
```

---

## Elevated Surface

Modals and overlays.

```text
#20242D
```

---

# 6. Border Colors

Standard border:

```text
#2A2F3A
```

Subtle border:

```text
#323847
```

Borders should remain visually lightweight.

---

# 7. Text Colors

## Primary Text

```text
#F8FAFC
```

Used for headings and important content.

---

## Secondary Text

```text
#CBD5E1
```

Used for descriptions and supporting information.

---

## Muted Text

```text
#94A3B8
```

Used for metadata and helper text.

---

# 8. Semantic Colors

## Success

```text
#22C55E
```

Used for:

- correct answers;
- successful actions;
- confirmations.

---

## Warning

```text
#F59E0B
```

Used for:

- warnings;
- pending states.

---

## Error

```text
#EF4444
```

Used for:

- validation errors;
- failed operations;
- destructive actions.

---

## Info

```text
#3B82F6
```

Used for informational messages.

---

# 9. Quiz Colors

Correct Answer

```text
#22C55E
```

Incorrect Answer

```text
#EF4444
```

Selected Answer

```text
#7C3AED
```

Unanswered Question

```text
#64748B
```

Quiz feedback should remain clear and accessible.

---

# 10. XP and Progress

XP Color

```text
#A855F7
```

Level Progress

```text
#7C3AED
```

Progress colors should remain consistent across all screens.

---

# 11. Charts

Charts should use a restrained palette.

Recommended order:

```text
Primary Purple

Blue

Green

Amber

Red

Slate
```

Colors should remain distinguishable in dark mode.

---

# 12. States

Hover

Slightly brighter than the base color.

Active

Slightly darker than the base color.

Disabled

Reduced opacity.

Focus

Visible outline using the primary color.

---

# 13. Accessibility

All text and interactive elements should meet WCAG AA contrast requirements.

Color must never be the only indicator of state.

Icons or labels should accompany important color changes.

---

# 14. Future Themes

Possible future additions include:

- Light Theme
- AMOLED Theme
- Seasonal Themes
- High Contrast Theme

These themes are outside the MVP.

---

# 15. Success Criteria

The color system is considered successful if it:

- provides visual consistency;
- reinforces information hierarchy;
- maintains excellent readability;
- supports accessibility;
- creates a premium user experience.    