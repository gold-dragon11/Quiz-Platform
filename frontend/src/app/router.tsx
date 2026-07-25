import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '@/shared/layouts/RootLayout';
import { PublicLayout } from '@/shared/layouts/PublicLayout';
import { MainLayout } from '@/shared/layouts/MainLayout';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import { RequireAuth } from '@/shared/guards/RequireAuth';
import { RequireGuest } from '@/shared/guards/RequireGuest';
import { RequireAdmin } from '@/shared/guards/RequireAdmin';
import { PageTransition } from '@/shared/components/PageTransition';
import { RouteError } from '@/shared/components/RouteError';
import { ROUTES } from '@/shared/constants/routes';

/**
 * Full route tree per docs/05-frontend/routing.md, assembled in Phase 6.1.
 *
 * Structure (decisions F4/F10/F14):
 * - a single `RootLayout` owns scroll restoration and the lazy-route Suspense
 *   boundary, and its `errorElement` (RouteError) is the routing error layer;
 * - route groups are gated by guards — RequireGuest (auth-only pages),
 *   RequireAuth (member area), RequireAdmin (admin area);
 * - pages are code-split with React.lazy. Leaves still render the shared
 *   PlaceholderPage — real feature pages replace it one phase at a time and
 *   follow the same lazy pattern, without touching this file's shape.
 */
const PlaceholderPage = lazy(() =>
  import('@/pages/PlaceholderPage').then((m) => ({ default: m.PlaceholderPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/not-found/NotFoundPage').then((m) => ({
    default: m.NotFoundPage,
  })),
);

function withTransition(title: string): React.JSX.Element {
  return (
    <PageTransition>
      <PlaceholderPage title={title} />
    </PageTransition>
  );
}

const notFoundElement = (
  <PageTransition>
    <NotFoundPage />
  </PageTransition>
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      // Public routes
      {
        element: <PublicLayout />,
        children: [
          { path: ROUTES.home, element: withTransition('Home') },
          { path: ROUTES.verifyEmail, element: withTransition('Verify Email') },
          { path: ROUTES.publicProfile, element: withTransition('Public Profile') },

          // Guest-only routes (redirect authenticated users away)
          {
            element: <RequireGuest />,
            children: [
              { path: ROUTES.login, element: withTransition('Login') },
              { path: ROUTES.register, element: withTransition('Register') },
              {
                path: ROUTES.forgotPassword,
                element: withTransition('Forgot Password'),
              },
              {
                path: ROUTES.resetPassword,
                element: withTransition('Reset Password'),
              },
            ],
          },

          { path: ROUTES.notFound, element: notFoundElement },
          // Catch-all for any unmatched path
          { path: '*', element: notFoundElement },
        ],
      },

      // Authenticated routes
      {
        element: <RequireAuth />,
        children: [
          {
            element: <MainLayout />,
            children: [
              { path: ROUTES.dashboard, element: withTransition('Dashboard') },
              { path: ROUTES.quiz, element: withTransition('Quiz Selection') },
              {
                path: ROUTES.quizSession,
                element: withTransition('Active Quiz Session'),
              },
              {
                path: ROUTES.quizResult,
                element: withTransition('Quiz Results'),
              },
              { path: ROUTES.statistics, element: withTransition('Statistics') },
              { path: ROUTES.profile, element: withTransition('Profile') },
              { path: ROUTES.settings, element: withTransition('Settings') },
            ],
          },
        ],
      },

      // Administrator routes
      {
        element: <RequireAdmin />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: ROUTES.admin, element: withTransition('Admin Dashboard') },
              {
                path: ROUTES.adminSubjects,
                element: withTransition('Subject Management'),
              },
              {
                path: ROUTES.adminTopics,
                element: withTransition('Topic Management'),
              },
              {
                path: ROUTES.adminQuizzes,
                element: withTransition('Quiz Template Management'),
              },
              {
                path: ROUTES.adminQuestions,
                element: withTransition('Question Management'),
              },
              {
                path: ROUTES.adminQuestionNew,
                element: withTransition('Create Question'),
              },
              {
                path: ROUTES.adminQuestionEdit,
                element: withTransition('Edit Question'),
              },
            ],
          },
        ],
      },
    ],
  },
]);
