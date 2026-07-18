# Design System — Motion

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the motion language used throughout the Quiz Platform.

Motion enhances usability by providing visual feedback, improving navigation, and reinforcing user interactions.

Animations should always support the learning experience rather than distract from it.

---

# 2. Motion Philosophy

The motion system is inspired by:

- Apple
- Linear

Animations should feel:

- smooth;
- subtle;
- responsive;
- intentional;
- lightweight.

Motion is a functional design tool, not decoration.

---

# 3. Core Principles

Every animation should:

- communicate change;
- improve orientation;
- reinforce interaction;
- remain unobtrusive;
- complete quickly.

Animations should never delay user workflows.

---

# 4. Motion Categories

The application uses the following motion categories:

- Page Transitions
- Component Transitions
- Hover Effects
- Press Feedback
- Loading States
- Notifications
- Modal Animations
- List Animations

Each category has a consistent behavior.

---

# 5. Duration Guidelines

Recommended durations:

| Animation | Duration |
|------------|----------|
| Hover | 150 ms |
| Button Press | 100 ms |
| Component Transition | 200 ms |
| Modal | 250 ms |
| Page Transition | 300 ms |
| Toast Notification | 250 ms |

Animations should complete quickly to maintain responsiveness.

---

# 6. Easing

Recommended easing:

```text
ease-out
```

Used for:

- entering elements;
- opening dialogs;
- page transitions.

---

```text
ease-in-out
```

Used for:

- hover states;
- layout changes;
- subtle transitions.

Abrupt linear animations should be avoided.

---

# 7. Page Transitions

Page transitions should:

- fade content;
- slightly shift position;
- preserve user orientation.

Navigation should feel continuous.

---

# 8. Hover Effects

Interactive elements should provide subtle hover feedback.

Examples include:

- slight brightness change;
- soft elevation;
- gentle scaling (maximum 1.02x).

Hover effects should remain understated.

---

# 9. Button Interactions

Buttons should provide immediate feedback.

Supported states:

- Hover
- Press
- Focus
- Disabled
- Loading

Pressed buttons may scale slightly to indicate interaction.

---

# 10. Loading States

Loading should be communicated using:

- Skeleton Loaders
- Progress Indicators
- Spinners (only when appropriate)

Avoid unnecessary loading animations for very short operations.

---

# 11. Modal Animations

Modals should:

- fade in;
- scale slightly from 98% to 100%;
- fade out smoothly.

Background overlays should animate simultaneously.

---

# 12. Notifications

Toast notifications should:

- slide upward;
- fade into view;
- dismiss automatically.

Notifications should never block user interaction.

---

# 13. List Animations

Lists may animate when:

- items are added;
- items are removed;
- order changes.

Animations should preserve spatial orientation.

---

# 14. Quiz Experience

Quiz interactions should feel immediate.

Examples include:

- answer selection;
- progress updates;
- result presentation.

Animations should reinforce user confidence without slowing the workflow.

---

# 15. Reduced Motion

The application should respect the user's operating system preference for reduced motion.

When reduced motion is enabled:

- complex animations should be removed;
- transitions should become minimal;
- essential visual feedback should remain.

Accessibility takes priority over aesthetics.

---

# 16. Performance

Animations should:

- maintain 60 FPS where possible;
- avoid layout thrashing;
- prefer GPU-accelerated properties such as:

  - opacity;
  - transform.

Avoid animating layout properties unnecessarily.

---

# 17. Future Motion

Future enhancements may include:

- achievement animations;
- AI assistant interactions;
- richer onboarding sequences;
- celebratory milestone effects.

These animations should remain consistent with the existing motion language.

---

# 18. Success Criteria

The motion system is considered successful if it:

- improves usability;
- reinforces interaction;
- remains subtle and unobtrusive;
- supports accessibility;
- contributes to a premium user experience.