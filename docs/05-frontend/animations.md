# Frontend Animations

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026

---

# 1. Purpose

This document defines the animation system used throughout the Quiz Platform.

Animations should improve usability, reinforce user feedback, and create a polished learning experience without distracting from the educational content.

The platform follows a calm, minimal, and professional motion language inspired by Apple and Linear.

---

# 2. Design Principles

Animations should be:

- smooth;
- subtle;
- purposeful;
- consistent;
- fast.

Every animation must communicate state changes or improve usability.

Decorative animations should be avoided.

---

# 3. Animation Library

The frontend uses:

- Framer Motion

Animations should rely on Framer Motion whenever possible.

Custom CSS animations should be limited to simple utility effects.

---

# 4. Motion Philosophy

Animations should make the interface feel:

- responsive;
- intelligent;
- lightweight;
- modern;
- premium.

Motion should never slow down the learning process.

---

# 5. Timing

Animation durations follow the canonical Duration Guidelines defined in `07-design/motion.md`. This document does not redefine those values — it maps frontend interactions onto them:

| Interaction | Duration | Motion.md Category |
|--------------|----------|---------------------|
| Hover | 150 ms | Hover |
| Button Press | 100 ms | Button Press |
| Fade | 200 ms | Component Transition |
| Card Appearance | 200 ms | Component Transition |
| Modal Open | 250 ms | Modal |
| Modal Close | 250 ms | Modal |
| Page Transition | 300 ms | Page Transition |

Animations should feel immediate.

---

# 6. Easing

Preferred easing functions:

- easeOut
- easeInOut

Animations should avoid aggressive bouncing.

Elastic animations are not part of the design language.

---

# 7. Page Transitions

Page transitions should include:

- fade;
- slight vertical movement;
- opacity transition.

Transitions should remain subtle.

Large sliding animations should be avoided.

---

# 8. Buttons

Buttons should animate on:

Hover

- slight scale increase;
- elevation increase.

Pressed

- slight scale decrease.

Disabled buttons should not animate.

---

# 9. Cards

Cards should animate when:

- entering the viewport;
- appearing after loading;
- changing state.

Recommended effects:

- fade;
- slight upward movement.

---

# 10. Modals

Opening:

- fade in;
- scale from 98% to 100%.

Closing:

- fade out;
- slight scale reduction.

Background overlay should fade independently.

---

# 11. Lists

Lists should appear using staggered animations.

Cards should not appear simultaneously.

The stagger interval should remain subtle.

---

# 12. Quiz Experience

Quiz interactions should feel immediate.

Examples:

Selecting an answer:

- smooth selection highlight;
- gentle background transition.

Submitting an answer:

- loading feedback;
- button state transition.

Question transition:

- fade;
- horizontal slide (optional).

---

# 13. Dashboard

Dashboard components should animate independently.

Examples:

- statistics cards;
- XP progress;
- charts;
- recent activity.

Content should progressively appear after loading.

---

# 14. Loading States

Loading indicators should use:

- skeleton loaders;
- fade transitions;
- shimmer effects (optional).

Traditional spinning loaders should be minimized.

---

# 15. Notifications

Notifications should:

- slide gently into view;
- fade in;
- automatically disappear.

Animations should remain unobtrusive.

---

# 16. Microinteractions

Examples include:

- toggle switches;
- dropdown menus;
- avatar hover;
- progress bar updates;
- XP gain animation.

Microinteractions should reinforce user actions.

---

# 17. Accessibility

Animations must respect user preferences.

Users who enable reduced motion should receive:

- reduced transitions;
- disabled non-essential animations.

Accessibility always has priority.

---

# 18. Performance

Animations should:

- maintain 60 FPS;
- avoid layout shifts;
- use GPU-accelerated properties when possible;
- minimize unnecessary re-renders.

Animation performance should remain smooth on mid-range devices.

---

# 19. Future Improvements

Possible future enhancements include:

- Achievement celebrations
- Advanced XP animations
- Seasonal visual themes
- Interactive onboarding
- Adaptive motion preferences

These features are outside the MVP.

---

# 20. Success Criteria

The animation system is considered successful if it:

- improves perceived responsiveness;
- reinforces user interactions;
- maintains a calm visual language;
- remains performant;
- contributes to a premium user experience.