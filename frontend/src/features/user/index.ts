import { lazy } from 'react';

/**
 * Public API of the user account feature (Phase 6.1 constraint 2 — features
 * expose only their barrel). The router consumes these; internal files are
 * never imported from outside the feature.
 *
 * Both screens are code-split via React.lazy (decision F10) and resolve under
 * RootLayout's Suspense boundary.
 */
export const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
export const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
