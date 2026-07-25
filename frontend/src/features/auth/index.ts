import { lazy } from 'react';

/**
 * Public API of the auth feature (Phase 6.1 constraint 2 — features expose
 * only their barrel). The router consumes these; internal files
 * (components, hooks, api, validation, pages) are never imported from outside.
 *
 * Each screen is code-split via React.lazy (decision F10): importing this
 * barrel costs only the lazy wrappers, and each page's code loads on first
 * navigation, resolving under RootLayout's Suspense boundary.
 */
export const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
export const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
export const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
export const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
export const VerifyEmailPage = lazy(() =>
  import('./pages/VerifyEmailPage').then((m) => ({
    default: m.VerifyEmailPage,
  })),
);
