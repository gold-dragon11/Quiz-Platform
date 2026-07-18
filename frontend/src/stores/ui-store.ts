import { create } from 'zustand';

/**
 * Global UI state — temporary interface state only, per
 * docs/05-frontend/state-management.md ("Client State"). Feature-specific
 * stores (auth, theme, notifications, etc.) are added alongside their
 * features.
 */
interface UiState {
  isMobileNavOpen: boolean;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isMobileNavOpen: false,
  toggleMobileNav: () => set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
}));
