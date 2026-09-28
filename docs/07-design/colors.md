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

Two themes ship:

- Dark Theme — the default, and the platform's own look.
- Light Theme — a deliberate choice, offered in Settings → Вигляд alongside
  «як у системі», which follows `prefers-color-scheme`.

The landing page is pinned to dark whatever the preference: its backdrop and
curves are a drawing made for a dark page, not an interface.

All components must rely on color tokens instead of hardcoded values. Both
themes define the same token names, so no component knows which is active —
the theme is a `data-theme` attribute on `<html>` and nothing else.

The preference lives in `localStorage` (`quix.theme`) and never reaches the
server: the same account on a phone in daylight and a laptop at night wants
different answers, and one account-wide setting would be wrong on one of them.

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

# 14. Light Theme

The light palette mirrors the intent of the dark one rather than inverting its
values. Two tokens deliberately change direction:

- `surface-elevated` is a step *lighter* than the page in dark and a step
  *darker* than the card in light, because what it marks is a progress track, a
  hovered row, a skeleton, a neutral chip — things that must sit back from the
  white card they lie on. Panels that genuinely float use `surface-overlay`,
  which stays white.
- `primary-hover` and `primary-active` go deeper rather than lighter: on a
  white page a pressed button darkens, it does not glow.

| Token | Dark | Light | Contrast on `surface` |
|---|---|---|---|
| `background` | `#0b0a0f` | `#f7f6f9` | — |
| `surface` | `#131219` | `#ffffff` | — |
| `surface-elevated` | `#1b1a23` | `#eeecf2` | — |
| `surface-overlay` | `#1b1a23` | `#ffffff` | — |
| `border` | `#272631` | `#e3e0ea` | — |
| `border-subtle` | `#34333f` | `#d3cfdd` | — |
| `text-primary` | `#f7f7fa` | `#1a1823` | 17.5 |
| `text-secondary` | `#c3c2cf` | `#4b4857` | 8.9 |
| `text-muted` | `#8b8a9b` | `#6b6878` | 5.4 |
| `primary` | `#7c3aed` | `#6d28d9` | 7.1 |
| `primary-hover` | `#8b5cf6` | `#5b21b6` | — |
| `primary-active` | `#6d28d9` | `#4c1d95` | — |
| `success` | `#22c55e` | `#15803d` | 5.0 |
| `warning` | `#f59e0b` | `#b45309` | 5.0 |
| `error` | `#ef4444` | `#c81e1e` | 5.7 |
| `info` | `#3b82f6` | `#1d4ed8` | 6.7 |

The semantic colors are darkened because they are used as text: `#22c55e` on
white is 2.3:1 and `#f59e0b` is 2.2:1, neither of which is readable. White text
on each of these fills clears 5.0:1, so the filled buttons and chips hold up too.

Possible future additions: AMOLED, seasonal and high-contrast themes. These are
outside the MVP.

---

# 15. Success Criteria

The color system is considered successful if it:

- provides visual consistency;
- reinforces information hierarchy;
- maintains excellent readability;
- supports accessibility;
- creates a premium user experience.    